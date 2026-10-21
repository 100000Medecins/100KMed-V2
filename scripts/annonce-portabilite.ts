/**
 * Bandeau d'accueil « Portabilité » (2026-10-21) : crée l'annonce qui renvoie vers /portabilite,
 * à la place de celle du jeu concours WONCA (expirée le 03/08/2026, laissée telle quelle).
 *
 * À lancer une fois la page /portabilite en production (sinon le bouton mène à une 404).
 * L'accueil se rafraîchit toutes les heures : le bandeau apparaît dans l'heure. Pour l'afficher
 * tout de suite : Admin → Annonces → l'ouvrir → « Mettre à jour ».
 *
 * Si une annonce active pointe déjà vers /portabilite, seuls ses textes (titre, texte, bouton)
 * sont remis à ceux ci-dessous ; dates, style et ordre ne bougent pas.
 * Titre court : le texte n'est visible que sur ordinateur, et sur mobile le titre partage la
 * ligne avec le bouton (5 lignes avec la première version, le 21/10).
 * Filet : dry-run par défaut, `--execute` requis.
 *
 * Usage : npx tsx scripts/annonce-portabilite.ts            # dry-run
 *         npx tsx scripts/annonce-portabilite.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { randomUUID } from 'crypto'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const maintenant = new Date().toISOString()
const ANNONCE = {
  id: randomUUID(),
  titre: 'Portabilité : 5 éditeurs s’engagent',
  contenu:
    'Export gratuit, sous 30 jours, complet et documenté : Doctolib, MadeForMed, Orisha Care, Semble et ' +
    'VIDAL Group répondent à notre appel.',
  cta_label: 'Voir la liste',
  cta_url: '/portabilite',
  variante: 'success',
  date_debut: maintenant,
  date_fin: '2026-11-18T22:59:00.000Z', // 18 novembre 2026, 23 h 59 à Paris
  actif: true,
  ordre: 1,
  updated_at: maintenant,
}

async function main() {
  const { data: existantes, error: errLecture } = await supabase
    .from('annonces')
    .select('id, titre, contenu, cta_label, actif, date_debut, date_fin')
    .eq('cta_url', ANNONCE.cta_url)
    .eq('actif', true)
  if (errLecture) throw errLecture
  if (existantes && existantes.length > 1) throw new Error(`${existantes.length} annonces actives vers /portabilite : à régler à la main.`)
  if (existantes && existantes.length === 1) {
    const avant = existantes[0]
    const textes = { titre: ANNONCE.titre, contenu: ANNONCE.contenu, cta_label: ANNONCE.cta_label }
    console.log('Annonce existante :', avant)
    console.log('Textes à mettre :', textes)
    if (!EXECUTE) {
      console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
      return
    }
    const { error } = await supabase
      .from('annonces')
      .update({ ...textes, updated_at: new Date().toISOString() })
      .eq('id', avant.id)
    if (error) throw error
    const { data: relue } = await supabase.from('annonces').select('id, titre, contenu, cta_label, date_fin').eq('id', avant.id).single()
    console.log('\nAnnonce mise à jour :', relue)
    return
  }

  console.log('Annonce à créer :')
  console.log(JSON.stringify(ANNONCE, null, 2))
  if (!EXECUTE) {
    console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
    return
  }

  const { error } = await supabase.from('annonces').insert(ANNONCE)
  if (error) throw error
  const { data: relue } = await supabase.from('annonces').select('id, titre, actif, date_debut, date_fin').eq('id', ANNONCE.id).single()
  console.log('\nAnnonce créée :', relue)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
