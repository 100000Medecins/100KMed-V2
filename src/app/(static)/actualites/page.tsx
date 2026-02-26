import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getActualites } from '@/lib/db/misc'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Actualités',
  description: "Les dernières actualités de la e-santé et des outils numériques pour médecins.",
}

export default async function ActualitesPage() {
  const actualites = await getActualites()

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-navy mb-8">Actualités</h1>

          {actualites.length === 0 ? (
            <p className="text-gray-500">Aucune actualité pour le moment.</p>
          ) : (
            <div className="space-y-6">
              {actualites.map((actu) => (
                <article key={actu.id} className="bg-white rounded-card shadow-card p-6">
                  <div className="flex gap-4">
                    {actu.thumbnail && (
                      <img
                        src={actu.thumbnail}
                        alt=""
                        className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                      />
                    )}
                    <div>
                      {actu.label && (
                        <span className="text-xs font-semibold text-accent-blue uppercase">
                          {actu.label}
                        </span>
                      )}
                      <h2 className="text-lg font-semibold text-navy mt-1">
                        {actu.titre}
                      </h2>
                      {actu.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {actu.description}
                        </p>
                      )}
                      {actu.created_at && (
                        <time className="text-xs text-gray-400 mt-2 block">
                          {new Date(actu.created_at).toLocaleDateString('fr-FR')}
                        </time>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
