export const revalidate = 3600

import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getVideos, getVideoRubriques } from '@/lib/db/misc'

export const metadata: Metadata = {
  title: 'Stories & Tutos — 100 000 Médecins',
  description: 'Tutoriels et conseils vidéo pour les médecins libéraux sur les outils numériques de santé.',
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

function VideoCard({ video }: { video: { id: string; titre: string | null; url: string | null; vignette: string | null } }) {
  const youtubeId = video.url ? getYouTubeId(video.url) : null
  return (
    <div className="group flex flex-col">
      <div className="relative rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 bg-surface-light">
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
          <img src={video.vignette} alt={video.titre ?? ''} className="w-full aspect-[9/16] object-cover" />
        ) : (
          <div className="w-full aspect-[9/16] flex items-center justify-center">
            <span className="text-gray-400 text-xs">Vidéo</span>
          </div>
        )}
      </div>
      {video.titre && (
        <h3 className="mt-2 text-xs font-bold text-navy line-clamp-2">{video.titre}</h3>
      )}
    </div>
  )
}

export default async function StoriesTutosPage() {
  const [videos, rubriques] = await Promise.all([
    getVideos({ onlyPublished: true }),
    getVideoRubriques(),
  ])

  // Grouper : videos avec rubrique → par rubrique (ordre rubrique) ; sans rubrique → à la fin
  const videosAvecRubrique = rubriques
    .map((r) => ({ rubrique: r, videos: videos.filter((v) => v.rubrique_id === r.id) }))
    .filter((g) => g.videos.length > 0)

  const videosSansRubrique = videos.filter((v) => !v.rubrique_id)

  const hasRubriques = videosAvecRubrique.length > 0

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <h1 className="text-2xl md:text-3xl font-extrabold text-navy mb-3">Stories & Tutos</h1>
              <p className="text-gray-500 max-w-xl mx-auto">
                Conseils pratiques et tutoriels vidéo pour mieux utiliser vos outils numériques au quotidien.
              </p>
            </div>

            {videos.length === 0 ? (
              <p className="text-gray-400 text-center">Aucune vidéo pour le moment. Revenez bientôt&nbsp;!</p>
            ) : hasRubriques ? (
              <div className="space-y-12">
                {videosAvecRubrique.map(({ rubrique, videos: vids }) => (
                  <div key={rubrique.id}>
                    <h2 className="text-lg font-bold text-navy mb-5 pb-2 border-b border-gray-100">{rubrique.nom}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {vids.map((video) => <VideoCard key={video.id} video={video} />)}
                    </div>
                  </div>
                ))}
                {videosSansRubrique.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-navy mb-5 pb-2 border-b border-gray-100">Autres vidéos</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {videosSansRubrique.map((video) => <VideoCard key={video.id} video={video} />)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {videos.map((video) => <VideoCard key={video.id} video={video} />)}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
