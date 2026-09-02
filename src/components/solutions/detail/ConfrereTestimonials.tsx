'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { resolveSpecialite } from '@/lib/constants/profil'
import { getCritereLabels } from '@/lib/constants/criteres'
import { getDisplayName } from '@/lib/displayName'

const CRITERE_ORDER = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']

type TriAvis = 'date' | 'date_asc' | 'note' | 'note_asc'

interface Avis {
  id: string
  userId: string
  user: { pseudo: string | null; nom: string | null; prenom: string | null; portrait: string | null; specialite: string | null; specialite_secondaire: string | null; mode_exercice: string | null; mode_exercice_secondaire: string | null } | null
  moyenne: number | null
  date: string | null
  commentaire: string | null
  duree: { annees: number; auMoins: boolean } | null
  ancienUtilisateur?: boolean
  scores: Record<string, number | null>
}

interface ConfrereTestimonialsProps {
  solutionId: string
  totalEvaluations: number
  initialAvis: Avis[]
  initialTotal: number
  initialTotalPages: number
  labelFonctionnalites?: string | null
}

// Durée telle que déclarée par le médecin. Le questionnaire ne propose que des années
// entières ('Moins d'1 an', '1 an', … '20 ans', 'Plus de 20 ans') : on n'affiche donc
// jamais de mois, qui laisserait croire à une précision jamais saisie.
function formatDuree(duree: { annees: number; auMoins: boolean } | null): string | null {
  if (!duree) return null
  const { annees, auMoins } = duree
  if (annees < 1) return "Moins d'1 an d'utilisation"
  if (auMoins) return `Plus de ${annees} ans d'utilisation`
  return `${annees} an${annees > 1 ? 's' : ''} d'utilisation`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

const PER_PAGE = 10

export default function ConfrereTestimonials({
  solutionId,
  totalEvaluations,
  initialAvis,
  initialTotal,
  initialTotalPages,
  labelFonctionnalites,
}: ConfrereTestimonialsProps) {
  const CRITERE_LABELS = getCritereLabels(labelFonctionnalites)
  const [avis, setAvis] = useState<Avis[]>(initialAvis)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [tri, setTri] = useState<TriAvis>('date')

  const fetchPage = useCallback(async (newPage: number, newTri: TriAvis) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/solutions/${solutionId}/avis?page=${newPage}&limit=${PER_PAGE}&tri=${newTri}`
      )
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setAvis(data.avis)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setPage(data.page)
    } catch {
      // Fallback: keep current state
    } finally {
      setLoading(false)
    }
  }, [solutionId])

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    document.getElementById('temoignages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    fetchPage(newPage, tri)
  }

  const handleTriChange = (newTri: TriAvis) => {
    setTri(newTri)
    fetchPage(1, newTri)
  }

  if (total === 0 && initialAvis.length === 0) return null

  return (
    <section className="bg-white rounded-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-navy">
          Témoignages de confrères ({total})
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Trier par</span>
          <Select
            size="sm"
            fullWidth={false}
            aria-label="Trier les témoignages"
            value={tri}
            onChange={(e) => handleTriChange(e.target.value as TriAvis)}
          >
            <option value="date">Avis les plus récents</option>
            <option value="date_asc">Avis les plus anciens</option>
            <option value="note">Meilleures notes</option>
            <option value="note_asc">Pires notes</option>
          </Select>
        </div>
      </div>

      {/* Liste des avis */}
      <div className={`divide-y divide-gray-50 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {avis.map((item) => (
          <div key={item.id} className="px-6 py-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Colonne gauche : profil + commentaire */}
              <div className="flex-1 min-w-0">
                {/* Profil */}
                <div className="flex items-start gap-3 mb-3">
                  {item.user?.portrait ? (
                    <img
                      src={item.user.portrait}
                      alt=""
                      className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-bold text-navy">
                        {getDisplayName(item.user)[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">
                      {getDisplayName(item.user)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(() => {
                        // Mode(s) et spécialité(s) : primaire + secondaire éventuel, joints par « & »
                        const modes = [item.user?.mode_exercice, item.user?.mode_exercice_secondaire]
                          .filter(Boolean)
                          .join(' & ')
                        const specialites = [item.user?.specialite, item.user?.specialite_secondaire]
                          .map((s) => resolveSpecialite(s ?? null))
                          .filter(Boolean)
                          .join(' & ')
                        return [modes, specialites].filter(Boolean).join(' · ')
                      })()}
                    </p>
                    {item.duree != null && (
                      <p className="text-xs text-accent-blue mt-0.5">
                        {formatDuree(item.duree)}
                        {item.ancienUtilisateur && (
                          <span className="ml-1.5 inline-block bg-gray-100 text-gray-500 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                            ancien utilisateur
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Note + date */}
                <div className="flex items-center gap-3 mb-3">
                  {item.moyenne != null && (
                    <StarRating rating={item.moyenne} size="sm" />
                  )}
                  {item.date && (
                    <span className="text-xs text-gray-400">
                      {formatDate(item.date)}
                    </span>
                  )}
                </div>

                {/* Commentaire */}
                {item.commentaire && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.commentaire}
                  </p>
                )}
              </div>

              {/* Colonne droite : notes par critère */}
              <div className="md:w-[240px] flex-shrink-0">
                <div className="space-y-2.5">
                  {CRITERE_ORDER.map((key) => {
                    const note = item.scores[key]
                    if (note == null) return null
                    return (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 truncate">
                          {CRITERE_LABELS[key] || key}
                        </span>
                        <StarRating rating={note} size="sm" />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Boutons numérotés sur desktop, compteur condensé sur mobile */}
          <div className="hidden sm:flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                type="button"
                variant={p === page ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => handlePageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </Button>
            ))}
          </div>
          <span className="sm:hidden text-sm font-medium text-gray-600 px-2">
            {page} / {totalPages}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <span className="hidden sm:inline text-xs text-gray-400 ml-2">
            {page} sur {totalPages}
          </span>
        </div>
      )}
    </section>
  )
}
