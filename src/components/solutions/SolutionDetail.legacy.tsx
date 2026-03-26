'use client'

import Link from 'next/link'
import { Heart, ExternalLink, ChevronRight } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import RatingBadge from '@/components/ui/RatingBadge'
import Button from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AuthProvider'
import { toggleFavorite } from '@/lib/actions/favorites'
import type { SolutionWithRelations, ResultatWithCritere } from '@/types/models'

interface SolutionDetailProps {
  solution: SolutionWithRelations
  resultats: ResultatWithCritere[]
  dernierAvis: any[]
  categorieId: string
}

export default function SolutionDetail({
  solution,
  resultats,
  dernierAvis,
  categorieId,
}: SolutionDetailProps) {
  const { user } = useAuth()

  // Trouver la note générale
  const noteGenerale = resultats.find(
    (r) => r.critere?.type === 'general' || r.critere?.type === 'synthese'
  )

  const handleFavorite = async () => {
    if (!user) {
      window.location.href = `/connexion?redirect=/solutions/${categorieId}/${solution.id}`
      return
    }
    await toggleFavorite(solution.id)
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="bg-surface-light border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-navy">Accueil</Link>
            <ChevronRight className="w-3 h-3" />
            {solution.categorie && (
              <>
                <Link href={`/solutions/${categorieId}`} className="hover:text-navy">
                  {solution.categorie.nom}
                </Link>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-navy font-medium">{solution.nom}</span>
          </nav>
        </div>
      </div>

      {/* Hero solution */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Logo + infos */}
            <div className="flex-1">
              <div className="flex items-start gap-5 mb-6">
                {solution.logo_url ? (
                  <img
                    src={solution.logo_url}
                    alt={solution.logo_titre || solution.nom}
                    className="w-20 h-20 rounded-2xl object-contain bg-surface-light p-2 shadow-soft"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                    style={{ backgroundColor: '#4A90D9' }}
                  >
                    {solution.nom.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-navy">{solution.nom}</h1>
                  {solution.editeur && (
                    <Link
                      href={`/editeur/${solution.editeur.id}`}
                      className="text-sm text-accent-blue hover:underline"
                    >
                      {solution.editeur.nom_commercial || solution.editeur.nom}
                    </Link>
                  )}
                  {solution.version && (
                    <span className="text-xs text-gray-400 ml-3">v{solution.version}</span>
                  )}
                </div>
              </div>

              {/* Note globale */}
              {noteGenerale && (
                <div className="flex items-center gap-3 mb-6">
                  <RatingBadge rating={noteGenerale.moyenne_utilisateurs_base5 || 0} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={noteGenerale.moyenne_utilisateurs_base5 || 0} />
                      <span className="text-sm text-gray-500">
                        ({noteGenerale.nb_notes} avis)
                      </span>
                    </div>
                    {noteGenerale.note_redac_base5 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Note rédaction : {noteGenerale.note_redac_base5}/5
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {solution.description && (
                <p className="text-gray-600 leading-relaxed mb-6">{solution.description}</p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" href={`/solution/noter/${categorieId}/${solution.id}`}>
                  Évaluer cette solution
                </Button>
                <button
                  onClick={handleFavorite}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button border border-gray-200 text-gray-600 hover:text-accent-pink hover:border-accent-pink transition-colors text-sm"
                >
                  <Heart className="w-4 h-4" />
                  Favori
                </button>
                {solution.website && (
                  <a
                    href={solution.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-button border border-gray-200 text-gray-600 hover:text-accent-blue hover:border-accent-blue transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Site web
                  </a>
                )}
              </div>
            </div>

            {/* Galerie */}
            {solution.galerie && solution.galerie.length > 0 && (
              <div className="md:w-96 flex-shrink-0">
                <div className="rounded-2xl overflow-hidden shadow-card">
                  <img
                    src={solution.galerie[0].url}
                    alt={solution.galerie[0].titre || `Capture ${solution.nom}`}
                    className="w-full h-auto"
                  />
                </div>
                {solution.galerie.length > 1 && (
                  <div className="flex gap-2 mt-3">
                    {solution.galerie.slice(1, 4).map((img) => (
                      <img
                        key={img.id}
                        src={img.url}
                        alt={img.titre || ''}
                        className="w-20 h-14 rounded-lg object-cover bg-surface-light"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tags */}
      {solution.tags && solution.tags.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-lg font-semibold text-navy mb-4">Fonctionnalités</h2>
          <div className="flex flex-wrap gap-2">
            {solution.tags.map((t) => (
              <span
                key={t.tag?.id}
                className="text-sm bg-surface-light text-gray-600 px-3 py-1 rounded-full"
              >
                {t.tag?.libelle}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Évaluation rédactionnelle */}
      {(solution.evaluation_redac_avis || solution.evaluation_redac_points_forts?.length || solution.evaluation_redac_points_faibles?.length) && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-lg font-semibold text-navy mb-4">Avis de la rédaction</h2>
          <div className="bg-white rounded-card shadow-card p-6 space-y-4">
            {solution.evaluation_redac_avis && (
              <p className="text-gray-600 leading-relaxed">{solution.evaluation_redac_avis}</p>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {solution.evaluation_redac_points_forts?.length ? (
                <div>
                  <h3 className="text-sm font-semibold text-rating-green mb-2">✓ Points forts</h3>
                  <ul className="space-y-1">
                    {solution.evaluation_redac_points_forts.map((p, i) => (
                      <li key={i} className="text-sm text-gray-600">{p}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {solution.evaluation_redac_points_faibles?.length ? (
                <div>
                  <h3 className="text-sm font-semibold text-accent-orange mb-2">✗ Points faibles</h3>
                  <ul className="space-y-1">
                    {solution.evaluation_redac_points_faibles.map((p, i) => (
                      <li key={i} className="text-sm text-gray-600">{p}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {/* Résultats détaillés */}
      {resultats.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-lg font-semibold text-navy mb-4">Notes détaillées</h2>
          <div className="bg-white rounded-card shadow-card divide-y divide-gray-100">
            {resultats
              .filter((r) => r.critere && r.critere.type !== 'synthese')
              .map((resultat) => (
                <div key={resultat.id} className="flex items-center justify-between p-4">
                  <span className="text-sm text-gray-700">
                    {resultat.critere?.nom_court || resultat.critere?.nom_long}
                  </span>
                  <div className="flex items-center gap-3">
                    {resultat.moyenne_utilisateurs_base5 != null && (
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={resultat.moyenne_utilisateurs_base5} size="sm" />
                        <span className="text-sm font-medium text-navy">
                          {resultat.moyenne_utilisateurs_base5}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-gray-400">
                      ({resultat.nb_notes} avis)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Derniers avis */}
      {dernierAvis.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy">Derniers avis</h2>
            <Link
              href={`/solutions/${categorieId}/${solution.id}/evaluations`}
              className="text-sm text-accent-blue hover:underline"
            >
              Voir tous les avis →
            </Link>
          </div>
          <div className="space-y-4">
            {dernierAvis.map((avis: any) => (
              <div key={avis.id} className="bg-white rounded-card shadow-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  {avis.user?.portrait && (
                    <img
                      src={avis.user.portrait}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <span className="text-sm font-medium text-navy">
                      {avis.user?.pseudo || 'Anonyme'}
                    </span>
                    {avis.user?.specialite && (
                      <span className="text-xs text-gray-400 ml-2">
                        {avis.user.specialite}
                      </span>
                    )}
                  </div>
                  {avis.moyenne_utilisateur && (
                    <div className="ml-auto">
                      <RatingBadge rating={avis.moyenne_utilisateur} />
                    </div>
                  )}
                </div>
                {avis.last_date_note && (
                  <p className="text-xs text-gray-400">
                    {new Date(avis.last_date_note).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mot de l'éditeur */}
      {solution.mot_editeur && (
        <section className="max-w-7xl mx-auto px-6 py-8 mb-8">
          <h2 className="text-lg font-semibold text-navy mb-4">Mot de l&apos;éditeur</h2>
          <div className="bg-hero-blue/5 rounded-card p-6">
            <p className="text-gray-600 leading-relaxed italic">{solution.mot_editeur}</p>
          </div>
        </section>
      )}
    </div>
  )
}
