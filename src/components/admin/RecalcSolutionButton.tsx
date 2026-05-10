'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function RecalcSolutionButton({ solutionId }: { solutionId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  const handleClick = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/admin/recalc-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionId }),
      })
      setState(res.ok ? 'ok' : 'error')
    } catch {
      setState('error')
    }
    setTimeout(() => setState('idle'), 3000)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading'}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-navy hover:text-navy transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`} />
      {state === 'loading' && 'Recalcul…'}
      {state === 'ok' && '✓ Résultats recalculés'}
      {state === 'error' && '✗ Erreur'}
      {state === 'idle' && 'Recalculer les résultats'}
    </button>
  )
}
