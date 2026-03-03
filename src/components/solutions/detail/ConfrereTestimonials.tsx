'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'

// Map identifiant_tech → nom d'affichage
const CRITERE_LABELS: Record<string, string> = {
  interface: 'Interface utilisateur',
  fonctionnalites: 'Fonctionnalités',
  fiabilite: 'Fiabilité',
  editeur: 'Éditeur',
  qualite_prix: 'Rapport qualité/prix',
}

const CRITERE_ORDER = ['interface', 'fonctionnalites', 'fiabilite', 'editeur', 'qualite_prix']

interface Avis {
  id: string
  userId: string
  user: { pseudo: string | null; portrait: string | null; specialite: string | null; mode_exercice: string | null } | null
  moyenne: number | null
  date: string | null
  commentaire: string | null
  dureeMois: number | null
  ancienUtilisateur?: boolean
  scores: Record<string, number | null>
}

interface ConfrereTestimonialsProps {
  solutionId: string
  totalEvaluations: number
  initialAvis: Avis[]
  initialTotal: number
  initialTotalPages: number
}

function formatDuree(mois: number | null): string | null {
  if (mois == null) return null
  if (mois < 1) return "Moins d'1 mois d'utilisation"
  if (mois < 12) return `${mois} mois d'utilisation`
  const annees = Math.floor(mois / 12)
  const resteM = mois % 12
  if (resteM === 0) return `${annees} an${annees > 1 ? 's' : ''} d'utilisation`
  return `${annees} an${annees > 1 ? 's' : ''} et ${resteM} mois d'utilisation`
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
}: ConfrereTestimonialsProps) {
  const [avis, setAvis] = useState<Avis[]>(initialAvis)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [tri, setTri] = useState<'date' | 'note'>('date')

  const fetchPage = useCallback(async (newPage: number, newTri: 'date' | 'note') => {
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
    fetchPage(newPage, tri)
  }

  const handleTriChange = (newTri: 'date' | 'note') => {
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
          <select
            value={tri}
            onChange={(e) => handleTriChange(e.target.value as 'date' | 'note')}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
          >
            <option value="date">Avis les plus récents</option>
            <option value="note">Meilleures notes</option>
          </select>
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
                        {(item.user?.pseudo || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">
                      {item.user?.pseudo || 'Anonyme'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.user?.mode_exercice && `${item.user.mode_exercice}`}
                      {item.user?.mode_exercice && item.user?.specialite && ' · '}
                      {item.user?.specialite}
                    </p>
                    {item.dureeMois != null && (
                      <p className="text-xs text-accent-blue mt-0.5">
                        {formatDuree(item.dureeMois)}
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
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-accent-blue text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs text-gray-400 ml-2">
            {page} sur {totalPages}
          </span>
        </div>
      )}
    </section>
  )
}
