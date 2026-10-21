/**
 * Page /portabilite (2026-10-21) : crée la ligne `portabilite` de pages_statiques, qui porte les
 * textes libres de la page modifiables dans Admin → Pages (titre, description pour Google, et en
 * JSON dans `contenu` : pastille, introduction, phrase en gras, « Pourquoi », encadré éditeurs).
 *
 * Valeurs de départ : TEXTES_PORTABILITE_DEFAUT (src/lib/data/portabilite.ts), soit les textes
 * de la première version de la page. Sans cette ligne, la page affiche ces mêmes textes, mais
 * rien n'est modifiable dans l'admin.
 *
 * Insertion seule : ne touche à rien si la ligne existe déjà (pas de backup nécessaire).
 * Filet : dry-run par défaut, `--execute` requis.
 *
 * Usage : npx tsx scripts/portabilite-page-admin.ts            # dry-run
 *         npx tsx scripts/portabilite-page-admin.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { randomUUID } from 'crypto'
import type { Database } from '../src/types/database'
import {
  contenuPortabilite,
  SLUG_PAGE_PORTABILITE,
  TEXTES_PORTABILITE_DEFAUT,
} from '../src/lib/data/portabilite'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data: existante, error: errLecture } = await supabase
    .from('pages_statiques')
    .select('id, titre, updated_at')
    .eq('slug', SLUG_PAGE_PORTABILITE)
    .maybeSingle()
  if (errLecture) throw errLecture

  if (existante) {
    console.log(`La ligne « ${SLUG_PAGE_PORTABILITE} » existe déjà (${existante.id}, « ${existante.titre} »). Rien à faire.`)
    return
  }

  const ligne = {
    id: randomUUID(),
    slug: SLUG_PAGE_PORTABILITE,
    titre: TEXTES_PORTABILITE_DEFAUT.titre,
    meta_description: TEXTES_PORTABILITE_DEFAUT.metaDescription,
    contenu: contenuPortabilite(TEXTES_PORTABILITE_DEFAUT),
  }
  console.log('Ligne à créer :')
  console.log(JSON.stringify({ ...ligne, contenu: JSON.parse(ligne.contenu) }, null, 2))

  if (!EXECUTE) {
    console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
    return
  }

  const { error } = await supabase.from('pages_statiques').insert(ligne)
  if (error) throw error

  const { data: relue } = await supabase
    .from('pages_statiques')
    .select('id, slug, titre, contenu')
    .eq('slug', SLUG_PAGE_PORTABILITE)
    .single()
  console.log(`\nLigne créée : ${relue?.id} (/${relue?.slug}), contenu identique : ${relue?.contenu === ligne.contenu}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
