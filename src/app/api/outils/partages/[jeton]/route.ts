import { createServiceRoleClient } from '@/lib/supabase/server'
import { repondre } from '@/lib/outils/previsionnels'

// Prévisionnel partagé par lien, en lecture seule, pour qui détient le code (sans compte).
// Lecture en service_role, filtrée sur le code (144 bits, tiré par le serveur) ; ne renvoie ni
// l'identifiant du prévisionnel ni celui du propriétaire, seulement son nom affiché (accord de
// David, 2026-10-15). Jamais mis en cache : un lien coupé cesse aussitôt de fonctionner.

const JETON = /^[A-Za-z0-9_-]{24}$/

export async function GET(_request: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params
  if (!JETON.test(jeton)) return repondre({ error: 'introuvable' }, 404)

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('previsionnels_msp')
    .select('nom, donnees, updated_at, user_id')
    .eq('partage_jeton', jeton)
    .maybeSingle()
  if (error) return repondre({ error: 'lecture_impossible' }, 500)
  if (!data) return repondre({ error: 'introuvable' }, 404)

  const { data: auteur } = await admin.from('users').select('prenom, nom').eq('id', data.user_id).maybeSingle()
  const nomAuteur = [auteur?.prenom, auteur?.nom].filter(Boolean).join(' ').trim() || null

  return repondre({ item: { nom: data.nom, donnees: data.donnees, updated_at: data.updated_at, auteur: nomAuteur } })
}
