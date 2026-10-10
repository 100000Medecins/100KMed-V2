import { notFound } from 'next/navigation'
import { getMaFicheAnnuaire } from '@/lib/actions/annuaire'
import EnteteAnnuaire from '@/components/annuaire/EnteteAnnuaire'
import MaFicheAnnuaireForm from '@/components/annuaire/MaFicheAnnuaireForm'

export const metadata = { title: 'Ma fiche annuaire' }

/** Page privée (Mon compte) : dynamique, lue avec la session du médecin. 404 tant que l'annuaire est éteint. */
export default async function MaFicheAnnuairePage() {
  const fiche = await getMaFicheAnnuaire()
  if (!fiche) notFound()
  return (
    <>
      <EnteteAnnuaire actif="fiche" />
      <MaFicheAnnuaireForm initial={fiche} />
    </>
  )
}
