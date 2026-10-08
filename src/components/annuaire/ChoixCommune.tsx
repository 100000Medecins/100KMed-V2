'use client'

import { useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import Input from '@/components/ui/Input'
import { chercherCommunes, type Commune } from '@/lib/annuaire/geocodage'

/**
 * Choix d'une commune par autocomplétion (géocodeur IGN, appelé depuis le navigateur).
 * Une fois choisie, la commune s'affiche en pastille, avec une croix pour l'effacer.
 */
export default function ChoixCommune({
  valeur,
  onChange,
  id,
  placeholder = 'Ville ou code postal',
  ariaLabel = 'Commune',
}: {
  valeur: Commune | null
  onChange: (commune: Commune | null) => void
  id?: string
  placeholder?: string
  ariaLabel?: string
}) {
  const [saisie, setSaisie] = useState('')
  const [propositions, setPropositions] = useState<Commune[]>([])
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)
  const derniere = useRef(0)

  function saisir(texte: string) {
    setSaisie(texte)
    if (minuteur.current) clearTimeout(minuteur.current)
    if (texte.trim().length < 2) {
      setPropositions([])
      return
    }
    const numero = ++derniere.current
    minuteur.current = setTimeout(async () => {
      const resultats = await chercherCommunes(texte)
      if (numero === derniere.current) setPropositions(resultats)
    }, 250)
  }

  function choisir(commune: Commune) {
    onChange(commune)
    setSaisie('')
    setPropositions([])
  }

  if (valeur) {
    return (
      <div className="flex items-center gap-2 rounded-button border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
        <MapPin className="w-4 h-4 text-accent-blue flex-shrink-0" />
        <span className="flex-1 truncate">
          {valeur.ville}
          {valeur.codePostal && ` (${valeur.codePostal})`}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Effacer la commune"
          className="rounded-full p-0.5 text-gray-400 hover:text-navy hover:bg-surface-light"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        id={id}
        size="sm"
        value={saisie}
        onChange={(e) => saisir(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {propositions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full divide-y divide-gray-100 rounded-button border border-gray-200 bg-white shadow-card">
          {propositions.map((c) => (
            <li key={`${c.communeInsee}-${c.codePostal}`}>
              <button
                type="button"
                onClick={() => choisir(c)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-surface-light"
              >
                {c.ville} <span className="text-gray-400">{c.codePostal}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
