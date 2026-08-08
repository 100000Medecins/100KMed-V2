# ==============================================================================
# backup-supabase.ps1 - Sauvegarde de la base Supabase
#
# SOURCE DE VERITE : ce fichier, versionne dans le repo. Ne pas en garder de copie
# hors repo : les deux postes ont deja diverge une fois (incident juin-juillet 2026).
# La tache planifiee "Backup Supabase 100KMed" doit pointer ICI :
#   pwsh.exe -NoProfile -ExecutionPolicy Bypass -File
#     "C:\Users\david\Documents\100000Medecins_websiteV2\scripts\backup-supabase.ps1"
#
# Prerequis (variables d'environnement utilisateur, poste qui execute la tache) :
#   SUPABASE_DB_PASSWORD  mot de passe Postgres Supabase (obligatoire)
#   BACKUP_PING_SECRET    secret partage avec /api/backup-ping (optionnel mais
#                         recommande : sans lui, aucune alerte si le backup s'arrete)
# ==============================================================================

# ---------- CONFIGURATION -----------------------------------------------------

Add-Type -AssemblyName System.Web
$DB_URL = "postgresql://postgres.qnspmlskzgqrqtuvsbuo:$([System.Web.HttpUtility]::UrlEncode($env:SUPABASE_DB_PASSWORD))@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

$BACKUP_DIR = "C:\Users\david\Documents\100 000 Médecins\Site\Dump BDD"

# Dossier secondaire optionnel - laisser vide "" pour desactiver
$BACKUP_DIR_SECONDARY = ""

# Nombre de backups a conserver dans $BACKUP_DIR (rotation)
$KEEP_COUNT = 8

# Archive mensuelle : 1 dump conserve par mois, HORS rotation (profondeur longue).
# Sous-dossier de $BACKUP_DIR, donc ignore par la rotation qui n'est pas recursive.
$ARCHIVE_SUBDIR = "Archives-mensuelles"

# Supervision : URL pinguee apres chaque succes (dead man's switch cote site).
$PING_URL = "https://www.100000medecins.org/api/backup-ping"

# Chemin vers pg_dump - ajuster selon la version installee
$PG_DUMP = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"

# ---------- SCRIPT (ne pas modifier) ------------------------------------------

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$filename  = "supabase_backup_$timestamp.dump"
$logFile   = Join-Path $BACKUP_DIR "backup.log"

function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

if (-not (Test-Path $BACKUP_DIR)) { New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null }

Write-Log "=== Debut backup Supabase ==="

try {
    $outFile = Join-Path $BACKUP_DIR $filename

    & $PG_DUMP $DB_URL --schema=public -Fc -f $outFile
    if ($LASTEXITCODE -ne 0) { throw "pg_dump a echoue (exit code $LASTEXITCODE)" }

    $fileSize = (Get-Item $outFile).Length
    if ($fileSize -eq 0) { throw "Le fichier de backup est vide (0 octets) - connexion echouee ?" }

    $sizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-Log "OK - $filename ($sizeMB MB)"

    if ($BACKUP_DIR_SECONDARY -ne "") {
        if (-not (Test-Path $BACKUP_DIR_SECONDARY)) { New-Item -ItemType Directory -Path $BACKUP_DIR_SECONDARY | Out-Null }
        Copy-Item $outFile (Join-Path $BACKUP_DIR_SECONDARY $filename)
        Write-Log "Copie vers $BACKUP_DIR_SECONDARY"
    }

    # ---- Archive mensuelle (hors rotation) -----------------------------------
    # Le premier backup reussi de chaque mois est copie et n'est jamais supprime.
    # Sans ca, la rotation a 8 plafonne la profondeur a ~1 mois.
    $archiveDir = Join-Path $BACKUP_DIR $ARCHIVE_SUBDIR
    if (-not (Test-Path $archiveDir)) { New-Item -ItemType Directory -Path $archiveDir | Out-Null }
    $moisCourant = Get-Date -Format "yyyy-MM"
    $dejaArchive = Get-ChildItem -Path $archiveDir -Filter "supabase_backup_$moisCourant-*.dump" -ErrorAction SilentlyContinue
    if (-not $dejaArchive) {
        Copy-Item $outFile (Join-Path $archiveDir $filename)
        Write-Log "Archive mensuelle creee ($moisCourant) : $filename"
    }

    # ---- Rotation (non recursive : n'atteint pas $ARCHIVE_SUBDIR) ------------
    $allBackups = Get-ChildItem -Path $BACKUP_DIR -Filter "*.dump" | Sort-Object LastWriteTime
    if ($allBackups.Count -gt $KEEP_COUNT) {
        $toDelete = $allBackups | Select-Object -First ($allBackups.Count - $KEEP_COUNT)
        foreach ($f in $toDelete) {
            Remove-Item $f.FullName
            Write-Log "Supprime (rotation) : $($f.Name)"
        }
    }

    # ---- Ping de supervision -------------------------------------------------
    # Un echec de ping ne doit JAMAIS faire echouer le backup : le dump est deja
    # sur le disque. On journalise l'avertissement et on continue.
    if ([string]::IsNullOrWhiteSpace($env:BACKUP_PING_SECRET)) {
        Write-Log "AVERTISSEMENT : BACKUP_PING_SECRET absent - ping non envoye (aucune alerte ne sera possible)"
    } else {
        try {
            $payload = @{
                fichier       = $filename
                taille_octets = $fileSize
                machine       = $env:COMPUTERNAME
                effectue_le   = (Get-Date).ToString("o")
            } | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri $PING_URL -Method Post `
                -Headers @{ Authorization = "Bearer $env:BACKUP_PING_SECRET" } `
                -ContentType "application/json" -Body $payload -TimeoutSec 20 | Out-Null
            Write-Log "Ping de supervision envoye"
        } catch {
            Write-Log "AVERTISSEMENT : ping echoue ($($_.Exception.Message)) - le backup lui-meme est OK"
        }
    }

    Write-Log "=== Backup termine avec succes ==="
    exit 0

} catch {
    Write-Log "ERREUR : $_"
    Write-Log "=== Backup ECHOUE ==="
    exit 1
}
