import { randomBytes } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  ecritureAutorisee,
  idValide,
  origineAutorisee,
  repondre,
  sessionUtilisateur,
} from '@/lib/outils/previsionnels'

// Lien de partage en lecture seule d'un prévisionnel : créer (POST, remplace l'ancien lien) ou
// couper (DELETE). La propriété est vérifiée sous la RLS de l'utilisateur ; le code est tiré et
// écrit par le serveur (service_role) : l'utilisateur ne peut pas le choisir (pas de droit
// d'écriture sur partage_jeton).

type Contexte = { params: Promise<{ id: string }> }

async function prevPossede(id: string): Promise<{ erreur: Response; userId?: never } | { erreur?: never; userId: string }> {
  if (!idValide(id)) return { erreur: repondre({ error: 'introuvable' }, 404) }
  const { supabase, user } = await sessionUtilisateur()
  if (!user) return { erreur: repondre({ error: 'non_connecte' }, 401) }
  const { data, error } = await supabase
    .from('previsionnels_msp')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return { erreur: repondre({ error: 'lecture_impossible' }, 500) }
  if (!data) return { erreur: repondre({ error: 'introuvable' }, 404) }
  return { userId: user.id }
}

async function ecrireJeton(id: string, userId: string, jeton: string | null) {
  const { error } = await createServiceRoleClient()
    .from('previsionnels_msp')
    .update({ partage_jeton: jeton })
    .eq('id', id)
    .eq('user_id', userId)
  return error
}

export async function POST(request: Request, { params }: Contexte) {
  if (!ecritureAutorisee(request)) return repondre({ error: 'requete_refusee' }, 403)
  const { id } = await params
  const p = await prevPossede(id)
  if (p.erreur) return p.erreur

  const jeton = randomBytes(18).toString('base64url') // 24 caractères, 144 bits
  if (await ecrireJeton(id, p.userId, jeton)) return repondre({ error: 'enregistrement_impossible' }, 500)
  return repondre({ jeton })
}

export async function DELETE(request: Request, { params }: Contexte) {
  if (!origineAutorisee(request)) return repondre({ error: 'requete_refusee' }, 403)
  const { id } = await params
  const p = await prevPossede(id)
  if (p.erreur) return p.erreur

  if (await ecrireJeton(id, p.userId, null)) return repondre({ error: 'enregistrement_impossible' }, 500)
  return repondre({ ok: true })
}
