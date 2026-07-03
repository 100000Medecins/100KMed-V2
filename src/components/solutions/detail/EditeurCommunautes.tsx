import Link from 'next/link'
import { Users, ExternalLink } from 'lucide-react'
import type { CommunautePublique } from '@/lib/db/solution-communautes'
import { COMMUNAUTE_TYPE_META as TYPE_META } from './communauteTypeMeta'

export type EditeurCommunautesGroup = {
  solutionNom: string
  solutionHref: string | null
  communautes: CommunautePublique[]
}

/**
 * Bloc agrégé des communautés d'utilisateurs de toutes les solutions d'un éditeur
 * (page `/editeur/[slug]`). Réutilise les communautés approuvées du module
 * `solution_communautes` — pas de donnée dédiée. Ne rend rien si aucune communauté.
 */
export default function EditeurCommunautes({ groups }: { groups: EditeurCommunautesGroup[] }) {
  const withCommunautes = groups.filter((g) => g.communautes.length > 0)
  if (withCommunautes.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2.5 mb-6">
        <Users className="w-5 h-5 text-accent-blue shrink-0" />
        <h2 className="text-lg font-semibold text-navy">Communautés d&apos;utilisateurs</h2>
      </div>

      <div className="space-y-4">
        {withCommunautes.map((group) => (
          <div key={group.solutionNom} className="bg-white rounded-card shadow-card overflow-hidden">
            <div className="px-6 pt-5 pb-3">
              {group.solutionHref ? (
                <Link href={group.solutionHref} className="text-sm font-bold text-navy hover:text-accent-blue transition-colors">
                  {group.solutionNom}
                </Link>
              ) : (
                <span className="text-sm font-bold text-navy">{group.solutionNom}</span>
              )}
            </div>
            <ul className="divide-y divide-gray-50 border-t border-gray-50">
              {group.communautes.map((c) => {
                const meta = TYPE_META[c.type] ?? TYPE_META.autre
                const Icon = meta.Icon
                return (
                  <li key={c.id}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{c.nom}</p>
                        {c.description && (
                          <p className="text-xs text-gray-500 truncate">{c.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{meta.label}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
