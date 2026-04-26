'use client'

import { useEffect, useState, useTransition } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { FlaskConical, ExternalLink, CheckCircle, Loader2, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import type { EtudeClinique } from '@/lib/actions/etudes-cliniques'
import { sanitizeHtml } from '@/lib/sanitize'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

export default function EtudesCliniquesPublic() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [etudes, setEtudes] = useState<EtudeClinique[]>([])
  const [fetching, setFetching] = useState(true)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [modalEtude, setModalEtude] = useState<EtudeClinique | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/connexion'); return }

    const load = async () => {
      try {
        const { getEtudesActives } = await import('@/lib/actions/etudes-cliniques')
        setEtudes(await getEtudesActives())
      } finally {
        setFetching(false)
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  // Fermer la modale / zoom avec Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedImage) { setZoomedImage(null); return }
        if (modalEtude) setModalEtude(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [modalEtude, zoomedImage])

  const handleEnSavoirPlus = (etude: EtudeClinique) => {
    startTransition(async () => {
      const { demanderInfoEtude } = await import('@/lib/actions/etudes-cliniques')
      await demanderInfoEtude(etude.id, etude.titre)
      setSentIds((prev) => new Set([...Array.from(prev), etude.id]))
    })
  }

  if (loading || fetching) {
    return <div className="animate-pulse text-gray-400 text-sm">Chargement…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="w-6 h-6 text-teal-600" />
        <div>
          <h1 className="text-xl font-bold text-navy">Études cliniques</h1>
          <p className="text-sm text-gray-500">
            Participez aux études cliniques avec{' '}
            <a
              href="https://www.digitalmedicalhub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline font-medium"
            >
              le Digital Medical Hub
            </a>
          </p>
        </div>
      </div>

      {etudes.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-10 text-center text-gray-400 text-sm">
          Aucune étude clinique disponible pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {etudes.map((etude) => (
            <EtudeCard
              key={etude.id}
              etude={etude}
              sent={sentIds.has(etude.id)}
              onEnSavoirPlus={() => handleEnSavoirPlus(etude)}
              onExpand={() => setModalEtude(etude)}
            />
          ))}
        </div>
      )}

      {/* Zoom image plein écran */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedImage}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modale */}
      {modalEtude && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setModalEtude(null)}
        >
          <div
            className="bg-white rounded-card shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-navy text-lg">{modalEtude.titre}</h2>
                <button
                  onClick={() => setModalEtude(null)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalEtude.description && (
                <div
                  className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(modalEtude.description) }}
                />
              )}

              {modalEtude.images.length > 0 && (
                <ModalImageCarousel
                  images={modalEtude.images}
                  titre={modalEtude.titre}
                  onZoom={(src) => setZoomedImage(src)}
                />
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                {modalEtude.lien && (
                  <a
                    href={modalEtude.lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-accent-blue hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Consulter la page de l'étude
                  </a>
                )}
                {sentIds.has(modalEtude.id) ? (
                  <div className="flex items-center gap-2 text-sm text-teal-600 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Votre demande a été envoyée
                  </div>
                ) : (
                  <ModalEnSavoirPlusButton
                    onEnSavoirPlus={() => handleEnSavoirPlus(modalEtude)}
                    onSent={() => setSentIds((prev) => new Set([...Array.from(prev), modalEtude.id]))}
                    etudeId={modalEtude.id}
                    etudeTitre={modalEtude.titre}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalImageCarousel({ images, titre, onZoom }: { images: string[]; titre: string; onZoom: (src: string) => void }) {
  const [imgIndex, setImgIndex] = useState(0)
  return (
    <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden group">
      <button
        type="button"
        className="block w-full h-full"
        onClick={() => onZoom(images[imgIndex])}
        title="Agrandir l'image"
      >
        <img src={images[imgIndex]} alt={titre} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
        </div>
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setImgIndex((i) => (i - 1 + images.length) % images.length) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setImgIndex((i) => (i + 1) % images.length) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setImgIndex(i) }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ModalEnSavoirPlusButton({
  onEnSavoirPlus,
  onSent,
  etudeId,
  etudeTitre,
}: {
  onEnSavoirPlus: () => void
  onSent: () => void
  etudeId: string
  etudeTitre: string
}) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(async () => { onEnSavoirPlus(); })}
      disabled={isPending}
      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
    >
      {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
      Je souhaite en savoir plus
    </button>
  )
}

const DESCRIPTION_MAX_CHARS = 150

function EtudeCard({
  etude,
  sent,
  onEnSavoirPlus,
  onExpand,
}: {
  etude: EtudeClinique
  sent: boolean
  onEnSavoirPlus: () => void
  onExpand: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [imgIndex, setImgIndex] = useState(0)

  const plainText = etude.description ? stripHtml(etude.description) : ''
  const isTruncated = plainText.length > DESCRIPTION_MAX_CHARS
  const truncatedText = isTruncated ? plainText.slice(0, DESCRIPTION_MAX_CHARS) + '…' : plainText

  return (
    <div
      className="bg-white rounded-card shadow-card overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
      onClick={onExpand}
    >
      <div className="p-5 flex flex-col flex-1 gap-3">
        <h2 className="font-bold text-navy text-base">{etude.titre}</h2>

        {plainText && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {truncatedText}
            {isTruncated && (
              <span className="text-accent-blue font-medium ml-1">Voir plus</span>
            )}
          </p>
        )}

        {etude.images.length > 0 && (
          <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
            <img
              src={etude.images[imgIndex]}
              alt={etude.titre}
              className="w-full h-full object-cover"
            />
            {etude.images.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {etude.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === imgIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-2 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {etude.lien && (
            <a
              href={etude.lien}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-accent-blue hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Consulter la page de l'étude
            </a>
          )}

          {sent ? (
            <div className="flex items-center gap-2 text-sm text-teal-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              Votre demande a été envoyée
            </div>
          ) : (
            <button
              onClick={() => startTransition(onEnSavoirPlus)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Je souhaite en savoir plus
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
