import type { createServiceRoleClient } from '@/lib/supabase/server'
import { getAnnuaireActif } from '@/lib/db/settings'

/**
 * Enregistre la preuve qu'un compte s'est connecté par Pro Santé Connect avec ce RPPS
 * (`identites_psc`, clé = RPPS, jamais le `sub` PSC). Seul endroit du code qui écrit cette
 * table : `users.rpps` ne prouve rien à lui seul (il a longtemps été modifiable par
 * l'utilisateur, cf. CHANGELOG 2026-10-06), et une fiche annuaire ne peut exister que
 * pour une identité présente ici (clé étrangère).
 *
 * N'écrit rien tant que l'annuaire est éteint. Ne bloque jamais la connexion.
 */
export async function enregistrerIdentitePsc(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  rpps: string | null,
  codeProfession: string | null,
): Promise<void> {
  if (!rpps) return
  try {
    if (!(await getAnnuaireActif())) return

    // RPPS encore rattaché à un autre compte (fusion de comptes passée) : la preuve suit
    // le RPPS, et la fiche avec elle (`on update cascade`).
    await admin.from('identites_psc').update({ user_id: userId }).eq('rpps', rpps).neq('user_id', userId)

    const { error } = await admin.from('identites_psc').upsert(
      {
        user_id: userId,
        rpps,
        code_profession: codeProfession,
        derniere_connexion_psc: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) console.error('[annuaire] preuve PSC non enregistrée :', error.message)
  } catch (e) {
    console.error('[annuaire] preuve PSC non enregistrée :', e)
  }
}
