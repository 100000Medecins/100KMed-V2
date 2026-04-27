'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Critere } from '@/types/models'

interface SolutionSortBarProps {
  criteresMajeurs: Critere[]
  currentTri: string
  currentCritere: string
  currentDir: 'asc' | 'desc'
  selectedTagIds: string[]
  count: number
  hideNoteRedac?: boolean
}

const DEFAULT_DIR: Record<string, 'asc' | 'desc'> = {
  nom: 'asc',
  note_redac: 'desc',
  note_utilisateurs: 'desc',
}

// Ordre : Note utilisateurs en premier (sélectionné par défaut), Note 100000Médecins en second
const MOBILE_NOTE_OPTIONS = [
  { value: 'note_utilisateurs', label: 'Note utilisateurs' },
  { value: 'note_redac', label: 'Note 100000Médecins' },
]

const DESKTOP_OPTIONS = [
  { value: 'nom', label: 'Nom A→Z' },
  { value: 'note_utilisateurs', label: 'Note utilisateurs' },
  { value: 'note_redac', label: 'Note 100000Médecins' },
]

export default function SolutionSortBar({ criteresMajeurs, currentTri, currentCritere, currentDir, selectedTagIds, count, hideNoteRedac = false }: SolutionSortBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const sortBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortBarRef.current && !sortBarRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  const mobileOptions = hideNoteRedac
    ? MOBILE_NOTE_OPTIONS.filter((o) => o.value !== 'note_redac')
    : MOBILE_NOTE_OPTIONS

  const desktopOptions = hideNoteRedac
    ? DESKTOP_OPTIONS.filter((o) => o.value !== 'note_redac')
    : DESKTOP_OPTIONS

  function isOptActive(value: string) {
    // Si tri non défini dans l'URL, le défaut côté serveur est note_utilisateurs
    const effective = currentTri || 'note_utilisateurs'
    return effective === value
  }

  // Label Nom dynamique (A→Z / Z→A) seulement quand nom est actif
  const nomLabel = currentTri === 'nom' && currentDir === 'desc' ? 'Nom Z→A' : 'Nom A→Z'

  function buildUrl(tri: string, critere: string, dir: 'asc' | 'desc') {
    const params = new URLSearchParams()
    if (selectedTagIds.length > 0) params.set('tags', selectedTagIds.join(','))
    if (tri) params.set('tri', tri)
    if (critere) params.set('critere', critere)
    const defaultDir = DEFAULT_DIR[tri] ?? 'desc'
    if (dir !== defaultDir) params.set('dir', dir)
    const q = params.toString()
    return q ? `${pathname}?${q}` : pathname
  }

  function handleTriClick(tri: string) {
    const isActive = isOptActive(tri)
    if (isActive) {
      const newDir: 'asc' | 'desc' = currentDir === 'asc' ? 'desc' : 'asc'
      const critere = (tri === 'note_redac' || tri === 'note_utilisateurs') ? currentCritere : ''
      router.push(buildUrl(tri, critere, newDir), { scroll: false })
    } else {
      const critere = (tri === 'note_redac' || tri === 'note_utilisateurs') ? currentCritere : ''
      router.push(buildUrl(tri, critere, DEFAULT_DIR[tri] ?? 'desc'), { scroll: false })
    }
  }

  function setCritere(critereId: string) {
    const tri = (currentTri === 'note_redac' || currentTri === 'note_utilisateurs') ? currentTri : 'note_utilisateurs'
    router.push(buildUrl(tri, critereId, currentDir), { scroll: false })
    setDropdownOpen(false)
  }

  const showCritereDropdown = !currentTri || currentTri === 'note_redac' || currentTri === 'note_utilisateurs'
  const selectedCritere = criteresMajeurs.find((c) => c.id === currentCritere)

  const mobileSortBtnClass = (active: boolean) =>
    `flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
      active ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
    }`

  const desktopSortBtnClass = (active: boolean) =>
    `flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
      active ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
    }`

  // "Note globale" : bleu léger si aucun critère sélectionné, bleu fort si critère spécifique
  const critereBtnClass = (small: boolean) =>
    `flex items-center gap-1.5 ${small ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5'} rounded-full border transition-colors whitespace-nowrap ${
      currentCritere
        ? 'bg-accent-blue text-white border-accent-blue'
        : 'bg-accent-blue/10 text-accent-blue border-accent-blue/25 hover:bg-accent-blue/20'
    }`

  const critereBtnLabel = selectedCritere ? (selectedCritere.nom_capital || selectedCritere.nom_court) : 'Note globale'

  const dropdownList = dropdownOpen && (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 bg-white rounded-xl shadow-card border border-gray-100 py-1 w-max max-w-[min(200px,calc(100vw-2rem))]">
      <button
        onClick={() => { router.push(buildUrl(currentTri || 'note_utilisateurs', '', currentDir), { scroll: false }); setDropdownOpen(false) }}
        className={`w-full text-left text-xs px-4 py-2 hover:bg-surface-light transition-colors ${!currentCritere ? 'font-semibold text-navy' : 'text-gray-600'}`}
      >
        Note globale
      </button>
      <div className="h-px bg-gray-100 mx-2 my-1" />
      {criteresMajeurs.map((c) => (
        <button
          key={c.id}
          onClick={() => setCritere(c.id)}
          className={`w-full text-left text-xs px-4 py-2 hover:bg-surface-light transition-colors ${currentCritere === c.id ? 'font-semibold text-accent-blue' : 'text-gray-600'}`}
        >
          {c.nom_capital || c.nom_court}
        </button>
      ))}
    </div>
  )

  // Sur mobile, si une seule option de tri, "Note globale" est sur la même ligne
  const mobileHasSingleSort = mobileOptions.length === 1

  return (
    <div ref={sortBarRef} className="sticky top-[80px] z-10 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-card py-3 px-4 mb-6">

      {/* MOBILE */}
      <div className="sm:hidden">
        {/* Ligne 1 : label + count */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-medium text-gray-400">Trier par :</span>
          <span className="text-xs text-gray-400">{count} solution{count > 1 ? 's' : ''}</span>
        </div>

        {/* Ligne 2 : boutons de tri (+ Note globale inline si 1 seule option) */}
        <div className="flex gap-1.5 items-center flex-nowrap">
          {mobileOptions.map((opt) => {
            const active = isOptActive(opt.value)
            const ArrowIcon = currentDir === 'asc' ? ArrowUp : ArrowDown
            return (
              <button
                key={opt.value}
                onClick={() => handleTriClick(opt.value)}
                className={mobileSortBtnClass(active)}
              >
                {opt.label}
                {active && <ArrowIcon className="w-3 h-3 shrink-0" />}
              </button>
            )
          })}

          {/* Note globale à droite sur la même ligne si une seule option de tri */}
          {mobileHasSingleSort && showCritereDropdown && criteresMajeurs.length > 0 && (
            <div className="relative inline-block ml-auto">
              <button onClick={() => setDropdownOpen((v) => !v)} className={critereBtnClass(true)}>
                {critereBtnLabel}
                <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownList}
            </div>
          )}
        </div>

        {/* Ligne 3 : Note globale centrée (seulement si 2 options de tri) */}
        {!mobileHasSingleSort && showCritereDropdown && criteresMajeurs.length > 0 && (
          <div className="mt-2 flex justify-center">
            <div className="relative inline-block">
              <button onClick={() => setDropdownOpen((v) => !v)} className={critereBtnClass(true)}>
                {critereBtnLabel}
                <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownList}
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:flex flex-row items-center justify-between gap-3">
        <span className="text-sm text-gray-400 shrink-0">
          {count} solution{count > 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-xs font-medium text-gray-400 shrink-0">Trier par :</span>
          <div className="flex gap-1.5 items-center flex-wrap">
            {desktopOptions.map((opt) => {
              const active = isOptActive(opt.value)
              const ArrowIcon = currentDir === 'asc' ? ArrowUp : ArrowDown
              const nomLabel = (currentTri === 'nom' || !currentTri) && currentDir === 'desc' ? 'Nom Z→A' : 'Nom A→Z'
              return (
                <button
                  key={opt.value}
                  onClick={() => handleTriClick(opt.value)}
                  className={desktopSortBtnClass(active)}
                >
                  {opt.value === 'nom' ? nomLabel : opt.label}
                  {active && <ArrowIcon className="w-3 h-3 shrink-0" />}
                </button>
              )
            })}
            {showCritereDropdown && criteresMajeurs.length > 0 && (
              <div className="relative">
                <button onClick={() => setDropdownOpen((v) => !v)} className={critereBtnClass(false)}>
                  {critereBtnLabel}
                  <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropdownList}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
