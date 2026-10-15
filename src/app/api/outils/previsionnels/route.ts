import {
  MAX_PREVISIONNELS,
  ecritureAutorisee,
  lireEntree,
  repondre,
  sessionUtilisateur,
} from '@/lib/outils/previsionnels'

// Liste (GET) et création (POST) des prévisionnels « Maison de santé » de l'utilisateur connecté.
// 401 sans session : l'outil s'en sert pour savoir si le visiteur est connecté.

export async function GET() {
  const { supabase, user } = await sessionUtilisateur()
  if (!user) return repondre({ error: 'non_connecte' }, 401)

  const { data, error } = await supabase
    .from('previsionnels_msp')
    .select('id, nom, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  if (error) return repondre({ error: 'lecture_impossible' }, 500)

  return repondre({ items: data, max: MAX_PREVISIONNELS })
}

export async function POST(request: Request) {
  if (!ecritureAutorisee(request)) return repondre({ error: 'requete_refusee' }, 403)
  const { supabase, user } = await sessionUtilisateur()
  if (!user) return repondre({ error: 'non_connecte' }, 401)

  const entree = lireEntree(await request.json().catch(() => null))
  if (!entree) return repondre({ error: 'donnees_invalides' }, 400)

  const { count } = await supabase
    .from('previsionnels_msp')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if ((count ?? 0) >= MAX_PREVISIONNELS) return repondre({ error: 'limite_atteinte' }, 409)

  const { data, error } = await supabase
    .from('previsionnels_msp')
    .insert({ nom: entree.nom, donnees: entree.donnees })
    .select('id, nom, updated_at')
    .single()
  if (error) {
    // Plafond tenu aussi par le déclencheur de la base (deux enregistrements simultanés).
    if (error.message.includes('limite_previsionnels')) return repondre({ error: 'limite_atteinte' }, 409)
    return repondre({ error: 'enregistrement_impossible' }, 500)
  }

  return repondre({ item: data }, 201)
}
