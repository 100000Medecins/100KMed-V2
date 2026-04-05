'use client'

import { useState } from 'react'
import { Search, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { searchEditeurInfo, type EditeurSuggestion } from '@/lib/actions/searchEditeur'
import EditeurDiffPanel from '@/components/admin/EditeurDiffPanel'
import EditeurForm from '@/components/admin/EditeurForm'

interface Editeur {
  id: string
  nom: string | null
  nom_commercial: string | null
  description: string | null
  logo_url: string | null
  logo_titre: string | null
  website: string | null
  contact_email: string | null
  contact_telephone: string | null
  contact_adresse: string | null
  contact_cp: string | null
  contact_ville: string | null
  contact_pays: string | null
  nb_employes: number | null
  siret: string | null
  mot_editeur: string | null
}

interface Props {
  editeur: Editeur
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'

export default function EditeurWithSearch({ editeur, action }: Props) {
  const [nom, setNom] = useState(editeur.nom ?? '')
  const [suggestion, setSuggestion] = useState<EditeurSuggestion | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [appliedValues, setAppliedValues] = useState<Partial<EditeurSuggestion> | null>(null)

  async function handleSearch() {
    if (!nom.trim()) return
    setSearchError(null)
    setSuggestion(null)
    setLoading(true)
    try {
      const result = await searchEditeurInfo(nom.trim())
      if (result.error) setSearchError(result.error)
      else if (result.data) setSuggestion(result.data)
    } finally {
      setLoading(false)
    }
  }

  function handleApply(merged: Partial<EditeurSuggestion>) {
    if (Object.keys(merged).length === 0) return
    if (!confirm('Appliquer les modifications va mettre à jour le formulaire. Vos éventuelles modifications non sauvegardées seront perdues. Continuer ?')) return
    setAppliedValues(merged)
    setFormKey((k) => k + 1)
    setSuggestion(null)
  }

  function handleReset() {
    setSuggestion(null)
    setSearchError(null)
    setAppliedValues(null)
    setFormKey((k) => k + 1)
  }

  // Merge editeur + applied values for initialValues
  const initialValues: EditeurSuggestion | undefined = appliedValues
    ? {
        nom: editeur.nom ?? '',
        nom_commercial: appliedValues.nom_commercial !== undefined ? appliedValues.nom_commercial : editeur.nom_commercial,
        description: appliedValues.description !== undefined ? appliedValues.description : editeur.description,
        website: appliedValues.website !== undefined ? appliedValues.website : editeur.website,
        logo_url: appliedValues.logo_url !== undefined ? appliedValues.logo_url : editeur.logo_url,
        contact_email: appliedValues.contact_email !== undefined ? appliedValues.contact_email : editeur.contact_email,
        contact_telephone: appliedValues.contact_telephone !== undefined ? appliedValues.contact_telephone : editeur.contact_telephone,
        contact_adresse: appliedValues.contact_adresse !== undefined ? appliedValues.contact_adresse : editeur.contact_adresse,
        contact_cp: appliedValues.contact_cp !== undefined ? appliedValues.contact_cp : editeur.contact_cp,
        contact_ville: appliedValues.contact_ville !== undefined ? appliedValues.contact_ville : editeur.contact_ville,
        contact_pays: appliedValues.contact_pays !== undefined ? appliedValues.contact_pays : editeur.contact_pays,
        nb_employes: appliedValues.nb_employes !== undefined ? appliedValues.nb_employes : editeur.nb_employes,
        siret: appliedValues.siret !== undefined ? appliedValues.siret : editeur.siret,
        mot_editeur: null,
      }
    : undefined

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="bg-gradient-to-r from-accent-blue/5 to-accent-blue/10 border border-accent-blue/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-blue" />
          <p className="text-sm font-semibold text-navy">Compléter avec l'IA</p>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Recherchez des informations à jour sur cet éditeur. Les modifications proposées seront comparées aux données existantes avant application.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Nom de l'éditeur..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || !nom.trim()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-button font-semibold text-sm bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 transition-all flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>

        {searchError && <p className="text-xs text-red-600 mt-2">{searchError}</p>}

        {appliedValues && !suggestion && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-accent-blue/20">
            <p className="text-xs text-green-600 font-medium">✓ Modifications appliquées au formulaire ci-dessous</p>
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-3 h-3" />
              Annuler les modifications
            </button>
          </div>
        )}

        {/* Diff panel — compare contre l'état courant (editeur + valeurs déjà appliquées) */}
        {suggestion && !loading && (
          <EditeurDiffPanel
            existing={{
              nom_commercial: appliedValues?.nom_commercial !== undefined ? appliedValues.nom_commercial : editeur.nom_commercial,
              description: appliedValues?.description !== undefined ? appliedValues.description : editeur.description,
              website: appliedValues?.website !== undefined ? appliedValues.website : editeur.website,
              logo_url: appliedValues?.logo_url !== undefined ? appliedValues.logo_url : editeur.logo_url,
              contact_email: appliedValues?.contact_email !== undefined ? appliedValues.contact_email : editeur.contact_email,
              contact_telephone: appliedValues?.contact_telephone !== undefined ? appliedValues.contact_telephone : editeur.contact_telephone,
              contact_adresse: appliedValues?.contact_adresse !== undefined ? appliedValues.contact_adresse : editeur.contact_adresse,
              contact_cp: appliedValues?.contact_cp !== undefined ? appliedValues.contact_cp : editeur.contact_cp,
              contact_ville: appliedValues?.contact_ville !== undefined ? appliedValues.contact_ville : editeur.contact_ville,
              contact_pays: appliedValues?.contact_pays !== undefined ? appliedValues.contact_pays : editeur.contact_pays,
              nb_employes: appliedValues?.nb_employes !== undefined ? appliedValues.nb_employes : editeur.nb_employes,
            }}
            suggestion={suggestion}
            onApply={handleApply}
          />
        )}
      </div>

      {/* Formulaire */}
      <EditeurForm
        key={formKey}
        editeur={editeur}
        initialValues={initialValues}
        action={action}
      />
    </div>
  )
}
