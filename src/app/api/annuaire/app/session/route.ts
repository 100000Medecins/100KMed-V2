/**
 * Annuaire — ouverture de session de l'application (tranche 3).
 * POST, `Authorization: Bearer <jeton d'accès PSC>` → jeton du site (30 min).
 * Contrat : docs/2026-10-10-annuaire-tranche-3.md
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAnnuaireActif } from '@/lib/db/settings'
import { enregistrerIdentitePsc } from '@/lib/annuaire/identite-psc'
import { creerJetonApp, jetonPorteur, refus, reponse, verifierJetonPsc } from '@/lib/annuaire/app-session'
import { ANNUAIRE_VERSION_ACCORD, TEXTE_ACCORD_PORTABLE, TEXTE_ACCORD_PUBLICATION } from '@/lib/constants/annuaire'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!(await getAnnuaireActif())) return refus(404, 'annuaire_ferme', "L'annuaire n'est pas ouvert.")
  const jetonPsc = jetonPorteur(request)
  if (!jetonPsc) return refus(401, 'jeton_psc_absent', "En-tête attendu : Authorization: Bearer <jeton d'accès PSC>.")

  const verification = await verifierJetonPsc(jetonPsc)
  if (!verification.ok) return refus(verification.statut, verification.erreur, verification.detail)
  const { infos } = verification

  // Preuve PSC par RPPS (nom, prénom, spécialité à jour) ; le rattachement à un compte du site ne change pas
  if (!(await enregistrerIdentitePsc(createServiceRoleClient(), infos))) {
    return refus(500, 'identite_non_enregistree', "L'identité n'a pas pu être enregistrée. Réessayer.")
  }

  const { jeton, expireDans } = creerJetonApp(infos.rpps as string)
  return reponse({
    jeton,
    expire_dans: expireDans,
    rpps: infos.rpps,
    accord: {
      version: ANNUAIRE_VERSION_ACCORD,
      publication: TEXTE_ACCORD_PUBLICATION,
      portable: TEXTE_ACCORD_PORTABLE,
    },
  })
}
