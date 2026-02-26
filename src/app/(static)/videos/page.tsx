import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getVideos } from '@/lib/db/misc'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vidéos e-santé',
  description: "Découvrez nos vidéos sur les outils numériques pour les professionnels de santé.",
}

export default async function VideosPage() {
  const videos = await getVideos()

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-navy mb-8">Vidéos e-santé</h1>

          {videos.length === 0 ? (
            <p className="text-gray-500">Aucune vidéo pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((video) => (
                <div key={video.id} className="bg-white rounded-card shadow-card overflow-hidden">
                  {video.vignette && (
                    <img
                      src={video.vignette}
                      alt={video.titre || ''}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-5">
                    {video.titre && (
                      <h2 className="font-semibold text-navy mb-2">{video.titre}</h2>
                    )}
                    {video.description && (
                      <p className="text-sm text-gray-600 mb-3">{video.description}</p>
                    )}
                    {video.url && (
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent-blue hover:underline"
                      >
                        Voir la vidéo →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
