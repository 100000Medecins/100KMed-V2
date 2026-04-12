'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import type { GalerieItem } from '@/types/models'

function getYoutubeId(url: string): string | null {
  return url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
}

function getVimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url)
}

function getVideoEmbed(url: string): { embedUrl: string; thumbUrl: string | null } | null {
  const ytId = getYoutubeId(url)
  if (ytId) return {
    embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1`,
    thumbUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
  }
  const vimeoId = getVimeoId(url)
  if (vimeoId) return {
    embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
    thumbUrl: null,
  }
  return null
}

interface SolutionGalleryProps {
  images: GalerieItem[]
}

export default function SolutionGallery({ images }: SolutionGalleryProps) {
  const [current, setCurrent] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  if (images.length === 0) return null

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1))

  return (
    <>
    <section className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-bold text-navy">Galerie</h2>
      </div>

      {/* Main image / video */}
      <div className="relative group bg-gray-50 px-4 py-3">
        {isVideoUrl(images[current].url ?? '') ? (() => {
          const info = getVideoEmbed(images[current].url ?? '')
          return (
            <div
              className="w-full aspect-video relative cursor-pointer overflow-hidden rounded"
              onClick={() => setModalOpen(true)}
            >
              {info?.thumbUrl ? (
                <img src={info.thumbUrl} alt={images[current].titre || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-900" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </div>
              </div>
            </div>
          )
        })() : (
        <img
          src={images[current].url ?? undefined}
          alt={images[current].titre || `Capture ${current + 1}`}
          className="w-full h-auto aspect-video object-contain cursor-zoom-in"
          onClick={() => setModalOpen(true)}
        />
        )}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-4 h-4 text-navy" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-4 h-4 text-navy" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-4">
          {images.map((img, i) => {
            const isVideo = isVideoUrl(img.url ?? '')
            const videoInfo = isVideo ? getVideoEmbed(img.url ?? '') : null
            return (
              <button
                key={img.id}
                onClick={() => setCurrent(i)}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors relative ${
                  i === current ? 'border-accent-blue' : 'border-transparent hover:border-gray-200'
                }`}
              >
                {isVideo ? (
                  <>
                    {videoInfo?.thumbUrl ? (
                      <img src={videoInfo.thumbUrl} alt={img.titre || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-800" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </>
                ) : (
                  <img
                    src={img.url ?? undefined}
                    alt={img.titre || ''}
                    className="w-full h-full object-contain"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>

    {/* Modal plein écran */}
    {modalOpen && (
      <div
        className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center cursor-zoom-out"
        onClick={() => setModalOpen(false)}
      >
        {isVideoUrl(images[current].url ?? '') ? (() => {
          const info = getVideoEmbed(images[current].url ?? '')
          return info ? (
            <div className="w-[90vw] max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
              <iframe
                src={info.embedUrl}
                className="w-full h-full rounded-lg shadow-2xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null
        })() : (
          <img
            src={images[current].url ?? undefined}
            alt={images[current].titre || `Capture ${current + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>
    )}
    </>
  )
}
