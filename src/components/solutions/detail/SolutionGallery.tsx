'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { GalerieItem } from '@/types/models'

interface SolutionGalleryProps {
  images: GalerieItem[]
}

export default function SolutionGallery({ images }: SolutionGalleryProps) {
  const [current, setCurrent] = useState(0)

  if (images.length === 0) return null

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1))

  return (
    <section className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-bold text-navy">Galerie</h2>
      </div>

      {/* Main image */}
      <div className="relative group">
        <img
          src={images[current].url}
          alt={images[current].titre || `Capture ${current + 1}`}
          className="w-full h-auto aspect-video object-contain bg-gray-50"
        />
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
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                i === current ? 'border-accent-blue' : 'border-transparent hover:border-gray-200'
              }`}
            >
              <img
                src={img.url}
                alt={img.titre || ''}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
