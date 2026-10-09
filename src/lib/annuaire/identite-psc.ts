import type { createServiceRoleClient } from '@/lib/supabase/server'
import { getAnnuaireActif } from '@/lib/db/settings'

export interface InfosPsc {
  rpps: string | null
  codeProfession: string | null
  nom: string | null
  prenom: string | null
  specialiteCode: string | null
}

/**
 * Enregistre la preuve qu'un médecin s'est connecté par Pro Santé Connect avec ce RPPS
 * (`identites_psc`, clé = RPPS, jamais le `sub` PSC), avec son nom, son prénom et sa spécialité
 * tels que PSC les donne. Seul endroit du code qui écrit cette table : `users.rpps` ne prouve rien
 * à lui seul (il a longtemps été modifiable par l'utilisateur, cf. CHANGELOG 2026-10-06), et une
 * fiche annuaire ne peut exister que pour une identité présente ici (clé étrangère).
 *
 * - Connexion au site (`compte` = l'utilisateur) : la preuve est rattachée à ce compte ; si le
 *   RPPS l'était à un autre compte (fusion passée), la preuve et la fiche le suivent.
 * - Connexion de l'application (`compte` absent) : le rattachement au compte est laissé tel quel.
 *
 * N'écrit rien tant que l'annuaire est éteint. Ne bloque jamais la connexion.
 */
export async function enregistrerIdentitePsc(
  admin: ReturnType<typeof createServiceRoleClient>,
  infos: InfosPsc,
  compte?: string,
): Promise<boolean> {
  const { rpps } = infos
  if (!rpps || !/^[0-9]{11}$/.test(rpps)) return false
  try {
    if (!(await getAnnuaireActif())) return false

    // Un compte n'est rattaché qu'à un seul RPPS
    if (compte) await admin.from('identites_psc').update({ user_id: null }).eq('user_id', compte).neq('rpps', rpps)

    const { error } = await admin.from('identites_psc').upsert(
      {
        rpps,
        ...(compte ? { user_id: compte } : {}),
        code_profession: infos.codeProfession,
        nom: infos.nom,
        prenom: infos.prenom,
        specialite_code: infos.specialiteCode,
        derniere_connexion_psc: new Date().toISOString(),
      },
      { onConflict: 'rpps' },
    )
    if (error) {
      console.error('[annuaire] preuve PSC non enregistrée :', error.message)
      return false
    }
    return true
  } catch (e) {
    console.error('[annuaire] preuve PSC non enregistrée :', e)
    return false
  }
}
