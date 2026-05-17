'use client'

import { useEffect, useState, useTransition } from 'react'
import { Link2, Plus, Trash2, Loader2, X } from 'lucide-react'
import {
  listSolutionLiensAdmin,
  createSolutionLien,
  deleteSolutionLien,
  searchSolutionsForLien,
  type AdminSolutionLien,
} from '@/lib/actions/solution-liens'

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'interoperable', label: 'Interopérable' },
  { value: 'meme_suite', label: 'Même suite produit' },
  { value: 'embedded', label: 'Moteur intégré' },
  { value: 'partenariat', label: 'Partenariat' },
]

export default function SolutionLiensManager({ solutionId }: { solutionId: string }) {
  const [liens, setLiens] = useState<AdminSolutionLien[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [, startTransition] = useTransition()

  // Form state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; nom: string; categorie: string | null }>>([])
  const [selectedSolution, setSelectedSolution] = useState<{ id: string; nom: string; categorie: string | null } | null>(null)
  const [type, setType] = useState('interoperable')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setLiens(await listSolutionLiensAdmin(solutionId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solutionId])

  // Recherche debounced
  useEffect(() => {
    if (!adding || selectedSolution) { setSearchResults([]); return }
    const handle = setTimeout(async () => {
      if (searchTerm.trim().length < 2) { setSearchResults([]); return }
      const res = await searchSolutionsForLien(searchTerm, solutionId)
      setSearchResults(res)
    }, 250)
    return () => clearTimeout(handle)
  }, [searchTerm, adding, selectedSolution, solutionId])

  const handleAdd = async () => {
    if (!selectedSolution) { setError('Sélectionnez une solution.'); return }
    setBusy(true)
    setError(null)
    startTransition(async () => {
      const res = await createSolutionLien({
        fromSolutionId: solutionId,
        toSolutionId: selectedSolution.id,
        type,
        description: description.trim() || null,
      })
      setBusy(false)
      if ('error' in res) { setError(res.error); return }
      // Reset form
      setAdding(false)
      setSelectedSolution(null)
      setSearchTerm('')
      setDescription('')
      setType('interoperable')
      await load()
    })
  }

  const handleDelete = async (lienId: string) => {
    if (!confirm('Supprimer ce lien ?')) return
    startTransition(async () => {
      await deleteSolutionLien(lienId)
      await load()
    })
  }

  const cancelAdd = () => {
    setAdding(false)
    setSelectedSolution(null)
    setSearchTerm('')
    setDescription('')
    setError(null)
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-accent-blue" />
          <h2 className="text-sm font-semibold text-navy">Solutions liées</h2>
          {!loading && liens.length > 0 && (
            <span className="text-xs text-gray-400">({liens.length})</span>
          )}
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        )}
      </div>

      {/* Form d'ajout */}
      {adding && (
        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 space-y-3">
          {!selectedSolution ? (
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Rechercher une solution</label>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom de la solution (min. 2 caractères)"
                autoFocus
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
              {searchResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedSolution(s); setSearchResults([]) }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-navy">{s.nom}</span>
                        {s.categorie && <span className="ml-2 text-xs text-gray-400">{s.categorie}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-navy">{selectedSolution.nom}</p>
                {selectedSolution.categorie && <p className="text-xs text-gray-400">{selectedSolution.categorie}</p>}
              </div>
              <button
                type="button"
                onClick={() => setSelectedSolution(null)}
                className="text-gray-400 hover:text-gray-600"
                title="Changer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 bg-white"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Description <span className="text-gray-400 font-normal">(facultatif)</span></label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex. : Intégration native depuis 2024"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelAdd}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy || !selectedSolution}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Ajouter le lien
            </button>
          </div>
        </div>
      )}

      {/* Liste des liens existants */}
      {loading ? (
        <p className="px-6 py-6 text-sm text-gray-400">Chargement…</p>
      ) : liens.length === 0 && !adding ? (
        <p className="px-6 py-6 text-sm text-gray-400">Aucun lien pour cette solution.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {liens.map((lien) => {
            const typeLabel = TYPE_OPTIONS.find((o) => o.value === lien.type)?.label ?? lien.type
            return (
              <li key={lien.id} className="px-6 py-3 flex items-center gap-3">
                {lien.voisin.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lien.voisin.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain bg-gray-50 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{lien.voisin.nom}</p>
                  <p className="text-xs text-gray-400">
                    {lien.voisin.categorie?.nom ? <>{lien.voisin.categorie.nom} · </> : null}
                    <span className="text-accent-blue">{typeLabel}</span>
                  </p>
                  {lien.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{lien.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(lien.id)}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
