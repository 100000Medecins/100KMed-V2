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

export default function SolutionSortBar({ criteresMajeurs, currentTri, currentCritere, currentDir, selectedTagIds, count, hideNoteRedac = false }: SolutionSortBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sortButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const sortRowRef = useRef<HTMLDivElement>(null)
  const critereWrapRef = useRef<HTMLDivElement>(null)
  const [critereLeft, setCritereLeft] = useState<number | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  // Sur mobile : centrer le bouton "Tous critères" sous le bouton actif
  useEffect(() => {
    function compute() {
      if (window.innerWidth >= 640) { setCritereLeft(null); return }
      const activeIndex = options.findIndex(
        (opt) => currentTri === opt.value || (opt.value === 'nom' && !currentTri)
      )
      const activeBtn = sortButtonRefs.current[activeIndex]
      const row = sortRowRef.current
      const wrap = critereWrapRef.current
      if (!activeBtn || !row || !wrap) return

      const btnRect = activeBtn.getBoundingClientRect()
      const rowRect = row.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()

      // Centre du bouton actif dans le repère de la ligne
      const btnCenterInRow = btnRect.left + btnRect.width / 2 - rowRect.left
      // On veut que le centre du wrapper "Tous critères" soit aligné sur btnCenterInRow
      const left = btnCenterInRow - wrapRect.width / 2
      setCritereLeft(left)
    }

    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTri, currentDir])

  function buildUrl(tri: string, critere: string, dir: 'asc' | 'desc') {
    const params = new URLSearchParams()
    if (selectedTagIds.length > 0) params.set('tags', selectedTagIds.join(','))
    if (tri && tri !== 'nom') params.set('tri', tri)
    if (critere) params.set('critere', critere)
    const defaultDir = DEFAULT_DIR[tri] ?? 'desc'
    if (dir !== defaultDir) params.set('dir', dir)
    const q = params.toString()
    return q ? `${pathname}?${q}` : pathname
  }

  function handleTriClick(tri: string) {
    const isActive = currentTri === tri || (!currentTri && tri === 'nom')
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
    const tri = (currentTri === 'note_redac' || currentTri === 'note_utilisateurs') ? currentTri : 'note_redac'
    router.push(buildUrl(tri, critereId, currentDir), { scroll: false })
    setDropdownOpen(false)
  }

  const nomLabel = (currentTri === 'nom' || !currentTri) && currentDir === 'desc' ? 'Nom Z→A' : 'Nom A→Z'

  const ALL_OPTIONS = [
    { value: 'nom', label: nomLabel },
    { value: 'note_redac', label: 'Note 100000Médecins' },
    { value: 'note_utilisateurs', label: 'Note utilisateurs' },
  ]

  const options = hideNoteRedac ? ALL_OPTIONS.filter((o) => o.value !== 'note_redac') : ALL_OPTIONS

  const showCritereDropdown = currentTri === 'note_redac' || currentTri === 'note_utilisateurs'
  const selectedCritere = criteresMajeurs.find((c) => c.id === currentCritere)

  return (
    <div className="sticky top-[80px] z-10 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-card py-3 px-4 mb-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <span className="text-sm text-gray-400 shrink-0">
          {count} solution{count > 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-xs font-medium text-gray-400 shrink-0">Trier par :</span>

          <div className="flex flex-row flex-wrap items-center gap-1.5">

            {/* Ligne des boutons de tri */}
            <div ref={sortRowRef} className="flex gap-1.5 flex-wrap items-center">
              {options.map((opt, i) => {
                const isActive = currentTri === opt.value || (opt.value === 'nom' && !currentTri)
                const ArrowIcon = currentDir === 'asc' ? ArrowUp : ArrowDown
                return (
                  <button
                    key={opt.value}
                    ref={(el) => { sortButtonRefs.current[i] = el }}
                    onClick={() => handleTriClick(opt.value)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
                    }`}
                  >
                    {opt.label}
                    {isActive && opt.value !== 'nom' && <ArrowIcon className="w-3 h-3 shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Dropdown critère — visible seulement si tri par note */}
            {showCritereDropdown && criteresMajeurs.length > 0 && (
              <div
                className="relative sm:static"
                style={critereLeft !== null ? { position: 'relative', left: critereLeft } : undefined}
              >
                <div ref={critereWrapRef} className="inline-block">
                  <div ref={dropdownRef} className="relative">
                    <button
                      onClick={() => setDropdownOpen((v) => !v)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                        currentCritere
                          ? 'bg-accent-blue text-white border-accent-blue'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-accent-blue hover:text-accent-blue'
                      }`}
                    >
                      {selectedCritere ? (selectedCritere.nom_capital || selectedCritere.nom_court) : 'Tous critères'}
                      <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-card border border-gray-100 py-1 min-w-[180px]">
                        <button
                          onClick={() => { router.push(buildUrl(currentTri, '', currentDir), { scroll: false }); setDropdownOpen(false) }}
                          className={`w-full text-left text-xs px-4 py-2 hover:bg-surface-light transition-colors ${!currentCritere ? 'font-semibold text-navy' : 'text-gray-600'}`}
                        >
                          Tous les critères
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
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
