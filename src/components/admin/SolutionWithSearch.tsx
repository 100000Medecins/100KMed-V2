'use client'

import { useState } from 'react'
import { Search, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { searchSolutionInfo, type SolutionSuggestion } from '@/lib/actions/searchSolution'
import SolutionDiffPanel from '@/components/admin/SolutionDiffPanel'
import SolutionForm from '@/components/admin/SolutionForm'
import type { Database } from '@/types/database'
import type { TagForSolution } from '@/lib/db/admin-solutions'

type Solution = Database['public']['Tables']['solutions']['Row'] & {
  galerie?: Array<{ id?: string; url: string; titre: string | null; ordre: number | null }>
  note_redac_base5?: number | null
  categorie_id?: string | null
  editeur_id?: string | null
  website_url?: string | null
  date_lancement?: string | null
  meta_title?: string | null
  meta_description?: string | null
  meta_canonical?: string | null
}

type Categorie = { id: string; nom: string }
type Editeur = { id: string; nom: string | null }
type NoteRedacItem = {
  id: string
  critere_id: string
  label: string
  note_redac_base5: number | null
  avis_redac: string | null
}

interface Props {
  solution: Solution
  categories: Categorie[]
  editeurs: Editeur[]
  notesRedac?: NoteRedacItem[]
  tagsForSolution?: TagForSolution[]
  solutionId?: string
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'

export default function SolutionWithSearch({
  solution, categories, editeurs, notesRedac, tagsForSolution, solutionId, action,
}: Props) {
  const editeurNom = editeurs.find((e) => e.id === solution.editeur_id)?.nom ?? null

  const [nom, setNom] = useState(solution.nom ?? '')
  const [suggestion, setSuggestion] = useState<SolutionSuggestion | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [appliedValues, setAppliedValues] = useState<Partial<SolutionSuggestion> | null>(null)

  async function handleSearch() {
    if (!nom.trim()) return
    setSearchError(null)
    setSuggestion(null)
    setLoading(true)
    try {
      const result = await searchSolutionInfo(nom.trim(), editeurNom)
      if (result.error) setSearchError(result.error)
      else if (result.data) setSuggestion(result.data)
    } finally {
      setLoading(false)
    }
  }

  function handleApply(merged: Partial<SolutionSuggestion>) {
    if (Object.keys(merged).length === 0) return
    if (!confirm('Appliquer les modifications va mettre à jour le formulaire. Vos éventuelles modifications non sauvegardées seront perdues. Continuer ?')) return
    setAppliedValues((prev) => ({ ...prev, ...merged }))
    setFormKey((k) => k + 1)
    setSuggestion(null)
  }

  function handleReset() {
    setSuggestion(null)
    setSearchError(null)
    setAppliedValues(null)
    setFormKey((k) => k + 1)
  }

  // Solution avec valeurs appliquées
  const mergedSolution: Solution = appliedValues
    ? {
        ...solution,
        description: appliedValues.description !== undefined ? appliedValues.description : solution.description,
        evaluation_redac_avis: appliedValues.avis_redac !== undefined ? appliedValues.avis_redac : solution.evaluation_redac_avis,
        website_url: appliedValues.website_url !== undefined ? appliedValues.website_url : solution.website_url,
        logo_url: appliedValues.logo_url !== undefined ? appliedValues.logo_url : solution.logo_url,
      }
    : solution

  // État courant pour le diff (après appliedValues)
  const currentState: Partial<Record<keyof SolutionSuggestion, string | null>> = {
    nom: mergedSolution.nom,
    description: mergedSolution.description,
    avis_redac: mergedSolution.evaluation_redac_avis as string | null,
    website_url: mergedSolution.website_url,
    logo_url: mergedSolution.logo_url,
  }

  return (
    <div className="space-y-6">
      {/* Barre de recherche IA */}
      <div className="bg-gradient-to-r from-accent-blue/5 to-accent-blue/10 border border-accent-blue/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-blue" />
          <p className="text-sm font-semibold text-navy">Compléter avec l'IA</p>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Recherchez des informations sur ce logiciel. Les modifications proposées seront comparées aux données existantes avant application.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Nom du logiciel..."
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

        {suggestion && !loading && (
          <SolutionDiffPanel
            existing={currentState}
            suggestion={suggestion}
            onApply={handleApply}
          />
        )}
      </div>

      {/* Formulaire */}
      <SolutionForm
        key={formKey}
        solution={mergedSolution}
        categories={categories}
        editeurs={editeurs}
        notesRedac={notesRedac}
        tagsForSolution={tagsForSolution}
        solutionId={solutionId}
        action={action}
      />
    </div>
  )
}
