'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, X, Plus } from 'lucide-react'
import type { ResultatWithCritere } from '@/types/models'
import { getComparisonData } from '@/lib/actions/comparison'

const COLORS = ['#4A90D9', '#E8734A', '#9333EA', '#16A34A']
const COLORS_BG = ['rgba(74,144,217,0.18)', 'rgba(232,115,74,0.15)', 'rgba(147,51,234,0.13)', 'rgba(22,163,74,0.13)']
const COLORS_LIGHT = ['bg-blue-100 text-blue-700 border-blue-200', 'bg-orange-100 text-orange-700 border-orange-200', 'bg-purple-100 text-purple-700 border-purple-200', 'bg-green-100 text-green-700 border-green-200']
const MAX_COMPARISONS = 3

interface ComparisonSolutionOption {
  id: string
  nom: string
  logo_url: string | null
}

interface ComparisonData {
  id: string
  nom: string
  values: number[]
}

function RadarChart({
  labels,
  mainValues,
  comparisons,
}: {
  labels: string[]
  mainValues: number[]
  comparisons: ComparisonData[]
}) {
  const n = labels.length
  if (n < 3) return null

  const cx = 240
  const cy = 195
  const maxR = 145
  const levels = 5
  const labelR = maxR + 30

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    const r = (value / 5) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const getLabelPos = (index: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    return { x: cx + labelR * Math.cos(angle), y: cy + labelR * Math.sin(angle), angle }
  }

  const gridPaths = Array.from({ length: levels }, (_, level) => {
    const r = ((level + 1) / levels) * maxR
    const points = Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    })
    return `M${points.join('L')}Z`
  })

  const axisLines = Array.from({ length: n }, (_, i) => {
    const p = getPoint(i, 5)
    return `M${cx},${cy}L${p.x},${p.y}`
  })

  const mainPoints = mainValues.map((v, i) => getPoint(i, v))
  const mainPath = `M${mainPoints.map(p => `${p.x},${p.y}`).join('L')}Z`

  // Labels avec règles spécifiques : jamais couper les mots uniques, couper entre mots si > 1 mot
  function splitLabel(label: string): [string, string | null] {
    const words = label.split(' ')
    if (words.length === 1) return [label, null] // mot unique → jamais coupé
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }

  // Offset supplémentaire selon la position angulaire
  function getLabelOffset(index: number): { dx: number; dy: number } {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    const deg = (angle * 180) / Math.PI
    // Côté droit du radar (de -30° à 80°) → pousser vers la droite
    if (deg > -30 && deg < 80) return { dx: 16, dy: 0 }
    return { dx: 0, dy: 0 }
  }

  return (
    <svg viewBox="-10 0 520 400" className="w-full max-w-[540px] mx-auto">
      {/* Grid */}
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#e5e7eb" strokeWidth="0.8" />
      ))}
      {/* Axes */}
      {axisLines.map((d, i) => (
        <path key={i} d={d} stroke="#e5e7eb" strokeWidth="0.8" />
      ))}

      {/* Comparison polygons (behind) */}
      {comparisons.map((comp, ci) => {
        const pts = comp.values.map((v, i) => getPoint(i, v))
        const path = `M${pts.map(p => `${p.x},${p.y}`).join('L')}Z`
        return (
          <g key={comp.id}>
            <path d={path} fill={COLORS_BG[ci + 1]} stroke={COLORS[ci + 1]} strokeWidth="2" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="4" fill={COLORS[ci + 1]} />
            ))}
          </g>
        )
      })}

      {/* Main polygon */}
      <path d={mainPath} fill={COLORS_BG[0]} stroke={COLORS[0]} strokeWidth="2.5" />
      {mainPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4.5" fill={COLORS[0]} />
      ))}

      {/* Labels — gras, proches des sommets */}
      {labels.map((label, i) => {
        const pos = getLabelPos(i)
        const off = getLabelOffset(i)
        const [line1, line2] = splitLabel(label)
        const dy = line2 ? -9 : 0
        return (
          <g key={i}>
            <text
              x={pos.x + off.dx}
              y={pos.y + off.dy + dy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
              fontSize="12.5"
              fill="#1B2A4A"
            >
              {line1}
            </text>
            {line2 && (
              <text
                x={pos.x + off.dx}
                y={pos.y + off.dy + 9}
                textAnchor="middle"
                dominantBaseline="middle"
                fontWeight="700"
                fontSize="12.5"
                fill="#1B2A4A"
              >
                {line2}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function ComparisonSection({
  solutionNom,
  resultats,
  autreSolutions,
}: {
  solutionNom: string
  resultats: ResultatWithCritere[]
  autreSolutions: { id: string; nom: string; logo_url: string | null }[]
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [comparisons, setComparisons] = useState<ComparisonData[]>([])
  const [isPending, startTransition] = useTransition()

  const criteria = resultats.filter(
    (r) => r.critere && r.critere.type !== 'synthese' && r.critere.type !== 'nps'
  )
  if (criteria.length < 3) return null

  const labels = criteria.map((r) => r.critere?.nom_court || '')
  const mainValues = criteria.map((r) => Number(r.note_redac_base5 ?? r.moyenne_utilisateurs_base5 ?? 0))

  const selectedIds = comparisons.map(c => c.id)
  const availableSolutions = autreSolutions.filter(s => !selectedIds.includes(s.id))
  const canAddMore = comparisons.length < MAX_COMPARISONS

  const handleSelect = (sol: { id: string; nom: string; logo_url: string | null }) => {
    setDropdownOpen(false)
    startTransition(async () => {
      const data = await getComparisonData(sol.id)
      const compValues = labels.map((label) => {
        const match = data.find((d) => d.nomCourt === label)
        return match ? match.value : 0
      })
      setComparisons(prev => [...prev, { id: sol.id, nom: sol.nom, values: compValues }])
    })
  }

  const handleRemove = (id: string) => {
    setComparisons(prev => prev.filter(c => c.id !== id))
  }

  // All solutions in display order: main + comparisons
  const allSolutions = [
    { id: 'main', nom: solutionNom, colorIdx: 0 },
    ...comparisons.map((c, i) => ({ id: c.id, nom: c.nom, colorIdx: i + 1 })),
  ]

  return (
    <section className="bg-white rounded-card shadow-card overflow-hidden">
      {/* Header dans la carte */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-xl font-bold text-navy">Radar comparatif</h2>
      </div>

      <div className="px-6 pt-4 pb-2 md:px-8 md:pt-5 md:pb-3">
        {/* Chips solutions + bouton Comparer inline */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {allSolutions.map((s) => (
            <div
              key={s.id}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${COLORS_LIGHT[s.colorIdx]}`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[s.colorIdx] }} />
              {s.nom}
              {s.id !== 'main' && (
                <button
                  onClick={() => handleRemove(s.id)}
                  className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label={`Retirer ${s.nom}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Bouton Comparer — chip inline */}
          {autreSolutions.length > 0 && canAddMore && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-1.5 bg-accent-blue text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-md hover:bg-accent-blue/90 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Comparer
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-20 max-h-60 overflow-y-auto">
                  {availableSolutions.length === 0 ? (
                    <p className="text-sm text-gray-400 px-4 py-3">Aucune autre solution disponible</p>
                  ) : (
                    availableSolutions.map((sol) => (
                      <button
                        key={sol.id}
                        onClick={() => handleSelect(sol)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-light transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {sol.logo_url ? (
                          <img src={sol.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-gray-50 p-0.5 border border-gray-100" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-xs font-bold text-accent-blue shrink-0">
                            {sol.nom.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-medium text-navy">{sol.nom}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
          </div>
        ) : (
          <RadarChart
            labels={labels}
            mainValues={mainValues}
            comparisons={comparisons}
          />
        )}
      </div>
    </section>
  )
}
