import { notFound } from 'next/navigation'
import { getMaFicheAnnuaire } from '@/lib/actions/annuaire'
import { createServerClient } from '@/lib/supabase/server'
import { SM_SPECIALITES } from '@/lib/constants/profil'
import { RAYON_PAR_DEFAUT_KM } from '@/lib/constants/annuaire'
import VerificationPsc from '@/components/annuaire/VerificationPsc'
import AnnuaireRecherche from '@/components/annuaire/AnnuaireRecherche'

/**
 * Annuaire des confrères : page privée (dynamique), réservée aux médecins qui ont une preuve
 * de connexion PSC. Les règles d'accès sont dans la base (fonctions `annuaire_*`).
 * 404 tant que l'annuaire est éteint.
 */
export default async function AnnuairePage() {
  const fiche = await getMaFicheAnnuaire()
  if (!fiche) notFound()

  if (!fiche.verifie) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-6">Annuaire des confrères</h1>
        <VerificationPsc
          userId={fiche.userId}
          texte="L'annuaire est réservé aux médecins dont l'identité est attestée par Pro Santé Connect. Connectez-vous une fois avec votre e-CPS, puis revenez sur cette page."
        />
      </div>
    )
  }

  // Premiers résultats : autour de la commune déclarée sur la fiche du lecteur, s'il en a une
  const supabase = await createServerClient()
  const point = fiche.commune
  const { data: initiaux } = await supabase.rpc('annuaire_rechercher', {
    p_lat: point?.lat,
    p_lon: point?.lon,
    p_rayon_km: point ? RAYON_PAR_DEFAUT_KM : undefined,
    p_limite: 50,
  })

  const specialites = Array.from(new Set(Object.values(SM_SPECIALITES))).sort((a, b) => a.localeCompare(b, 'fr'))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Annuaire des confrères</h1>
        <p className="text-sm text-gray-500 mt-1">
          Trouvez un confrère par son nom, sa spécialité, ses compétences ou sa commune, et voyez comment il préfère être
          contacté.
        </p>
      </div>
      <AnnuaireRecherche
        catalogue={fiche.catalogue.filter((i) => i.statut === 'valide')}
        specialites={specialites}
        communeLecteur={fiche.commune}
        resultatsInitiaux={initiaux ?? []}
      />
    </div>
  )
}
