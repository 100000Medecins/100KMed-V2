import { ExternalLink } from 'lucide-react'
import type { Editeur } from '@/types/models'

interface PublisherWordProps {
  motEditeur: string | null
  editeur: Editeur | null
}

export default function PublisherWord({ motEditeur, editeur }: PublisherWordProps) {
  if (!motEditeur) return null

  return (
    <section className="max-w-7xl mx-auto">
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <h2 className="text-lg font-bold text-navy mb-6">Mot de l&apos;éditeur</h2>
        <div className="flex flex-col md:flex-row gap-6">
          {editeur && (
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              {editeur.logo_url ? (
                <img
                  src={editeur.logo_url}
                  alt={editeur.nom_commercial || editeur.nom}
                  className="w-16 h-16 rounded-xl object-contain bg-surface-light p-2"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-lg">
                  {(editeur.nom_commercial || editeur.nom).substring(0, 2).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-semibold text-navy text-center">
                {editeur.nom_commercial || editeur.nom}
              </p>
            </div>
          )}
          <div className="flex-1">
            <p
              className="text-gray-600 leading-relaxed italic whitespace-pre-line"
              dangerouslySetInnerHTML={{
                __html: `\u201C${motEditeur.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}\u201D`,
              }}
            />
            {editeur?.website_url && (
              <a
                href={editeur.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm text-accent-blue hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Visiter le site de l&apos;éditeur
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
