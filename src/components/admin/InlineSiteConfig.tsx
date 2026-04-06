'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { updateSiteConfig } from '@/lib/actions/admin'

interface Props {
  cle: string
  initialValeur: string
  label: string
}

export default function InlineSiteConfig({ cle, initialValeur, label }: Props) {
  const [valeur, setValeur] = useState(initialValeur)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialValeur)
  const [, startTransition] = useTransition()

  function startEdit() {
    setDraft(valeur)
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
  }

  function confirm() {
    const value = draft.trim() || initialValeur
    setValeur(value)
    setEditing(false)
    startTransition(async () => {
      await updateSiteConfig(cle, value)
    })
  }

  return (
    <div className="mb-6 p-4 bg-white rounded-card shadow-card">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel() }}
            className="flex-1 text-sm text-navy px-3 py-2 border border-accent-blue/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
          />
          <button type="button" onClick={confirm} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
          <button type="button" onClick={cancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <p
          className="text-sm text-navy cursor-pointer hover:text-accent-blue transition-colors"
          onClick={startEdit}
          title="Cliquer pour modifier"
        >
          {valeur}
        </p>
      )}
    </div>
  )
}
