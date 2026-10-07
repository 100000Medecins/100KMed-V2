import type { createServiceRoleClient } from '@/lib/supabase/server'

type ClientAdmin = ReturnType<typeof createServiceRoleClient>

/**
 * Suppression de compte (par le médecin, `account.ts`, ou par l'admin, `admin-users.ts`) :
 * efface les données de l'annuaire du compte. Les clés étrangères en cascade sur `users`
 * le feraient aussi ; on l'écrit explicitement, comme pour les autres tables, et parce que
 * les propositions en attente ne partent pas en cascade (`propose_par` passe à NULL).
 */
export async function effacerDonneesAnnuaire(admin: ClientAdmin, userId: string): Promise<void> {
  // Propositions en attente de ce médecin (leurs coches partent en cascade)
  await admin.from('intitules').delete().eq('propose_par', userId).eq('statut', 'propose')
  // Fiche : le portable et les compétences cochées partent en cascade
  await admin.from('fiches_annuaire').delete().eq('user_id', userId)
  await admin.from('identites_psc').delete().eq('user_id', userId)
}

/**
 * Fusion de comptes (`merge.ts`), avant la suppression du compte source : la preuve PSC
 * du compte supprimé passe au compte conservé s'il n'en a pas — la fiche, le portable et
 * les compétences suivent (`on update cascade`). Ses propositions en attente aussi.
 * Si le compte conservé a déjà sa preuve PSC, celle du compte source part avec lui.
 */
export async function transfererDonneesAnnuaire(admin: ClientAdmin, sourceId: string, cibleId: string): Promise<void> {
  const { data: identiteCible } = await admin.from('identites_psc').select('user_id').eq('user_id', cibleId).maybeSingle()
  if (!identiteCible) {
    await admin.from('identites_psc').update({ user_id: cibleId }).eq('user_id', sourceId)
  }
  await admin.from('intitules').update({ propose_par: cibleId }).eq('propose_par', sourceId).eq('statut', 'propose')
}
