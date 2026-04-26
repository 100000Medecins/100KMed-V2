'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'
import RatingBadge from '@/components/ui/RatingBadge'

function ComparerContent() {
  const searchParams = useSearchParams()
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [solutions, setSolutions] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultats, setResultats] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Étape 1 : IDs des 5 critères de notation (nom_capital IS NOT NULL exclut nps/synthese)
    s.from('criteres').select('id').not('nom_capital', 'is', null).then(({ data: criteresMajeurs }: { data: { id: string }[] | null }) => {
      const critereIds = (criteresMajeurs || []).map((c: { id: string }) => c.id)

      Promise.all([
        s
          .from('solutions')
          .select('*, editeur:editeurs(*), categorie:categories(*)')
          .in('id', ids),
        // Étape 2 : resultats filtrés aux critères majeurs uniquement
        ...ids.map((id: string) =>
          critereIds.length > 0
            ? s
                .from('resultats')
                .select('*, critere:criteres(*)')
                .eq('solution_id', id)
                .in('critere_id', critereIds)
            : Promise.resolve({ data: [] })
        ),
      ]).then(([solRes, ...resResults]: [{ data: unknown[] | null }, ...{ data: unknown[] | null }[]]) => {
        setSolutions((solRes.data as unknown[]) || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resMap: Record<string, any[]> = {}
        ids.forEach((id: string, i: number) => {
          resMap[id] = (resResults[i]?.data as unknown[]) || []
        })
        setResultats(resMap)
        setLoading(false)
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-gray-400">Chargement de la comparaison...</div>
      </div>
    )
  }

  if (solutions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-navy mb-4">Comparer des solutions</h1>
        <p className="text-gray-500">
          Sélectionnez des solutions à comparer depuis les pages de catégories.
        </p>
      </div>
    )
  }

  // Collecter tous les critères uniques
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCriteres = new Map<string, any>()
  Object.values(resultats).forEach((res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.forEach((r: any) => {
      if (r.critere && !allCriteres.has(r.critere.id)) {
        allCriteres.set(r.critere.id, r.critere)
      }
    })
  })

  return (
    <div>
      <div className="bg-white/70 border-b border-gray-200/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-2.5 text-xs text-gray-400 flex items-center gap-1.5">
          <a href="/" className="hover:text-navy transition-colors">Accueil</a>
          <span className="text-gray-300">›</span>
          <span className="font-semibold text-navy">Comparaison</span>
        </div>
      </div>
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-navy mb-8">Comparaison</h1>

      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-card shadow-card">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="p-4 text-left text-sm font-semibold text-gray-500 w-48">
                Critère
              </th>
              {solutions.map((sol) => (
                <th key={sol.id} className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {sol.logo_url ? (
                      <img
                        src={sol.logo_url}
                        alt={sol.nom}
                        className="w-10 h-10 rounded-xl object-contain bg-surface-light p-1"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-sm">
                        {sol.nom?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-navy">{sol.nom}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from(allCriteres.values())
              .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
              .map((critere) => (
                <tr key={critere.id} className="hover:bg-surface-light/50">
                  <td className="p-4 text-sm text-gray-700">
                    {critere.nom_court || critere.nom_long}
                  </td>
                  {solutions.map((sol) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const resultat = resultats[sol.id]?.find(
                      (r: any) => r.critere_id === critere.id
                    )
                    return (
                      <td key={sol.id} className="p-4 text-center">
                        {resultat?.moyenne_utilisateurs_base5 != null ? (
                          <div className="flex items-center justify-center gap-2">
                            <RatingBadge rating={resultat.moyenne_utilisateurs_base5} size="sm" />
                            <span className="text-xs text-gray-400">
                              ({resultat.nb_notes})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  )
}

export default function ComparerPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-gray-400">Chargement...</div>
            </div>
          }
        >
          <ComparerContent />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
