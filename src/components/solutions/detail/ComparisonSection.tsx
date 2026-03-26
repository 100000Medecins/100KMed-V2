'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { ResultatWithCritere } from '@/types/models'
import { getComparisonData } from '@/lib/actions/comparison'

interface ComparisonSolutionOption {
  id: string
  nom: string
  logo_url: string | null
}

interface ComparisonSectionProps {
  solutionNom: string
  resultats: ResultatWithCritere[]
  autreSolutions: ComparisonSolutionOption[]
}

interface ComparisonData {
  nom: string
  values: number[]
}

function RadarChart({
  labels,
  values,
  solutionNom,
  comparison,
}: {
  labels: string[]
  values: number[]
  solutionNom: string
  comparison?: ComparisonData | null
}) {
  const n = labels.length
  if (n < 3) return null

  const cx = 200
  const cy = 180
  const maxR = 100
  const levels = 5

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    const r = (value / 5) * maxR
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  // Grid
  const gridPaths = Array.from({ length: levels }, (_, level) => {
    const r = ((level + 1) / levels) * maxR
    const points = Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    })
    return `M${points.join('L')}Z`
  })

  // Axis lines
  const axisLines = Array.from({ length: n }, (_, i) => {
    const p = getPoint(i, 5)
    return `M${cx},${cy}L${p.x},${p.y}`
  })

  // Data polygon (solution principale)
  const dataPoints = values.map((v, i) => getPoint(i, v))
  const dataPath = `M${dataPoints.map((p) => `${p.x},${p.y}`).join('L')}Z`

  // Comparison polygon
  let compDataPoints: { x: number; y: number }[] = []
  let compDataPath = ''
  if (comparison) {
    compDataPoints = comparison.values.map((v, i) => getPoint(i, v))
    compDataPath = `M${compDataPoints.map((p) => `${p.x},${p.y}`).join('L')}Z`
  }

  // Label positions
  const labelPositions = labels.map((label, i) => {
    const p = getPoint(i, 6.2)
    return { label, x: p.x, y: p.y }
  })

  return (
    <svg viewBox="0 0 400 380" className="w-full max-w-[400px] mx-auto">
      {/* Grid */}
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
      ))}

      {/* Axes */}
      {axisLines.map((d, i) => (
        <path key={i} d={d} stroke="#e5e7eb" strokeWidth="0.5" />
      ))}

      {/* Comparison area (behind) */}
      {comparison && compDataPath && (
        <>
          <path d={compDataPath} fill="rgba(232, 115, 74, 0.12)" stroke="#E8734A" strokeWidth="2" />
          {compDataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#E8734A" />
          ))}
        </>
      )}

      {/* Main data area */}
      <path d={dataPath} fill="rgba(74, 144, 217, 0.15)" stroke="#4A90D9" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#4A90D9" />
      ))}

      {/* Labels */}
      {labelPositions.map((item, i) => (
        <text
          key={i}
          x={item.x}
          y={item.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] fill-gray-500"
        >
          {item.label}
        </text>
      ))}

      {/* Legend */}
      <circle cx="30" cy={comparison ? 350 : 360} r="4" fill="#4A90D9" />
      <text x="38" y={comparison ? 350 : 360} dominantBaseline="middle" className="text-[9px] fill-gray-600">
        {solutionNom}
      </text>
      {comparison && (
        <>
          <circle cx="30" cy="365" r="4" fill="#E8734A" />
          <text x="38" y="365" dominantBaseline="middle" className="text-[9px] fill-gray-600">
            {comparison.nom}
          </text>
        </>
      )}
    </svg>
  )
}

export default function ComparisonSection({
  solutionNom,
  resultats,
  autreSolutions,
}: ComparisonSectionProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [comparison, setComparison] = useState<ComparisonData | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const criteria = resultats.filter(
    (r) => r.critere && r.critere.type !== 'synthese' && r.critere.type !== 'nps'
  )

  if (criteria.length < 3) return null

  const labels = criteria.map((r) => r.critere?.nom_court || '')
  const values = criteria.map((r) => Number(r.note_redac_base5 ?? r.moyenne_utilisateurs_base5 ?? 0))

  const handleSelectSolution = (sol: ComparisonSolutionOption) => {
    setDropdownOpen(false)
    setSelectedId(sol.id)

    startTransition(async () => {
      const data = await getComparisonData(sol.id)

      // Aligner les valeurs sur les mêmes critères (mêmes labels, même ordre)
      const compValues = labels.map((label) => {
        const match = data.find((d) => d.nomCourt === label)
        return match ? match.value : 0
      })

      setComparison({ nom: sol.nom, values: compValues })
    })
  }

  const handleRemoveComparison = () => {
    setComparison(null)
    setSelectedId(null)
  }

  return (
    <section className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-navy">Radar comparatif</h2>
        {autreSolutions.length > 0 && (
          <div className="relative">
            {comparison ? (
              <button
                onClick={handleRemoveComparison}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
                Retirer la comparaison
              </button>
            ) : (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-navy/90 transition-colors"
              >
                Comparer
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            )}

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-20 max-h-60 overflow-y-auto">
                {autreSolutions.map((sol) => (
                  <button
                    key={sol.id}
                    onClick={() => handleSelectSolution(sol)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-light transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    {sol.logo_url ? (
                      <img src={sol.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-gray-50 p-0.5" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-xs font-bold text-accent-blue">
                        {sol.nom.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-navy">{sol.nom}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
          </div>
        ) : (
          <RadarChart
            labels={labels}
            values={values}
            solutionNom={solutionNom}
            comparison={comparison}
          />
        )}
      </div>
    </section>
  )
}
