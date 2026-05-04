'use client'

import { SPECIALITES } from '@/lib/constants/profil'

interface Props {
  value: string[]
  onChange: (v: string[]) => void
  className?: string
}

export default function SpecialitesSelector({ value, onChange, className }: Props) {
  function toggle(s: string) {
    onChange(value.includes(s) ? value.filter(x => x !== s) : [...value, s])
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600">
          Spécialités ciblées{' '}
          <span className="text-gray-400 font-normal">(laisser vide = toutes les spécialités)</span>
        </label>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-xs text-accent-blue hover:underline">
            Réinitialiser
          </button>
        )}
      </div>
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-white">
        {SPECIALITES.map(s => (
          <label key={s} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-0.5 rounded">
            <input
              type="checkbox"
              checked={value.includes(s)}
              onChange={() => toggle(s)}
              className="accent-navy w-3 h-3 shrink-0"
            />
            {s}
          </label>
        ))}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-teal-600 mt-1">
          {value.length} spécialité{value.length > 1 ? 's' : ''} sélectionnée{value.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
