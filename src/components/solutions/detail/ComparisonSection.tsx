'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, X, Plus } from 'lucide-react'
import type { ResultatWithCritere } from '@/types/models'
import { getComparisonData, getDetailedComparisonData, type DetailGroupItem } from '@/lib/actions/comparison'

const COLORS = ['#4A90D9', '#E8734A', '#9333EA', '#16A34A']
const COLORS_BG = ['rgba(74,144,217,0.18)', 'rgba(232,115,74,0.15)', 'rgba(147,51,234,0.13)', 'rgba(22,163,74,0.13)']
const COLORS_LIGHT = ['bg-blue-100 text-blue-700 border-blue-200', 'bg-orange-100 text-orange-700 border-orange-200', 'bg-purple-100 text-purple-700 border-purple-200', 'bg-green-100 text-green-700 border-green-200']
const MAX_COMPARISONS = 3

type NoteMode = 'redac' | 'utilisateurs'

interface ComparisonData {
  id: string
  nom: string
  valuesRedac: number[]
  valuesUtilisateurs: number[]
}

interface RadarComparison {
  id: string
  values: number[]
}

// ─── Radar SVG ────────────────────────────────────────────────────────────────

function RadarChart({ labels, mainValues, comparisons }: {
  labels: string[]
  mainValues: number[]
  comparisons: RadarComparison[]
}) {
  const n = labels.length
  if (n < 3) return null
  const cx = 240, cy = 195, maxR = 145, levels = 5, labelR = maxR + 30

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    const r = (value / 5) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }
  const getLabelPos = (index: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    return { x: cx + labelR * Math.cos(angle), y: cy + labelR * Math.sin(angle) }
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

  function splitLabel(label: string): [string, string | null] {
    const words = label.split(' ')
    if (words.length === 1) return [label, null]
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }
  function getLabelOffset(index: number) {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    const deg = (angle * 180) / Math.PI
    return deg > -30 && deg < 80 ? { dx: 16, dy: 0 } : { dx: 0, dy: 0 }
  }

  return (
    <svg viewBox="-10 0 520 400" className="w-full max-w-[540px] mx-auto">
      {gridPaths.map((d, i) => <path key={i} d={d} fill="none" stroke="#e5e7eb" strokeWidth="0.8" />)}
      {axisLines.map((d, i) => <path key={i} d={d} stroke="#e5e7eb" strokeWidth="0.8" />)}
      {comparisons.map((comp, ci) => {
        const pts = comp.values.map((v, i) => getPoint(i, v))
        const path = `M${pts.map(p => `${p.x},${p.y}`).join('L')}Z`
        return (
          <g key={comp.id}>
            <path d={path} fill={COLORS_BG[ci + 1]} stroke={COLORS[ci + 1]} strokeWidth="2" />
            {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={COLORS[ci + 1]} />)}
          </g>
        )
      })}
      <path d={mainPath} fill={COLORS_BG[0]} stroke={COLORS[0]} strokeWidth="2.5" />
      {mainPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4.5" fill={COLORS[0]} />)}
      {labels.map((label, i) => {
        const pos = getLabelPos(i)
        const off = getLabelOffset(i)
        const [line1, line2] = splitLabel(label)
        const dy = line2 ? -9 : 0
        return (
          <g key={i}>
            <text x={pos.x + off.dx} y={pos.y + off.dy + dy} textAnchor="middle" dominantBaseline="middle" fontWeight="700" fontSize="12.5" fill="#1B2A4A">{line1}</text>
            {line2 && <text x={pos.x + off.dx} y={pos.y + off.dy + 9} textAnchor="middle" dominantBaseline="middle" fontWeight="700" fontSize="12.5" fill="#1B2A4A">{line2}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Barres côte à côte ───────────────────────────────────────────────────────

interface BarValue {
  colorIdx: number
  value: number | null
  nbNotes?: number | null
}

function InlineBars({ bars, compact = false }: { bars: BarValue[]; compact?: boolean }) {
  const values = bars.map(b => b.value)
  const maxVal = Math.max(...values.filter((v): v is number => v != null))
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {bars.map((b, i) => {
        const pct = b.value != null ? Math.round((b.value / 5) * 100) : 0
        const isBest = b.value != null && b.value === maxVal && values.filter(v => v === maxVal).length === 1
        return (
          <div key={i} className={`flex items-center gap-1 ${compact ? 'w-24' : 'w-20'}`}>
            <div className={`flex-1 rounded-full overflow-hidden ${compact ? 'h-2' : 'h-2'} ${isBest ? 'bg-gray-200' : 'bg-gray-100'}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${isBest ? 'opacity-100' : 'opacity-60'}`}
                style={{ width: `${pct}%`, backgroundColor: COLORS[b.colorIdx] }}
              />
            </div>
            <span
              className={`tabular-nums text-right shrink-0 ${compact ? 'text-[10px] w-5' : 'text-xs w-6'} ${isBest ? 'font-bold' : 'font-medium opacity-60'}`}
              style={{ color: COLORS[b.colorIdx] }}
            >
              {b.value != null ? b.value.toFixed(1) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ComparisonSection({
  solutionId,
  solutionNom,
  resultats,
  autreSolutions,
}: {
  solutionId: string
  solutionNom: string
  resultats: ResultatWithCritere[]
  autreSolutions: { id: string; nom: string; logo_url: string | null }[]
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [comparisons, setComparisons] = useState<ComparisonData[]>([])
  const [noteMode, setNoteMode] = useState<NoteMode>('redac')
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [expandedCriteres, setExpandedCriteres] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [detailMain, setDetailMain] = useState<DetailGroupItem[] | null>(null)
  const [detailComps, setDetailComps] = useState<Record<string, DetailGroupItem[]>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [legendDropdown, setLegendDropdown] = useState<string | null>(null)

  // ── Radar ──
  const criteria = resultats.filter(
    (r) => r.critere && r.critere.type !== 'synthese' && r.critere.type !== 'nps'
  )
  if (criteria.length < 3) return null

  const labels = criteria.map((r) => r.critere?.nom_court || '')
  const mainValues = criteria.map((r) =>
    noteMode === 'redac'
      ? Number(r.note_redac_base5 ?? r.moyenne_utilisateurs_base5 ?? 0)
      : Number(r.moyenne_utilisateurs_base5 ?? r.note_redac_base5 ?? 0)
  )

  const selectedIds = comparisons.map(c => c.id)
  const availableSolutions = autreSolutions.filter(s => !selectedIds.includes(s.id))
  const canAddMore = comparisons.length < MAX_COMPARISONS

  const handleSelect = (sol: { id: string; nom: string; logo_url: string | null }) => {
    setDropdownOpen(false)
    startTransition(async () => {
      const [data, detailData] = await Promise.all([
        getComparisonData(sol.id),
        getDetailedComparisonData(sol.id),
      ])
      const valuesRedac = labels.map((label) => {
        const match = data.find((d) => d.nomCourt === label)
        return match ? (match.valueRedac ?? match.valueUtilisateurs ?? 0) : 0
      })
      const valuesUtilisateurs = labels.map((label) => {
        const match = data.find((d) => d.nomCourt === label)
        return match ? (match.valueUtilisateurs ?? match.valueRedac ?? 0) : 0
      })
      setComparisons(prev => [...prev, { id: sol.id, nom: sol.nom, valuesRedac, valuesUtilisateurs }])
      if (detailData.length > 0) {
        setDetailComps(prev => ({ ...prev, [sol.id]: detailData }))
      }
    })
  }

  const handleRemove = (id: string) => {
    setComparisons(prev => prev.filter(c => c.id !== id))
    setDetailComps(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (legendDropdown === id) setLegendDropdown(null)
  }

  const handleSwap = (oldId: string, newSol: { id: string; nom: string; logo_url: string | null }) => {
    setLegendDropdown(null)
    startTransition(async () => {
      const [data, detailData] = await Promise.all([
        getComparisonData(newSol.id),
        getDetailedComparisonData(newSol.id),
      ])
      const valuesRedac = labels.map((label) => {
        const match = data.find((d) => d.nomCourt === label)
        return match ? (match.valueRedac ?? match.valueUtilisateurs ?? 0) : 0
      })
      const valuesUtilisateurs = labels.map((label) => {
        const match = data.find((d) => d.nomCourt === label)
        return match ? (match.valueUtilisateurs ?? match.valueRedac ?? 0) : 0
      })
      setComparisons(prev => prev.map(c =>
        c.id === oldId ? { id: newSol.id, nom: newSol.nom, valuesRedac, valuesUtilisateurs } : c
      ))
      setDetailComps(prev => {
        const next = { ...prev }
        delete next[oldId]
        if (detailData.length > 0) next[newSol.id] = detailData
        return next
      })
    })
  }

  const toggleCritere = (id: string) => {
    setExpandedCriteres(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSolutions = [
    { id: 'main', nom: solutionNom, colorIdx: 0 },
    ...comparisons.map((c, i) => ({ id: c.id, nom: c.nom, colorIdx: i + 1 })),
  ]

  const radarComparisons: RadarComparison[] = comparisons.map(c => ({
    id: c.id,
    values: noteMode === 'redac' ? c.valuesRedac : c.valuesUtilisateurs,
  }))

  // ── Accordéon détaillé — lazy-load on first expand ──
  const handleDetailExpand = () => {
    if (!detailExpanded && detailMain === null) {
      setDetailLoading(true)
      void getDetailedComparisonData(solutionId).then((data) => {
        setDetailMain(data)
        setDetailLoading(false)
      })
    }
    setDetailExpanded(v => !v)
  }

  // Construire les groupes à afficher
  const detailGroups = (detailMain ?? []).map((group) => ({
    titre: group.parentNom,
    children: group.items.map((item) => ({
      id: item.critereId,
      nom: item.nomCourt,
      bars: [
        { colorIdx: 0, value: item.valueUtilisateurs },
        ...comparisons.map((comp, i) => {
          const compGroup = (detailComps[comp.id] ?? []).find((g) => g.parentKey === group.parentKey)
          const compItem = compGroup?.items.find((it) => it.critereId === item.critereId)
          return { colorIdx: i + 1, value: compItem?.valueUtilisateurs ?? null }
        }),
      ],
    })),
  }))

  return (
    <section className="bg-white rounded-card shadow-card [overflow:clip]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-navy shrink-0">Radar comparatif</h2>
        <div className="flex items-center rounded-full border border-gray-200 overflow-hidden text-xs md:text-sm font-medium shrink-0">
          <button
            onClick={() => setNoteMode('redac')}
            className={`px-3 py-1.5 md:px-4 transition-colors ${noteMode === 'redac' ? 'bg-navy text-white' : 'text-gray-500 hover:text-navy'}`}
          >
            Rédaction
          </button>
          <button
            onClick={() => setNoteMode('utilisateurs')}
            className={`px-3 py-1.5 md:px-4 transition-colors ${noteMode === 'utilisateurs' ? 'bg-navy text-white' : 'text-gray-500 hover:text-navy'}`}
          >
            Utilisateurs
          </button>
        </div>
      </div>

      {/* Radar */}
      <div className="px-6 pt-4 pb-2 md:px-8 md:pt-5 md:pb-3">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {allSolutions.map((s) => (
            <div key={s.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${COLORS_LIGHT[s.colorIdx]}`}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[s.colorIdx] }} />
              {s.nom}
              {s.id !== 'main' && (
                <button onClick={() => handleRemove(s.id)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity" aria-label={`Retirer ${s.nom}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

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
                      <button key={sol.id} onClick={() => handleSelect(sol)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-light transition-colors first:rounded-t-xl last:rounded-b-xl">
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
          <RadarChart labels={labels} mainValues={mainValues} comparisons={radarComparisons} />
        )}
      </div>

      {/* Comparatif détaillé — accordéon (notes utilisateurs uniquement) */}
      <div className="border-t border-gray-100">
        <button
          onClick={handleDetailExpand}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-navy">Comparatif détaillé par sous-critères</span>
            <span className="text-xs text-gray-400 font-normal">(notes utilisateurs)</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${detailExpanded ? 'rotate-180' : ''}`} />
        </button>

        {detailExpanded && (
          <div className="sticky top-[72px] z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100">
            <div className="flex items-center px-6 py-2">
              <div className="flex-1" />
              <div className="flex items-center gap-2 flex-shrink-0">
                {allSolutions.map((sol) => {
                  const label = sol.nom.length > 10 ? sol.nom.slice(0, 10) + '…' : sol.nom
                  if (sol.id === 'main') {
                    return (
                      <div key={sol.id} className="w-24">
                        <span className="text-[11px] font-semibold leading-tight block" style={{ color: COLORS[sol.colorIdx] }}>
                          {label}
                        </span>
                      </div>
                    )
                  }
                  const swapOptions = autreSolutions.filter(
                    s => !comparisons.some(c => c.id === s.id && c.id !== sol.id)
                  )
                  return (
                    <div key={sol.id} className="w-24 relative">
                      <div className="flex items-center justify-between gap-0.5">
                        <button
                          onClick={() => setLegendDropdown(d => d === sol.id ? null : sol.id)}
                          className="flex items-center gap-0.5 min-w-0 hover:opacity-75 transition-opacity"
                          style={{ color: COLORS[sol.colorIdx] }}
                        >
                          <span className="text-[11px] font-semibold leading-tight truncate">{label}</span>
                          <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${legendDropdown === sol.id ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleRemove(sol.id)}
                          className="shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: COLORS[sol.colorIdx] }}
                          aria-label={`Retirer ${sol.nom}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {legendDropdown === sol.id && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-30 max-h-52 overflow-y-auto">
                          {swapOptions.length === 0 ? (
                            <p className="text-sm text-gray-400 px-4 py-3">Aucune autre solution disponible</p>
                          ) : (
                            swapOptions.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => handleSwap(sol.id, s)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-light transition-colors first:rounded-t-xl last:rounded-b-xl"
                              >
                                {s.logo_url ? (
                                  <img src={s.logo_url} alt="" className="w-7 h-7 rounded-lg object-contain bg-gray-50 p-0.5 border border-gray-100 shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center text-xs font-bold text-accent-blue shrink-0">
                                    {s.nom.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-sm font-medium text-navy">{s.nom}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {canAddMore && availableSolutions.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setLegendDropdown(d => d === '__add__' ? null : '__add__')}
                      className="w-5 h-5 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-navy hover:text-navy transition-colors"
                      aria-label="Ajouter une solution"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    {legendDropdown === '__add__' && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-30 max-h-52 overflow-y-auto">
                        {availableSolutions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => { setLegendDropdown(null); handleSelect(s) }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-light transition-colors first:rounded-t-xl last:rounded-b-xl"
                          >
                            {s.logo_url ? (
                              <img src={s.logo_url} alt="" className="w-7 h-7 rounded-lg object-contain bg-gray-50 p-0.5 border border-gray-100 shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center text-xs font-bold text-accent-blue shrink-0">
                                {s.nom.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-medium text-navy">{s.nom}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="w-4 shrink-0" />
            </div>
          </div>
        )}

        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${detailExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
              </div>
            ) : detailMain !== null && detailMain.length === 0 ? (
              <p className="text-sm text-gray-400 px-6 py-4">Aucune donnée détaillée disponible.</p>
            ) : (
              <div className="pb-2">
                {detailGroups.map((group) => {
                  const isOpen = expandedCriteres.has(group.titre)
                  return (
                    <div key={group.titre} className="border-b border-gray-50 last:border-0">
                      <button
                        onClick={() => toggleCritere(group.titre)}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <span className="flex-1 text-sm font-semibold text-navy">{group.titre}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                          <div className="bg-gray-50/60">
                            {group.children.map((child) => (
                              <div key={child.id} className="flex items-center gap-3 px-6 py-2 border-t border-gray-100 first:border-0">
                                <span className="flex-1 text-xs text-gray-600 pl-3 line-clamp-2">{child.nom}</span>
                                <InlineBars bars={child.bars} compact />
                                <div className="w-4 shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
