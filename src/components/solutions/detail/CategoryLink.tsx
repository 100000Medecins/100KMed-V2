import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Categorie } from '@/types/models'

interface CategoryLinkProps {
  categorie: Categorie | null
}

export default function CategoryLink({ categorie }: CategoryLinkProps) {
  if (!categorie) return null

  return (
    <section className="bg-white rounded-card shadow-card p-6">
      <h2 className="text-sm font-bold text-navy mb-3">Catégorie</h2>
      <Link
        href={`/solutions/${categorie.slug}`}
        className="group flex items-center justify-between p-4 bg-surface-light rounded-xl hover:bg-accent-blue/5 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-navy group-hover:text-accent-blue transition-colors">
            {categorie.nom}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Voir toutes les solutions
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-accent-blue transition-colors" />
      </Link>
    </section>
  )
}
