'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { toggleFavorite } from '@/lib/actions/favorites'
import { Heart } from 'lucide-react'
import Link from 'next/link'

export default function MesFavorisPage() {
  const { user } = useAuth()
  const [favoris, setFavoris] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('solutions_favorites')
      .select('*, solution:solutions(*, editeur:editeurs(*), categorie:categories(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFavoris(data || [])
        setLoading(false)
      })
  }, [user])

  const handleRemove = async (solutionId: string) => {
    await toggleFavorite(solutionId)
    setFavoris((prev) => prev.filter((f) => f.solution_id !== solutionId))
  }

  if (loading) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement de vos favoris...</div>
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-6">Mes favoris</h1>

      {favoris.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center">
          <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500">Vous n&apos;avez pas encore de favoris.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {favoris.map((fav: any) => (
            <div key={`${fav.user_id}-${fav.solution_id}`} className="bg-white rounded-card shadow-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {fav.solution?.logo_url ? (
                    <img
                      src={fav.solution.logo_url}
                      alt={fav.solution.nom}
                      className="w-10 h-10 rounded-xl object-contain bg-surface-light p-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-accent-pink/10 flex items-center justify-center text-accent-pink font-bold text-sm">
                      {fav.solution?.nom?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <Link
                    href={`/solutions/${fav.solution?.categorie?.slug}/${fav.solution?.slug}`}
                    className="font-semibold text-navy hover:text-accent-blue transition-colors"
                  >
                    {fav.solution?.nom}
                  </Link>
                </div>
                <button
                  onClick={() => handleRemove(fav.solution_id)}
                  className="text-accent-pink hover:text-red-600 transition-colors p-2"
                >
                  <Heart className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
