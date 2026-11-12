/**
 * Remplit `evaluations_notes_figees` : pour chaque avis de l'ancien site (créé avant la mise en
 * ligne du 12/04/2026) sur une solution à note figée, la note qui compte dans cette note figée.
 * Le calcul (src/lib/evaluations/notes-figees.ts) remplace ensuite cette note par la nouvelle
 * quand le médecin re-note. Décision de David, 2026-11-12 (« option 1 »).
 *
 * Source de la note figée :
 * - avis re-noté depuis la mise en ligne dont la note a vraiment changé : notes de Firebase,
 *   tirées des sauvegardes de la correction du 28/05 (docs/backup-fix-firebase-20260528-*.json,
 *   champ `nouveaux_scores` / `nouvelle_moyenne` = valeurs Firebase / 2) ;
 * - tous les autres (jamais re-notés, ou simple confirmation « toujours d'actualité » qui ne
 *   change que la date) : leur note actuelle. Ils ne changent donc rien au calcul.
 *
 * Filet : dry-run par défaut, `--execute` requis ; refus si la table n'est pas vide ; lignes
 * écrites sauvegardées dans backups/ (la table étant vide, rien d'autre à sauvegarder).
 *
 * Usage : npx tsx scripts/remplir-notes-figees.ts            # dry-run
 *         npx tsx scripts/remplir-notes-figees.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database, Json } from '../src/types/database'
import { DATE_MISE_EN_LIGNE } from '../src/lib/evaluations/notes-figees'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const MAJEURS = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']

type Sauvegarde = { eval_id: string; nouvelle_moyenne: number; nouveaux_scores?: Record<string, unknown> }
const lire = <T>(f: string): T => JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8'))
const SOURCES: Array<{ nom: string; parId: Map<string, Sauvegarde> }> = [
  { nom: 'firebase (sauvegarde du 28/05)', parId: new Map(lire<Sauvegarde[]>('docs/backup-fix-firebase-20260528-1779920969237.json').map((x) => [x.eval_id, x])) },
  { nom: 'firebase (sauvegarde du 28/05, 1er passage)', parId: new Map(lire<Sauvegarde[]>('docs/backup-fix-firebase-20260528-1779920514392.json').map((x) => [x.eval_id, x])) },
]

const egal = (a: unknown, b: unknown) => String(a ?? '') === String(b ?? '')
const obj = (s: Json): Record<string, unknown> => (s && typeof s === 'object' && !Array.isArray(s) ? s : {})

async function main() {
  const { count: deja, error: errCompte } = await sb.from('evaluations_notes_figees').select('evaluation_id', { count: 'exact', head: true })
  if (errCompte) throw errCompte
  if (deja) throw new Error(`Refus : la table contient déjà ${deja} ligne(s).`)

  const { data: sols, error: errSols } = await sb.from('solutions').select('id, nom').eq('is_firebase_legacy', true)
  if (errSols) throw errSols
  const nomSol = new Map((sols ?? []).map((s) => [s.id, s.nom]))

  type Ev = { id: string; solution_id: string | null; scores: Json; moyenne_utilisateur: number | null; last_date_note: string | null }
  const evals: Ev[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from('evaluations')
      .select('id, solution_id, scores, moyenne_utilisateur, last_date_note')
      .in('solution_id', [...nomSol.keys()]).lt('created_at', DATE_MISE_EN_LIGNE)
      .order('id').range(de, de + 999)
    if (error) throw error
    evals.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const lignes: Database['public']['Tables']['evaluations_notes_figees']['Insert'][] = []
  const parSource: Record<string, number> = {}
  for (const e of evals) {
    let ligne: (typeof lignes)[number] = { evaluation_id: e.id, moyenne: e.moyenne_utilisateur, scores: e.scores, source: 'note actuelle (12/11/2026)' }
    if ((e.last_date_note ?? '') >= '2026-04-12') {
      for (const s of SOURCES) {
        const b = s.parId.get(e.id)
        if (!b?.nouveaux_scores) continue
        const change = !egal(b.nouvelle_moyenne, e.moyenne_utilisateur) || MAJEURS.some((k) => !egal(b.nouveaux_scores![k], obj(e.scores)[k]))
        if (change) {
          ligne = { evaluation_id: e.id, moyenne: b.nouvelle_moyenne, scores: b.nouveaux_scores as Json, source: s.nom }
          console.log(`  ${nomSol.get(e.solution_id!)} ${e.id.slice(0, 8)} re-noté le ${String(e.last_date_note).slice(0, 10)} : note figée ${b.nouvelle_moyenne} (actuelle ${e.moyenne_utilisateur}) — ${s.nom}`)
        }
        break
      }
    }
    parSource[ligne.source] = (parSource[ligne.source] ?? 0) + 1
    lignes.push(ligne)
  }
  console.log(`\nAnciens avis : ${evals.length} ; lignes à écrire par source :`, parSource)

  if (!EXECUTE) {
    console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
    return
  }

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const sauvegarde = path.join(dossier, `notes-figees-ecrites-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(sauvegarde, JSON.stringify(lignes, null, 2))
  console.log('Lignes sauvegardées :', sauvegarde)

  for (let i = 0; i < lignes.length; i += 200) {
    const { error } = await sb.from('evaluations_notes_figees').insert(lignes.slice(i, i + 200))
    if (error) throw error
  }
  const { count } = await sb.from('evaluations_notes_figees').select('evaluation_id', { count: 'exact', head: true })
  console.log(`\nLignes en base après écriture : ${count} (attendu ${lignes.length})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
