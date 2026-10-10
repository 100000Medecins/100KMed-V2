import { notFound } from 'next/navigation'
import { getAnnuaireActif } from '@/lib/db/settings'
import { createServerClient } from '@/lib/supabase/server'
import VerificationPsc from '@/components/annuaire/VerificationPsc'
import FicheConfrere from '@/components/annuaire/FicheConfrere'
import EnteteAnnuaire from '@/components/annuaire/EnteteAnnuaire'

/** Fiche d'un confrère dans l'annuaire (privée, dynamique). Le portable n'est jamais dans la page. */
export default async function FicheConfrerePage({ params }: { params: Promise<{ rpps: string }> }) {
  if (!(await getAnnuaireActif())) notFound()
  const { rpps } = await params
  if (!/^[0-9]{11}$/.test(rpps)) notFound()

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data, error } = await supabase.rpc('annuaire_fiche', { p_rpps: rpps })
  if (error?.code === '42501') {
    return (
      <>
        <EnteteAnnuaire actif="complet" />
        <VerificationPsc
          userId={user.id}
          texte="L'annuaire est réservé aux médecins dont l'identité est attestée par Pro Santé Connect. Connectez-vous une fois avec votre e-CPS, puis revenez sur cette page."
        />
      </>
    )
  }
  const fiche = data?.[0]
  if (!fiche) notFound()
  return (
    <>
      <EnteteAnnuaire actif="complet" />
      <FicheConfrere fiche={fiche} />
    </>
  )
}
