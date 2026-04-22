'use client'

import { useState } from 'react'
import { Search, Loader2, Sparkles, RefreshCw } from 'lucide-react'
import { searchEditeurInfo, type EditeurSuggestion } from '@/lib/actions/searchEditeur'
import EditeurForm from '@/components/admin/EditeurForm'
import { createEditeur } from '@/lib/actions/admin'

const inputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3'

export default function EditeurSearchPreview() {
  const [nom, setNom] = useState('')
  const [suggestion, setSuggestion] = useState<EditeurSuggestion | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!nom.trim()) return
    setSearchError(null)
    setLoading(true)
    try {
      const result = await searchEditeurInfo(nom.trim())
      if (result.error) {
        setSearchError(result.error)
      } else if (result.data) {
        setSuggestion(result.data)
        setFormKey((k) => k + 1)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setSuggestion(null)
    setFormKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <div className="bg-gradient-to-r from-accent-blue/5 to-accent-blue/10 border border-accent-blue/20 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-blue" />
          <p className="text-sm font-semibold text-navy">Remplissage automatique</p>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Entrez le nom de l'éditeur et laissez l'IA rechercher les informations disponibles sur internet.
          Vous pourrez les modifier avant de sauvegarder.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ex: Cegedim, Maincare, Mediboard..."
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading || !nom.trim()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-button font-semibold text-sm bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 transition-all flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </div>

        {searchError && (
          <p className="text-xs text-red-600 mt-2">{searchError}</p>
        )}

        {suggestion && !loading && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-accent-blue/20">
            <p className="text-xs text-accent-blue font-medium">
              ✓ Informations trouvées pour « {suggestion.nom} » — vérifiez et complétez les champs ci-dessous
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <RefreshCw className="w-3 h-3" />
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Aperçu logo si trouvé */}
      {suggestion?.logo_url && !loading && (
        <div
          className="flex items-center gap-3 px-4 py-3 bg-surface-light rounded-xl border border-gray-100"
          ref={(el) => {
            if (!el) return
            const img = el.querySelector('img')
            if (img) img.onerror = () => { el.style.display = 'none' }
          }}
        >
          <img
            src={suggestion.logo_url}
            alt={suggestion.nom}
            className="h-10 max-w-[120px] object-contain"
          />
          <p className="text-xs text-gray-500">
            Logo trouvé automatiquement — vous pouvez le remplacer dans le formulaire ci-dessous.
          </p>
        </div>
      )}

      {/* Formulaire pré-rempli */}
      <EditeurForm
        key={formKey}
        initialValues={suggestion ?? undefined}
        action={createEditeur}
      />
    </div>
  )
}
