'use client'

import { useRouter, usePathname } from 'next/navigation'
import type { Critere } from '@/types/models'

interface SolutionSortBarProps {
  criteresMajeurs: Critere[]
  currentTri: string
  selectedTagIds: string[]
  count: number
}

const BASE_OPTIONS = [
  { value: 'nom', label: 'Nom A→Z' },
  { value: 'note_redac', label: 'Note association' },
  { value: 'note_utilisateurs', label: 'Note utilisateurs' },
]

export default function SolutionSortBar({ criteresMajeurs, currentTri, selectedTagIds, count }: SolutionSortBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  function buildUrl(tri: string) {
    const params = new URLSearchParams()
    if (selectedTagIds.length > 0) params.set('tags', selectedTagIds.join(','))
    if (tri && tri !== 'nom') params.set('tri', tri)
    const q = params.toString()
    return q ? `${pathname}?${q}` : pathname
  }

  const allOptions = [
    ...BASE_OPTIONS,
    ...criteresMajeurs.map((c) => ({
      value: `critere_${c.id}`,
      label: c.nom_court || c.nom_capital || c.nom_long || 'Critère',
    })),
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <span className="text-sm text-gray-400 shrink-0">
        {count} solution{count > 1 ? 's' : ''}
      </span>
      <div className="flex-1 h-px bg-gray-100 hidden sm:block" />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-400 shrink-0">Trier par :</span>
        <div className="flex gap-1.5 flex-wrap">
          {allOptions.map((opt) => {
            const isActive = currentTri === opt.value || (opt.value === 'nom' && !currentTri)
            return (
              <button
                key={opt.value}
                onClick={() => router.push(buildUrl(opt.value))}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-navy text-white border-navy'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
