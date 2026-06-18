/**
 * Renseigne `categories.meta_description` pour les catégories (hors « Logiciel médical »
 * déjà curée manuellement). Textes SEO dédiés : mot-clé en tête, ~150-160 caractères.
 *
 * Ne touche QUE la colonne meta_description. BACKUP JSON dans docs/ avant toute écriture.
 *
 * Usage :
 *   npx tsx scripts/set-categories-meta-descriptions.ts            # dry-run (n'écrit rien)
 *   npx tsx scripts/set-categories-meta-descriptions.ts --execute  # écrit en base
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const EXECUTE = process.argv.includes('--execute')

// slug -> meta description (texte simple, sans HTML)
const META: Record<string, string> = {
  'agendas-medicaux':
    'Agenda médical en ligne : prise de rendez-vous, rappels et secrétariat téléphonique. Comparez les solutions et leur modèle économique, notées par les médecins.',
  'intelligence-artificielle-medecine':
    'IA scribe : génère automatiquement le compte rendu de consultation. Comparez fiabilité, hébergement des données et intégration, d’après les avis de médecins.',
  'ia-documentaires':
    'IA documentaire médicale : une question clinique, une synthèse sourcée en quelques secondes. Comparez corpus, fiabilité et mises à jour, avis de médecins.',
  'objetsconnectes':
    'Objets connectés santé : tensiomètres, ECG, glucomètres, balances. Sont-ils fiables et utiles en pratique ? Comparez les dispositifs, d’après les avis de médecins.',
  'teleconsultation':
    'Téléconsultation : plateformes, solutions intégrées à l’agenda, télécabines. Comparez celles vraiment adaptées à votre pratique, d’après les avis de médecins.',
  'teletransmission':
    'Télétransmission et feuilles de soins électroniques (FSE) : comparez les logiciels agréés SESAM-Vitale, leurs tarifs et leur ergonomie, d’après les médecins.',
  'teleexpertise':
    'Téléexpertise : demandez l’avis d’un confrère spécialiste à distance. Comparez les plateformes, leur facturation et leurs spécialités, avis de médecins.',
}

async function main() {
  const slugs = Object.keys(META)

  const { data: rows, error } = await s
    .from('categories')
    .select('id, slug, nom, meta_description')
    .in('slug', slugs)

  if (error) throw error
  if (!rows || rows.length === 0) {
    console.error('Aucune catégorie trouvée pour les slugs ciblés.')
    process.exit(1)
  }

  const found = new Set(rows.map((r) => r.slug))
  const missing = slugs.filter((sl) => !found.has(sl))
  if (missing.length) console.warn('⚠️  Slugs introuvables (ignorés) :', missing.join(', '))

  // Backup avant écriture
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.resolve(__dirname, `../docs/backup-meta-descriptions-${stamp}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2), 'utf-8')
  console.log(`📦 Backup écrit : ${path.relative(process.cwd(), backupPath)}\n`)

  console.log(EXECUTE ? '=== EXÉCUTION (écriture) ===\n' : '=== DRY-RUN (aucune écriture) ===\n')

  for (const r of rows) {
    const next = META[r.slug]
    const oldVal = r.meta_description ?? '(vide)'
    console.log(`• ${r.nom}  [${r.slug}]`)
    console.log(`   avant : ${oldVal}`)
    console.log(`   après : ${next}  (${next.length} car.)`)

    if (EXECUTE) {
      const { error: upErr } = await s
        .from('categories')
        .update({ meta_description: next })
        .eq('id', r.id)
      console.log(upErr ? `   ❌ ERREUR : ${upErr.message}` : '   ✅ écrit')
    }
    console.log('')
  }

  console.log(
    EXECUTE
      ? `Terminé : ${rows.length} catégorie(s) mise(s) à jour.`
      : `Dry-run terminé : ${rows.length} catégorie(s) seraient mises à jour. Relancer avec --execute pour écrire.`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
