import type { createServiceRoleClient } from '@/lib/supabase/server'

type ClientAdmin = ReturnType<typeof createServiceRoleClient>

/**
 * Suppression de compte (par le médecin, `account.ts`, ou par l'admin, `admin-users.ts`) :
 * efface les données de l'annuaire du médecin, rangées par RPPS (y compris ce qu'il a saisi
 * depuis l'application). La preuve PSC partie, la fiche, le portable et les compétences cochées
 * suivent en cascade ; les propositions en attente et le journal des portables sont effacés ici.
 */
export async function effacerDonneesAnnuaire(admin: ClientAdmin, userId: string): Promise<void> {
  const { data: identite } = await admin.from('identites_psc').select('rpps').eq('user_id', userId).maybeSingle()
  if (identite) {
    const { rpps } = identite
    await admin.from('intitules').delete().eq('propose_par_rpps', rpps).eq('statut', 'propose')
    await admin.from('annuaire_affichages_portables').delete().or(`lecteur_rpps.eq.${rpps},consulte_rpps.eq.${rpps}`)
    await admin.from('identites_psc').delete().eq('rpps', rpps)
  }
  // Propositions d'avant le rangement par RPPS (transition)
  await admin.from('intitules').delete().eq('propose_par', userId).eq('statut', 'propose')
}

/**
 * Fusion de comptes (`merge.ts`), avant la suppression du compte source : la preuve PSC du
 * compte supprimé passe au compte conservé s'il n'en a pas — la fiche, rangée par RPPS, la suit.
 * Si le compte conservé a déjà sa preuve PSC, celle du compte source part avec lui.
 */
export async function transfererDonneesAnnuaire(admin: ClientAdmin, sourceId: string, cibleId: string): Promise<void> {
  const { data: identiteCible } = await admin.from('identites_psc').select('rpps').eq('user_id', cibleId).maybeSingle()
  if (!identiteCible) {
    await admin.from('identites_psc').update({ user_id: cibleId }).eq('user_id', sourceId)
  }
  // Colonne d'avant le rangement par RPPS (transition)
  await admin.from('intitules').update({ propose_par: cibleId }).eq('propose_par', sourceId).eq('statut', 'propose')
}
