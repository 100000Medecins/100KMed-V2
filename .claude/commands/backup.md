Backup manuel de la base Supabase a la demande, en complement du backup automatique hebdomadaire. Usage : `/backup` ou `/backup [tag]`.

NOTE TECHNIQUE IMPORTANTE : ce fichier est volontairement ecrit SANS aucun caractere accentue dans son contenu. Toutes les lettres comme `e accent aigu` sont absentes pour eviter la corruption d'encodage qui a deja eu lieu lors d'editions precedentes. Le chemin reel sur le disque contient des accents (correct), mais on le construit dynamiquement avec `Join-Path` pour eviter de l'ecrire en dur dans ce fichier.

Le backup auto est planifie dans Windows Task Scheduler (a venir). Cette commande sert pour :
- Backups strategiques avant une operation risquee (migration, refactor BDD, etc.)
- Verification ponctuelle que le systeme de backup fonctionne
- Monitoring de l'etat du dernier backup automatique

## Etape 0 - Construction du chemin de sortie

Le dossier reel est `C:\Users\david\Documents\100 000 [accent-correct]\Site\Dump BDD\`.

Pour eviter d'ecrire l'accent en dur dans ce fichier, construis le chemin dynamiquement en PowerShell 7 :

```powershell
$documentsRoot = [System.Environment]::GetFolderPath("MyDocuments")
$dossierMetier = Get-ChildItem -LiteralPath $documentsRoot -Directory | Where-Object { $_.Name -like "100 000 M*decins" -and $_.Name -notmatch "M[A-Za-z]decins$" -and $_.Name.Length -eq 16 } | Select-Object -First 1
$BACKUP_DIR = Join-Path $dossierMetier.FullName "Site\Dump BDD"
```

Le filtre `100 000 M*decins` matche tout dossier commencant par cette pattern. Les filtres additionnels (`-notmatch` ASCII pur entre M et decins, longueur de 16 caracteres) excluent les variantes mojibake comme `100 000 MAdecins` ou `100 000 MAediecins`.

Verifie ensuite :

```powershell
if (-not $dossierMetier) {
    throw "Dossier metier introuvable dans Documents (cherche : 100 000 M...decins de 16 caracteres). Verifier l'existence du dossier."
}
if (-not (Test-Path -LiteralPath $BACKUP_DIR)) {
    throw "Sous-dossier Site\Dump BDD introuvable dans $($dossierMetier.FullName)"
}
```

Si une erreur est levee, signale-la a l'utilisateur et arrete la commande.

## Etape 1 - Verifications prealables

### 1.1 - Version PowerShell

Verifie que PowerShell 7+ est utilise. Lance :

```powershell
$PSVersionTable.PSVersion
```

Si la version majeure est inferieure a 7, arrete-toi et signale :

> WARNING : PowerShell 7 n'est pas detecte (version actuelle : X.Y). Le script de backup contient des accents qui posent probleme en PowerShell 5.1. Lance les commandes via `pwsh` au lieu de `powershell`. Si pwsh n'est pas installe : `winget install --id Microsoft.PowerShell`.

### 1.2 - Existence du script

Verifie que le script de backup existe :

```powershell
Test-Path -LiteralPath "C:\Users\david\scripts\backup-supabase\backup-supabase.ps1"
```

Si `False`, signale qu'il manque et arrete.

### 1.3 - Verification de l'integrite du script

Le script a un historique de corruption d'encodage. Avant de le lancer, verifie qu'il ne contient pas de caracteres de remplacement Unicode (U+FFFD) :

```powershell
$scriptContent = Get-Content -LiteralPath "C:\Users\david\scripts\backup-supabase\backup-supabase.ps1" -Raw -Encoding UTF8
if ($scriptContent -match '�') {
    throw "Le script contient des caracteres U+FFFD (corruption d'encodage). Il doit etre regenere avant utilisation."
}
```

Si erreur, signale et arrete : le script doit etre repare avant le prochain backup.

## Etape 2 - Etat actuel des backups (avant le nouveau backup)

Liste les fichiers `.dump` du dossier de sortie (chemin construit a l'etape 0) :

```powershell
$dumps = Get-ChildItem -LiteralPath $BACKUP_DIR -Filter "*.dump" | Sort-Object LastWriteTime -Descending
```

Presente un resume en francais :

> "Etat actuel des backups :
> - Total : N backups (X Mo au total)
> - Dernier backup : il y a Y jours / Z heures (`supabase_backup_YYYY-MM-DD_HHhMM.dump`)
> - Plus ancien : il y a A jours
> - Espace libre disque C : B Go"

### Alerte si le dernier backup est ancien

Calcule la difference entre maintenant et le dernier backup :

- **Moins de 24h** : "Backup recent : OK"
- **Entre 24h et 7 jours** : "Dernier backup il y a N jours, bientot l'heure du backup auto"
- **Plus de 7 jours** : "WARNING : dernier backup il y a plus d'une semaine. Le backup auto hebdomadaire ne semble pas tourner. Verifier Task Scheduler."

### Alerte si plus de 20 backups

Le script auto fait une rotation a 8 backups. S'il y a plus de 20 dumps, c'est qu'il y a aussi beaucoup de backups manuels accumules :

> "INFO : N backups accumules. Tu peux nettoyer manuellement les plus anciens si tu veux liberer de l'espace."

## Etape 3 - Lancer le backup

### 3.1 - Detection du tag optionnel

Si l'utilisateur a fourni un argument apres `/backup` (par exemple `/backup avant-migration-prod`), garde-le en memoire comme `$tag`. Sinon `$tag` est vide.

**Regles de validation du tag** :
- Convertir en minuscules
- Remplacer les espaces par des tirets
- Garder uniquement : lettres minuscules a-z, chiffres 0-9, tirets
- Maximum 50 caracteres

Si le tag fourni contient des caracteres non valides, signale les corrections appliquees :

> "INFO : tag normalise : 'Avant Migration!' a ete transforme en 'avant-migration'"

### 3.2 - Lancement du script existant

```powershell
& "C:\Users\david\scripts\backup-supabase\backup-supabase.ps1"
```

**NOTE TECHNIQUE** : le script actuel ne supporte pas (encore) les tags. Pour la v1 de `/backup`, si un tag est fourni, on lance le script normalement puis on **renomme** le fichier produit.

**Etapes en cas de tag** :
1. Avant de lancer le script, memorise les fichiers `.dump` existants dans `$BACKUP_DIR`
2. Lance le script
3. Identifie le nouveau fichier `.dump` (celui qui n'etait pas la avant)
4. Renomme-le avec le tag : `supabase_backup_YYYY-MM-DD_HHhMM_TAG.dump`

Capture la sortie du script et mesure la duree d'execution avec `Measure-Command`.

### 3.3 - Gestion des erreurs du script

Si le script echoue (code de sortie non nul, ou message d'erreur en sortie), affiche l'erreur en francais :

> "ERREUR : Le backup a echoue. Voici la sortie du script :
> ```
> [sortie complete]
> ```
> Verifier : connexion reseau, acces Supabase, espace disque."

Et arrete la commande. Ne continue pas avec le resume final.

## Etape 4 - Resume du nouveau backup

Affiche un resume visuel en francais :

> "Backup cree avec succes :
> - Fichier : `supabase_backup_2026-04-26_16h45.dump` (avec suffixe `_avant-migration-prod` si tag)
> - Taille : 1.16 Mo
> - Duree : 4 secondes
> - Emplacement : (afficher la valeur de $BACKUP_DIR)
> - Synchro Synology : en cours (le fichier sera replique sur le NAS automatiquement)"

## Etape 5 - Etat final des backups (apres le nouveau backup)

Re-liste les fichiers `.dump` du dossier et affiche un nouvel etat :

> "Etat apres ce backup :
> - Total : N backups (X Mo)
> - Plus recent : a l'instant
> - Coherence : OK"

## Etape 6 - Rappel monitoring backup auto

Termine par un rappel sur le backup automatique :

> "INFO : a ne pas oublier
> - Le backup auto hebdomadaire est planifie dans Task Scheduler (dimanche 3h)
> - Si le dernier backup auto date de plus de 7 jours, verifier Task Scheduler"

## Regles importantes

- **Toujours utiliser PowerShell 7** : verifier en debut de commande, refuser si PowerShell 5.1 est detecte.
- **Ne jamais ecrire de chemin contenant des accents en dur dans ce fichier** : toujours construire le chemin dynamiquement avec `Join-Path` et un filtre wildcard sur le nom de dossier.
- **Toujours utiliser `-LiteralPath`** pour les chemins resolus contenant des accents ou des espaces.
- **Verifier l'integrite du script** (absence de U+FFFD) avant chaque lancement.
- **Ne jamais afficher le mot de passe** : meme par accident dans une trace d'erreur. Si le script imprime un message contenant `postgresql://...:.*@...`, redacter avec `[REDACTED]` avant affichage.
- **Ne pas creer le dossier de sortie** s'il manque : signaler qu'il faut investiguer.
- **Ne pas lancer de rotation manuelle** : le script existant gere sa propre rotation a 8 backups, ne pas s'en meler depuis `/backup`.
- **Toujours en francais**, ton conversationnel.
- **Pas de tableaux Markdown**, listes a puces uniquement.
