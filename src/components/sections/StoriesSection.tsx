import Link from 'next/link'
import type { VideoRow } from '@/lib/db/misc'

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

export default function StoriesSection({ videos }: { videos: VideoRow[] }) {
  if (videos.length === 0) return null

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-extrabold text-navy mb-2">
            Stories & Tutos
          </h2>
          <p className="text-sm text-gray-400 font-medium">
            Conseils pratiques pour vos outils numériques
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {videos.map((video) => {
            const youtubeId = video.url ? getYouTubeId(video.url) : null
            return (
              <div key={video.id} className="group flex flex-col">
                <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 bg-surface-light">
                  {youtubeId ? (
                    <div className="w-full aspect-[9/16]">
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        title={video.titre ?? 'Vidéo'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : video.vignette ? (
                    <img
                      src={video.vignette}
                      alt={video.titre ?? ''}
                      className="w-full aspect-[9/16] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[9/16] flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Vidéo</span>
                    </div>
                  )}
                </div>
                {(video.titre || video.theme) && (
                  <div className="mt-3">
                    {video.theme && (
                      <span className="text-xs font-semibold text-accent-blue uppercase tracking-wider">
                        {video.theme}
                      </span>
                    )}
                    {video.titre && (
                      <h3 className="mt-0.5 text-sm font-bold text-navy">{video.titre}</h3>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-center mt-14">
          <Link
            href="/stories-tutos"
            className="inline-flex items-center gap-2 bg-navy text-white font-semibold px-6 py-3 rounded-full hover:bg-navy/90 transition-colors"
          >
            Voir toutes les vidéos
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
