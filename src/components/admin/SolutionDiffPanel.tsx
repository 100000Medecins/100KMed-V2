'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { SolutionSuggestion } from '@/lib/actions/searchSolution'

type DiffField = {
  key: keyof SolutionSuggestion
  label: string
  isHtml?: boolean
  isImage?: boolean
}

const DIFF_FIELDS: DiffField[] = [
  { key: 'description', label: 'Description (courte)', isHtml: true },
  { key: 'avis_redac', label: 'Avis rédaction', isHtml: true },
  { key: 'website_url', label: 'Site web' },
  { key: 'logo_url', label: 'Logo', isImage: true },
]

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatValue(val: string | null, isHtml = false) {
  if (val === null || val === '') return null
  if (isHtml) return stripHtml(val)
  return val
}

interface Props {
  existing: Partial<Record<keyof SolutionSuggestion, string | null>>
  suggestion: SolutionSuggestion
  onApply: (merged: Partial<SolutionSuggestion>) => void
}

export default function SolutionDiffPanel({ existing, suggestion, onApply }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const diffs = DIFF_FIELDS.filter((f) => {
    const sug = suggestion[f.key]
    const cur = existing[f.key]
    return sug !== null && sug !== undefined && sug !== '' && sug !== cur
  })

  const [accepted, setAccepted] = useState<Set<keyof SolutionSuggestion>>(
    () => new Set(diffs.filter((f) => !existing[f.key]).map((f) => f.key))
  )

  function toggle(key: keyof SolutionSuggestion) {
    setAccepted((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleApply() {
    const merged: Partial<SolutionSuggestion> = {}
    for (const f of diffs) {
      if (accepted.has(f.key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(merged as any)[f.key] = suggestion[f.key]
      }
    }
    onApply(merged)
  }

  const acceptedCount = accepted.size

  if (diffs.length === 0) {
    return (
      <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-accent-blue/20">
        Aucune nouvelle information trouvée par rapport aux données existantes.
      </div>
    )
  }

  return (
    <div className="mt-4 border border-accent-blue/30 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-accent-blue/5 hover:bg-accent-blue/10 transition-colors"
      >
        <span className="text-sm font-semibold text-navy">
          {diffs.length} modification{diffs.length > 1 ? 's' : ''} proposée{diffs.length > 1 ? 's' : ''}
          {acceptedCount > 0 && (
            <span className="ml-2 text-accent-blue">({acceptedCount} sélectionnée{acceptedCount > 1 ? 's' : ''})</span>
          )}
        </span>
        {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
      </button>

      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {diffs.map((f) => {
            const cur = formatValue(existing[f.key] as string | null, f.isHtml)
            const sug = formatValue(suggestion[f.key] as string | null, f.isHtml)
            const isChecked = accepted.has(f.key)

            return (
              <div
                key={f.key}
                onClick={() => toggle(f.key)}
                className={`px-5 py-4 cursor-pointer transition-colors ${isChecked ? 'bg-green-50/50' : 'bg-white hover:bg-gray-50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{f.label}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-start">
                      <div className={`text-xs rounded-lg px-3 py-2 ${cur ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400 italic'} ${f.isHtml && cur ? 'max-h-40 overflow-y-auto' : ''}`}>
                        {cur ? (
                          f.isImage ? (
                            <img src={cur} alt="actuel" className="h-8 max-w-[100px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : cur
                        ) : '(vide)'}
                      </div>

                      <div className="flex items-center justify-center text-gray-400 text-xs font-bold self-center">→</div>

                      <div className={`text-xs rounded-lg px-3 py-2 font-medium ${isChecked ? 'bg-green-100 text-green-800' : 'bg-accent-blue/10 text-accent-blue'} ${f.isHtml && sug ? 'max-h-40 overflow-y-auto' : ''}`}>
                        {f.isImage && sug ? (
                          <img src={sug} alt="suggéré" className="h-8 max-w-[100px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : sug}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="px-5 py-4 bg-gray-50 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAccepted(new Set(diffs.map((f) => f.key)))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white transition-colors"
              >
                <Check className="w-3 h-3" />
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={() => setAccepted(new Set())}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white transition-colors"
              >
                <X className="w-3 h-3" />
                Ignorer tout
              </button>
            </div>
            <button
              type="button"
              onClick={handleApply}
              disabled={acceptedCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy-dark disabled:opacity-50 transition-colors"
            >
              <Check className="w-3 h-3" />
              Appliquer {acceptedCount > 0 ? `(${acceptedCount})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
