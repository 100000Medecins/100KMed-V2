'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function RecalcAllSolutionsButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [count, setCount] = useState<number | null>(null)

  const handleClick = async () => {
    if (!confirm('Recalculer les résultats de toutes les solutions actives ? (opération longue)')) return
    setState('loading')
    try {
      const res = await fetch('/api/admin/recalc-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const data = await res.json()
      if (res.ok) {
        setCount(data.count)
        setState('ok')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
    setTimeout(() => { setState('idle'); setCount(null) }, 5000)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading'}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`} />
      {state === 'loading' && 'Recalcul en cours…'}
      {state === 'ok' && `✓ ${count} solutions recalculées`}
      {state === 'error' && '✗ Erreur'}
      {state === 'idle' && 'Recalcul global'}
    </button>
  )
}
