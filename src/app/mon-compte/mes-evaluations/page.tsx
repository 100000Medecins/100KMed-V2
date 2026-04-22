'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { deleteSolutionUtilisee, getEvaluationCompletionMap } from '@/lib/actions/solutions'
import { reconfirmerEvaluation } from '@/lib/actions/evaluation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, CheckCircle, RefreshCw, MessageSquare } from 'lucide-react'

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

function isOlderThanOneYear(dateStr: string | null): boolean {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() > ONE_YEAR_MS
}

export default function MesEvaluationsPage() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const revalideOk = searchParams.get('revalide') === '1'
  const lienErreur = searchParams.get('erreur')
  const [solutions, setSolutions] = useState<any[]>([])
  // map solution_id -> last_date_note
  const [lastDates, setLastDates] = useState<Record<string, string | null>>({})
  // map solution_id -> true si tous les critères de la catégorie sont remplis
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [confirmedId, setConfirmedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    const supabase = createClient()

    Promise.all([
      supabase
        .from('solutions_utilisees')
        .select('*, solution:solutions(*, editeur:editeurs(*), categorie:categories(*))')
        .eq('user_id', user.id)
        .neq('statut_evaluation', 'ancienne'),
      supabase
        .from('evaluations')
        .select('solution_id, last_date_note')
        .eq('user_id', user.id),
      getEvaluationCompletionMap(user.id),
    ]).then(([{ data: sus }, { data: evals }, complMap]) => {
      setSolutions(sus || [])

      const dateMap: Record<string, string | null> = {}
      for (const ev of evals || []) {
        if (ev.solution_id) dateMap[ev.solution_id] = ev.last_date_note
      }

      setLastDates(dateMap)
      setCompletionMap(complMap)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user, authLoading])

  function handleReconfirmer(su: any) {
    startTransition(async () => {
      await reconfirmerEvaluation(su.solution_id)
      // Mettre à jour la date locale pour masquer le bouton immédiatement
      setLastDates((prev) => ({ ...prev, [su.solution_id]: new Date().toISOString() }))
      setConfirmedId(su.id)
      setTimeout(() => setConfirmedId(null), 3000)
    })
  }

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement de vos évaluations...</div>
  }

  return (
    <div>
      {revalideOk && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Votre avis a bien été reconfirmé — merci !
        </div>
      )}
      {lienErreur && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
          Lien invalide ou expiré. Connectez-vous pour revalider votre avis manuellement.
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-navy">Mes évaluations</h1>
        <Button variant="primary" href="/solution/noter" className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Évaluer un logiciel
        </Button>
      </div>

      {solutions.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center">
          <p className="text-gray-500 mb-4">
            Vous n&apos;avez pas encore évalué de logiciel.
          </p>
          <Button variant="primary" href="/solution/noter">
            Évaluer un logiciel
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {solutions.map((su: any) => {
            const lastDate = lastDates[su.solution_id] ?? null
            const showRevalider =
              su.statut_evaluation === 'finalisee' && isOlderThanOneYear(lastDate)

            return (
              <div key={su.id} className="bg-white rounded-card shadow-card p-5">
                {/* Bannière confirmation */}
                {confirmedId === su.id && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4 text-sm">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Votre avis a été reconfirmé — merci !
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Logo + infos */}
                  <div className="flex items-center gap-4">
                    {su.solution?.logo_url ? (
                      <img
                        src={su.solution.logo_url}
                        alt={su.solution.nom}
                        className="w-10 h-10 rounded-xl object-contain bg-surface-light p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-sm shrink-0">
                        {su.solution?.nom?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link
                        href={`/solutions/${su.solution?.categorie?.slug}/${su.solution?.slug}`}
                        className="font-semibold text-navy hover:text-accent-blue transition-colors"
                      >
                        {su.solution?.nom}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {su.statut_evaluation === 'finalisee'
                          ? lastDate
                            ? `Évalué le ${new Date(lastDate).toLocaleDateString('fr-FR')}`
                            : 'Évaluation complète'
                          : su.statut_evaluation === 'instanciee'
                          ? 'En cours'
                          : su.statut_evaluation}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Revalider en 1 clic — uniquement si > 1 an */}
                    {showRevalider && (
                      <button
                        onClick={() => handleReconfirmer(su)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-colors px-3 py-1.5 rounded-lg"
                        title="Confirmer que votre avis est toujours d'actualité"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Revalider mon avis
                      </button>
                    )}

                    {/* Compléter / Modifier ma note */}
                    {!completionMap[su.solution_id] ? (
                      <Link
                        href={`/solution/noter/${su.solution?.categorie?.slug}/${su.solution?.slug}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 transition-colors px-3 py-1.5 rounded-lg"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Compléter mon évaluation
                      </Link>
                    ) : (
                      <Link
                        href={`/solution/noter/${su.solution?.categorie?.slug}/${su.solution?.slug}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-accent-blue hover:bg-accent-blue/5 border border-gray-200 hover:border-accent-blue/30 transition-colors px-3 py-1.5 rounded-lg"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Modifier ma note
                      </Link>
                    )}

                    {/* Modifier le commentaire */}
                    <Link
                      href={`/solution/noter/${su.solution?.categorie?.slug}/${su.solution?.slug}#commentaire`}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-accent-blue hover:bg-accent-blue/5 border border-gray-200 hover:border-accent-blue/30 transition-colors px-3 py-1.5 rounded-lg"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Modifier mon commentaire
                    </Link>

                    {/* Supprimer */}
                    <button
                      onClick={async () => {
                        if (!confirm('Supprimer cette évaluation ?')) return
                        await deleteSolutionUtilisee(su.id)
                        setSolutions((prev) => prev.filter((s) => s.id !== su.id))
                      }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
