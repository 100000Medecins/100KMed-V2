import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Editeur } from '@/types/models'
import { getNotesGlobalesRedac, getNotesUtilisateursGlobales, getNbNotesUtilisateurs } from '@/lib/db/solutions'

/**
 * Slugifie un nom d'éditeur (cohérent avec la migration SQL 2026-05-29).
 * Translit accents, garde alphanum + tirets, en minuscules.
 */
function slugifyNom(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

/**
 * Génère un slug unique pour un nouvel éditeur en suffixant -2, -3, etc. en cas de collision.
 */
export async function generateUniqueEditeurSlug(nom: string): Promise<string> {
  const supabase = createServiceRoleClient()
  const base = slugifyNom(nom)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('editeurs')
    .select('slug')
    .like('slug', `${base}%`)
  const existing = new Set<string>((data ?? []).map((r: { slug: string }) => r.slug))
  if (!existing.has(base)) return base
  let i = 2
  while (existing.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

/**
 * Récupère tous les éditeurs.
 * Remplace : fetchEditeurs
 */
export async function getEditeurs() {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('editeurs')
    .select('*')
    .order('nom', { ascending: true })

  if (error) throw error
  return data as Editeur[]
}

/**
 * Récupère un éditeur par son ID, avec ses solutions.
 * Remplace : fetchEditeurById, fetchEditeurByIdSolution
 */
export async function getEditeurById(id: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('editeurs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Editeur
}

/**
 * Récupère un éditeur (par slug) avec toutes ses solutions.
 * Utilise le service role car la page éditeur est publique + ISR :
 * createServerClient lit cookies() ce qui est incompatible avec revalidate sur Next 16.
 */
export async function getEditeurWithSolutions(slug: string) {
  const supabase = createServiceRoleClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editeurReq = (supabase as any).from('editeurs').select('*').eq('slug', slug).single()
  const { data: editeurData, error: editeurErr } = await editeurReq
  if (editeurErr) throw editeurErr

  // Ne lister que les solutions actives ET dont la catégorie est active.
  // INNER JOIN PostgREST via `categories!inner` pour que le filtre sur categorie.actif
  // exclue effectivement les lignes (sinon LEFT JOIN par défaut → solution gardée même si cat inactive).
  const { data: solutions, error: solErr } = await supabase
    .from('solutions')
    .select(`*, categorie:categories!inner(*)`)
    .eq('id_editeur', editeurData.id)
    .eq('actif', true)
    .eq('categorie.actif', true)
    .order('nom', { ascending: true })
  if (solErr) throw solErr

  // Enrichir avec les notes (mêmes calculs que la page comparatif catégorie)
  // pour que <SolutionList> affiche les vraies notes au lieu de "Pas encore noté".
  const solutionIds = (solutions ?? []).map((s: { id: string }) => s.id)
  const [notesRedac, notesUser, nbNotesMap] = await Promise.all([
    getNotesGlobalesRedac(solutionIds),
    getNotesUtilisateursGlobales(solutionIds),
    getNbNotesUtilisateurs(solutionIds),
  ])
  const solutionsEnrichies = (solutions ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    noteRedacBase5: notesRedac[s.id as string] ?? null,
    noteUtilisateursBase5: notesUser[s.id as string] ?? null,
    nbNotesUtilisateurs: nbNotesMap[s.id as string] ?? null,
  }))

  return {
    editeur: editeurData as Editeur,
    solutions: solutionsEnrichies,
  }
}

/**
 * Génère les paramètres statiques pour ISR.
 */
export async function getAllEditeurSlugs() {
  const supabase = await createServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('editeurs')
    .select('slug')

  if (error) throw error
  return (data as { slug: string }[]).map((e) => e.slug)
}
