import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getVideos } from '@/lib/db/misc'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vidéos e-santé',
  description: "Découvrez nos vidéos sur les outils numériques pour les professionnels de santé.",
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  )
  return match ? match[1] : null
}

export default async function VideosPage() {
  const videos = await getVideos()

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <h1 className="text-2xl md:text-3xl font-extrabold text-navy mb-2">
                Les enjeux de l&apos;e-santé
              </h1>
              <p className="text-sm text-gray-400 font-medium">
                Les conseils du Dr Azerty
              </p>
            </div>

            {videos.length === 0 ? (
              <p className="text-gray-500 text-center">Aucune vidéo pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {videos.map((video) => {
                  const youtubeId = video.url ? getYouTubeId(video.url) : null

                  return (
                    <div key={video.id} className="group">
                      <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300">
                        {youtubeId ? (
                          <div className="w-full aspect-[9/16]">
                            <iframe
                              src={`https://www.youtube.com/embed/${youtubeId}`}
                              title={video.titre || 'Vidéo'}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full border-0"
                            />
                          </div>
                        ) : video.vignette ? (
                          <img
                            src={video.vignette}
                            alt={video.titre || ''}
                            className="w-full aspect-[9/16] object-cover"
                          />
                        ) : null}
                      </div>
                      {video.titre && (
                        <h4 className="mt-4 text-xs font-bold tracking-widest text-navy uppercase text-center">
                          {video.titre}
                        </h4>
                      )}
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
