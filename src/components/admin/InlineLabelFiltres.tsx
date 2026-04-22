'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { updateCategorieLabelFiltres } from '@/lib/actions/admin'

interface Props {
  categorieId: string
  initialLabel: string
  count: number
}

export default function InlineLabelFiltres({ categorieId, initialLabel, count }: Props) {
  const [label, setLabel] = useState(initialLabel)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialLabel)
  const [, startTransition] = useTransition()

  function startEdit() {
    setDraft(label)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
  }

  function confirm() {
    const value = draft.trim() || 'Fonctionnalités'
    setLabel(value)
    setEditing(false)
    startTransition(async () => {
      await updateCategorieLabelFiltres(categorieId, value === 'Fonctionnalités' ? null : value)
    })
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel() }}
          placeholder="Fonctionnalités"
          className="text-lg font-bold text-navy px-2 py-1 border border-accent-blue/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
        />
        <span className="text-lg font-bold text-navy">({count})</span>
        <button type="button" onClick={confirm} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
        <button type="button" onClick={cancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
    )
  }

  return (
    <h2
      className="text-lg font-bold text-navy mb-4 cursor-pointer hover:text-accent-blue transition-colors"
      onClick={startEdit}
      title="Cliquer pour renommer"
    >
      {label} ({count})
    </h2>
  )
}
