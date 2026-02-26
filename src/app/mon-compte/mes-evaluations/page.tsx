'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { deleteSolutionUtilisee } from '@/lib/actions/solutions'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function MesOutilsPage() {
  const { user } = useAuth()
  const [solutions, setSolutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('solutions_utilisees')
      .select('*, solution:solutions(*, editeur:editeurs(*), categorie:categories(*))')
      .eq('user_id', user.id)
      .neq('statut_evaluation', 'ancienne')
      .then(({ data }) => {
        setSolutions(data || [])
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement de vos évaluations...</div>
  }

  return (
    <div>
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
          {solutions.map((su: any) => (
            <div key={su.id} className="bg-white rounded-card shadow-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {su.solution?.logo_url ? (
                    <img
                      src={su.solution.logo_url}
                      alt={su.solution.nom}
                      className="w-10 h-10 rounded-xl object-contain bg-surface-light p-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-sm">
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
                      Statut : {su.statut_evaluation}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/solution/noter/${su.solution?.categorie?.slug}/${su.solution?.slug}`}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-accent-blue transition-colors px-2 py-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Éditer
                  </Link>
                  <button
                    onClick={async () => {
                      if (!confirm('Supprimer cette évaluation ?')) return
                      await deleteSolutionUtilisee(su.id)
                      setSolutions((prev) => prev.filter((s) => s.id !== su.id))
                    }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
