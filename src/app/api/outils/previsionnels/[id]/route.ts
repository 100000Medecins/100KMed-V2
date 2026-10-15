import {
  ecritureAutorisee,
  idValide,
  lireEntree,
  origineAutorisee,
  repondre,
  sessionUtilisateur,
} from '@/lib/outils/previsionnels'

// Lecture (GET), mise à jour (PUT) et suppression (DELETE) d'un prévisionnel de l'utilisateur
// connecté. Un prévisionnel d'un autre compte est invisible (RLS) : il répond 404 comme un absent.

type Contexte = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Contexte) {
  const { id } = await params
  if (!idValide(id)) return repondre({ error: 'introuvable' }, 404)
  const { supabase, user } = await sessionUtilisateur()
  if (!user) return repondre({ error: 'non_connecte' }, 401)

  const { data, error } = await supabase
    .from('previsionnels_msp')
    .select('id, nom, donnees, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return repondre({ error: 'lecture_impossible' }, 500)
  if (!data) return repondre({ error: 'introuvable' }, 404)

  return repondre({ item: data })
}

export async function PUT(request: Request, { params }: Contexte) {
  if (!ecritureAutorisee(request)) return repondre({ error: 'requete_refusee' }, 403)
  const { id } = await params
  if (!idValide(id)) return repondre({ error: 'introuvable' }, 404)
  const { supabase, user } = await sessionUtilisateur()
  if (!user) return repondre({ error: 'non_connecte' }, 401)

  const entree = lireEntree(await request.json().catch(() => null))
  if (!entree) return repondre({ error: 'donnees_invalides' }, 400)

  const { data, error } = await supabase
    .from('previsionnels_msp')
    .update({ nom: entree.nom, donnees: entree.donnees })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, nom, updated_at')
    .maybeSingle()
  if (error) return repondre({ error: 'enregistrement_impossible' }, 500)
  if (!data) return repondre({ error: 'introuvable' }, 404)

  return repondre({ item: data })
}

export async function DELETE(request: Request, { params }: Contexte) {
  if (!origineAutorisee(request)) return repondre({ error: 'requete_refusee' }, 403)
  const { id } = await params
  if (!idValide(id)) return repondre({ error: 'introuvable' }, 404)
  const { supabase, user } = await sessionUtilisateur()
  if (!user) return repondre({ error: 'non_connecte' }, 401)

  const { data, error } = await supabase
    .from('previsionnels_msp')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
  if (error) return repondre({ error: 'suppression_impossible' }, 500)
  if (!data?.length) return repondre({ error: 'introuvable' }, 404)

  return repondre({ ok: true })
}
