/**
 * Dépublie une vidéo : statut « publie » → « brouillon », comme l'interrupteur d'Admin → Vidéos
 * (qui la republie d'un clic). Première utilisation le 2026-10-27 : tutoriel pour patients
 * « Doctolib : prenez vos rendez-vous médicaux… » (demande de David).
 *
 * « Stories & tutos » et l'accueil se rafraîchissent toutes les heures : la vidéo disparaît dans
 * l'heure (l'interrupteur de l'admin, lui, les rafraîchit tout de suite).
 * Filet : dry-run par défaut, `--execute` requis ; ligne sauvegardée dans backups/ avant écriture.
 *
 * Usage : npx tsx scripts/depublier-video.ts <id>            # dry-run
 *         npx tsx scripts/depublier-video.ts <id> --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const ID = process.argv.slice(2).find((a) => !a.startsWith('--'))
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  if (!ID) throw new Error('Usage : npx tsx scripts/depublier-video.ts <id> [--execute]')

  const { data: video, error: errLecture } = await supabase.from('videos').select('*').eq('id', ID).maybeSingle()
  if (errLecture) throw errLecture
  if (!video) throw new Error(`Aucune vidéo ${ID}.`)
  console.log('Vidéo :', { id: video.id, titre: video.titre, statut: video.statut, url: video.url })
  if (video.statut !== 'publie') {
    console.log(`Statut « ${video.statut} » : rien à faire.`)
    return
  }
  console.log('À faire : statut « publie » → « brouillon ».')
  if (!EXECUTE) {
    console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
    return
  }

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const sauvegarde = path.join(dossier, `video-${ID}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(sauvegarde, JSON.stringify(video, null, 2))
  console.log('Sauvegarde :', sauvegarde)

  const { error } = await supabase.from('videos').update({ statut: 'brouillon' }).eq('id', ID).eq('statut', 'publie')
  if (error) throw error
  const { data: relue } = await supabase.from('videos').select('id, titre, statut').eq('id', ID).single()
  console.log('\nVidéo après écriture :', relue)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
