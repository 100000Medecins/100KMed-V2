'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Square } from 'lucide-react'

interface SolutionSeoItem {
  id: string
  nom: string
  categorie: string
  meta: { title?: string; description?: string } | null
  actif: boolean | null
}

interface SeoManagerProps {
  solutions: SolutionSeoItem[]
}

type SeoState = {
  [id: string]: { title: string; description: string } | 'loading' | 'error'
}

export default function SeoManager({ solutions }: SeoManagerProps) {
  const [seoState, setSeoState] = useState<SeoState>({})
  const [isBulkRunning, setIsBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const stopRef = useRef(false)

  async function generateOne(id: string) {
    setSeoState((prev) => ({ ...prev, [id]: 'loading' }))
    try {
      const res = await fetch('/api/admin/generer-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erreur inconnue')
      setSeoState((prev) => ({ ...prev, [id]: { title: data.title, description: data.description } }))
      return true
    } catch {
      setSeoState((prev) => ({ ...prev, [id]: 'error' }))
      return false
    }
  }

  async function generateAll() {
    const missing = solutions.filter((s) => {
      const generated = seoState[s.id]
      return !s.meta?.title && !generated
    })
    if (missing.length === 0) return

    stopRef.current = false
    setIsBulkRunning(true)
    setBulkProgress({ done: 0, total: missing.length })

    for (let i = 0; i < missing.length; i++) {
      if (stopRef.current) break
      await generateOne(missing[i].id)
      setBulkProgress({ done: i + 1, total: missing.length })
      if (i < missing.length - 1 && !stopRef.current) {
        await new Promise((r) => setTimeout(r, 3000))
      }
    }

    setIsBulkRunning(false)
    setBulkProgress(null)
    stopRef.current = false
  }

  function stopAll() {
    stopRef.current = true
    setIsBulkRunning(false)
    setBulkProgress(null)
  }

  const getTitle = (sol: SolutionSeoItem) => {
    const s = seoState[sol.id]
    if (s && s !== 'loading' && s !== 'error') return s.title
    return sol.meta?.title ?? null
  }

  const getDescription = (sol: SolutionSeoItem) => {
    const s = seoState[sol.id]
    if (s && s !== 'loading' && s !== 'error') return s.description
    return sol.meta?.description ?? null
  }

  const missingCount = solutions.filter((s) => !s.meta?.title && seoState[s.id] !== 'loading' && !(seoState[s.id] && seoState[s.id] !== 'loading' && seoState[s.id] !== 'error')).length

  return (
    <div className="min-w-0">
      {/* Barre d'actions */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={generateAll}
          disabled={isBulkRunning || missingCount === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button bg-accent-blue text-white text-sm font-semibold hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isBulkRunning ? 'animate-spin' : ''}`} />
          {isBulkRunning
            ? `Génération… ${bulkProgress?.done}/${bulkProgress?.total}`
            : `Générer les ${missingCount} manquants`}
        </button>

        {isBulkRunning && (
          <button
            onClick={stopAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            Arrêter
          </button>
        )}

        {bulkProgress && (
          <div className="flex-1 max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-accent-blue transition-all duration-300 rounded-full"
              style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* En-tête */}
      <div className="bg-white rounded-t-card border-b border-gray-100 px-4 py-2.5 hidden md:flex items-center gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        <div className="w-5 shrink-0" />
        <div className="w-40 shrink-0">Solution</div>
        <div className="w-28 shrink-0 hidden lg:block">Catégorie</div>
        <div className="flex-1 min-w-0">Meta title</div>
        <div className="flex-1 min-w-0 hidden xl:block">Meta description</div>
        <div className="w-44 shrink-0">Actions</div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-b-card shadow-card divide-y divide-gray-50">
        {solutions.map((sol) => {
          const state = seoState[sol.id]
          const title = getTitle(sol)
          const desc = getDescription(sol)
          const isLoading = state === 'loading'
          const isError = state === 'error'
          const hasData = !!title
          const wasGenerated = state && state !== 'loading' && state !== 'error'

          return (
            <div key={sol.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors min-w-0">

              {/* Icône statut */}
              <div className="w-5 shrink-0">
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 text-accent-blue animate-spin" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : hasData ? (
                  <CheckCircle2 className={`w-4 h-4 ${wasGenerated ? 'text-green-500' : 'text-gray-300'}`} />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-300" />
                )}
              </div>

              {/* Nom */}
              <div className="w-40 shrink-0 min-w-0">
                <div className="font-medium text-navy text-sm truncate">{sol.nom}</div>
                {!sol.actif && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">inactif</span>
                )}
              </div>

              {/* Catégorie */}
              <div className="w-28 shrink-0 min-w-0 hidden lg:block">
                <span className="text-xs text-gray-500 truncate block">{sol.categorie}</span>
              </div>

              {/* Meta title */}
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <span className="text-xs text-gray-400 italic">Génération…</span>
                ) : isError ? (
                  <span className="text-xs text-red-400">Erreur</span>
                ) : title ? (
                  <span className={`text-xs block truncate ${wasGenerated ? 'text-green-700' : 'text-gray-700'}`} title={title}>
                    {title} <span className="text-gray-400">({title.length})</span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-300 italic">—</span>
                )}
              </div>

              {/* Meta description */}
              <div className="flex-1 min-w-0 hidden xl:block">
                {desc ? (
                  <span className={`text-xs block truncate ${wasGenerated ? 'text-green-700' : 'text-gray-500'}`} title={desc}>
                    {desc}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300 italic">—</span>
                )}
              </div>

              {/* Actions */}
              <div className="w-44 shrink-0 flex items-center gap-2">
                <button
                  onClick={() => generateOne(sol.id)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10 transition-colors disabled:opacity-30 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Regénérer
                </button>
                <Link
                  href={`/admin/solutions/${sol.id}/modifier`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-surface-light hover:text-navy transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-3 h-3" />
                  Modifier
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
