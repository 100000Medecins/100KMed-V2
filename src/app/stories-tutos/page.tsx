export const revalidate = 3600

import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getVideos } from '@/lib/db/misc'

export const metadata: Metadata = {
  title: 'Stories & Tutos — 100 000 Médecins',
  description: 'Tutoriels et conseils vidéo pour les médecins libéraux sur les outils numériques de santé.',
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

export default async function StoriesTutosPage() {
  const videos = await getVideos({ onlyPublished: true })

  const themes = Array.from(new Set(videos.map((v) => v.theme).filter(Boolean))) as string[]

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <h1 className="text-2xl md:text-3xl font-extrabold text-navy mb-3">
                Stories & Tutos
              </h1>
              <p className="text-gray-500 max-w-xl mx-auto">
                Conseils pratiques et tutoriels vidéo pour mieux utiliser vos outils numériques au quotidien.
              </p>
            </div>

            {/* Filtres par thème */}
            {themes.length > 1 && (
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {themes.map((theme) => (
                  <span
                    key={theme}
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-surface-light text-navy border border-gray-200"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}

            {videos.length === 0 ? (
              <p className="text-gray-400 text-center">Aucune vidéo pour le moment. Revenez bientôt&nbsp;!</p>
            ) : (
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
                      <div className="mt-4 flex-1">
                        {video.theme && (
                          <span className="text-xs font-semibold text-accent-blue uppercase tracking-wider">
                            {video.theme}
                          </span>
                        )}
                        {video.titre && (
                          <h3 className="mt-1 text-sm font-bold text-navy">{video.titre}</h3>
                        )}
                        {video.description && (
                          <p className="mt-1 text-xs text-gray-500 line-clamp-2">{video.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
