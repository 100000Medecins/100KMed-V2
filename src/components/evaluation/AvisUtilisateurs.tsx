'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import RatingBadge from '@/components/ui/RatingBadge'
import type { AvisUtilisateur } from '@/types/models'

interface AvisUtilisateursProps {
  avis: AvisUtilisateur[]
  solutionId: string
  categorieId: string
  critereTri: string
}

export default function AvisUtilisateurs({
  avis,
  solutionId,
  categorieId,
  critereTri,
}: AvisUtilisateursProps) {
  const router = useRouter()
  const pathname = usePathname()

  const changeTri = (tri: string) => {
    const params = new URLSearchParams()
    params.set('tri', tri)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div>
      {/* Tri */}
      <div className="flex gap-3 mb-6">
        {[
          { value: 'date', label: 'Plus récents' },
          { value: 'note', label: 'Meilleures notes' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => changeTri(option.value)}
            className={`text-sm px-4 py-2 rounded-full border transition-colors ${
              critereTri === option.value
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Liste des avis */}
      {avis.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          Aucun avis pour le moment.
        </p>
      ) : (
        <div className="space-y-4">
          {avis.map((item) => (
            <div key={item.idEvaluation} className="bg-white rounded-card shadow-card p-5">
              <div className="flex items-center gap-3 mb-3">
                {item.user?.portrait && (
                  <img
                    src={item.user.portrait}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium text-navy">
                    {item.user?.pseudo || 'Anonyme'}
                  </span>
                  {item.user?.specialite && (
                    <p className="text-xs text-gray-400">{item.user.specialite}</p>
                  )}
                </div>
                {item.lastDateNote && (
                  <span className="text-xs text-gray-400">
                    {new Date(item.lastDateNote).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              {/* Notes par critère */}
              {item.avisGeneral && item.avisGeneral.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {item.avisGeneral.map((note) => (
                    <div
                      key={note.nomCourt}
                      className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-1.5"
                    >
                      <span className="text-xs text-gray-500 truncate mr-2">
                        {note.nomCourt}
                      </span>
                      <RatingBadge rating={note.note} size="sm" />
                    </div>
                  ))}
                </div>
              )}

              {/* Synthèse */}
              {item.avisSynthese?.commentaire && (
                <p className="text-sm text-gray-600 mt-2 italic">
                  &ldquo;{item.avisSynthese.commentaire}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
