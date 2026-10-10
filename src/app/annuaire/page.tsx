import { notFound } from 'next/navigation'
import { getMaFicheAnnuaire } from '@/lib/actions/annuaire'
import { createServerClient } from '@/lib/supabase/server'
import { SM_SPECIALITES } from '@/lib/constants/profil'
import { RAYON_PAR_DEFAUT_KM } from '@/lib/constants/annuaire'
import { normaliserRecherche } from '@/lib/annuaire/normaliser'
import VerificationPsc from '@/components/annuaire/VerificationPsc'
import AnnuaireRecherche from '@/components/annuaire/AnnuaireRecherche'
import EnteteAnnuaire from '@/components/annuaire/EnteteAnnuaire'

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
        <EnteteAnnuaire actif="complet" />
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
  const zone = { p_lat: point?.lat, p_lon: point?.lon, p_rayon_km: point ? RAYON_PAR_DEFAUT_KM : undefined }
  const [{ data: initiaux }, { data: totalInitial }, { data: sourceVersion }] = await Promise.all([
    supabase.rpc('annuaire_rechercher', { ...zone, p_limite: 50 }),
    supabase.rpc('annuaire_compter', zone),
    supabase.rpc('annuaire_source'),
  ])

  // Spécialités regroupées par libellé du site (ex. SM26 / SM53 / SM54 → « Médecin généraliste »),
  // comparé sans ponctuation : SM43 et SM92 (pédopsychiatrie, avant et après la réforme de 2017) ne
  // diffèrent que d'une virgule et font une seule entrée, sous le libellé du code le plus récent.
  const groupes = new Map<string, { libelle: string; codes: string[] }>()
  for (const [code, libelle] of Object.entries(SM_SPECIALITES)) {
    const cle = normaliserRecherche(libelle)
    groupes.set(cle, { libelle, codes: [...(groupes.get(cle)?.codes ?? []), code] })
  }
  const specialites = Array.from(groupes.values()).sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))

  return (
    <div>
      <EnteteAnnuaire actif="complet" />
      <p className="text-sm text-gray-500 mb-6">
        Tous les médecins de l&apos;Annuaire Santé, et les fiches complétées par les confrères sur 100 000 Médecins :
        compétences, moyen de contact préféré, portable.
      </p>
      <AnnuaireRecherche
        lecteur={fiche.userId}
        catalogue={fiche.catalogue.filter((i) => i.statut === 'valide')}
        specialites={specialites}
        communeLecteur={fiche.commune}
        resultatsInitiaux={initiaux ?? []}
        totalInitial={totalInitial ?? null}
        sourceVersion={sourceVersion ?? null}
      />
    </div>
  )
}
