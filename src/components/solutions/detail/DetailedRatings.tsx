'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import { sanitizeHtml } from '@/lib/sanitize'
import type { NoteRedac } from '@/lib/db/solutions'

interface DetailedRatingsProps {
  notesRedac: NoteRedac[]
}

export default function DetailedRatings({ notesRedac }: DetailedRatingsProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (notesRedac.length === 0) return null

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-bold text-navy">Notre avis détaillé</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {notesRedac.map((note) => {
          const hasText = !!note.avis
          const isExpanded = expanded.has(note.id)

          return (
            <div key={note.id}>
              {/* Ligne critère — cliquable si texte dispo */}
              <div
                className={`flex items-center justify-between px-6 py-4 ${
                  hasText ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                }`}
                onClick={() => hasText && toggle(note.id)}
              >
                <span className="text-sm text-gray-700 font-medium">
                  {note.label}
                </span>
                <div className="flex items-center gap-3">
                  {note.note_base5 != null && (
                    <StarRating rating={note.note_base5} size="sm" />
                  )}
                  {hasText && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(note.id)
                      }}
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-accent-blue hover:text-accent-blue transition-colors flex-shrink-0"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Masquer le détail' : 'Voir le détail'}
                    >
                      {isExpanded ? (
                        <Minus className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Zone dépliable avec animation CSS grid */}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-4">
                    <div className="bg-surface-light rounded-xl px-5 py-4">
                      <div
                        className="text-sm text-gray-600 leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(note.avis!) }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
