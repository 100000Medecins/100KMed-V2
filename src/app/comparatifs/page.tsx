import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tous nos comparatifs — 100000médecins.org',
  description: 'Comparez les logiciels médicaux, agendas, IA Scribes et IA Documentaires choisis par des médecins libéraux français.',
}

type CatRow = {
  nom: string
  slug: string | null
  icon: string | null
  image_url: string | null
  groupe_id: string | null
  groupes_categories: { id: string; nom: string; ordre: number } | null
}

type Groupe = {
  id: string
  nom: string
  ordre: number
  categories: CatRow[]
}

async function getCategoriesGroupees(): Promise<Groupe[]> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('categories')
    .select('nom, slug, icon, image_url, groupe_id, groupes_categories(id, nom, ordre)')
    .eq('actif', true)
    .order('position', { ascending: true })

  const rows: CatRow[] = data ?? []
  const map = new Map<string, Groupe>()

  for (const cat of rows) {
    const g = cat.groupes_categories
    const key = g?.id ?? '__aucun__'
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        nom: g?.nom ?? 'Autres',
        ordre: g?.ordre ?? 999,
        categories: [],
      })
    }
    map.get(key)!.categories.push(cat)
  }

  return Array.from(map.values()).sort((a, b) => a.ordre - b.ordre)
}

export default async function ComparatifsPage() {
  const groupes = await getCategoriesGroupees()

  return (
    <>
      <Navbar />
      <main className="pt-[72px]" style={{ backgroundColor: '#CDD5EA' }}>
        <section className="bg-hero-gradient pt-4 pb-14 md:pb-20">
          <div className="max-w-7xl mx-auto px-6 pt-2 pb-0">
            <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Comparatifs' }]} variant="light" />
          </div>
          <div className="max-w-5xl mx-auto px-6 text-center mt-10 md:mt-14">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Tous nos comparatifs</h1>
            <p className="text-white/75 text-lg max-w-xl mx-auto">
              Des comparatifs réalisés par et pour des médecins — sans jargon marketing.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-14">
          <div className="space-y-10">
            {groupes.map((groupe) => (
              <div key={groupe.id}>
                <h2 className="text-sm md:text-xs font-bold md:font-semibold uppercase tracking-wider text-gray-600 md:text-gray-400 mb-5">
                  {groupe.nom}
                </h2>
                <div className="grid grid-cols-2 gap-3 md:gap-5">
                  {groupe.categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/solutions/${cat.slug}`}
                      className="relative overflow-hidden rounded-2xl md:rounded-3xl min-h-[130px] md:min-h-[220px] flex flex-col justify-start p-4 md:p-8 group"
                      style={{ background: 'linear-gradient(135deg, #8BAFC4 0%, #C47A9A 55%, #C9A06A 100%)' }}
                    >
                      {/* Illustration : image uploadée ou emoji en fallback */}
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt=""
                          className="absolute bottom-2 right-2 md:bottom-3 md:right-6 max-h-[75px] md:max-h-[155px] max-w-[45%] w-auto object-contain opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 select-none pointer-events-none"
                        />
                      ) : cat.icon ? (
                        <span className="absolute bottom-2 right-2 md:bottom-4 md:right-6 text-[60px] md:text-[120px] leading-none opacity-25 group-hover:opacity-40 transition-opacity duration-300 select-none">
                          {cat.icon}
                        </span>
                      ) : null}
                      <span className="text-sm md:text-xl font-extrabold text-navy mb-2 md:mb-3 leading-snug relative z-10">{cat.nom}</span>
                      <span className="inline-flex items-center gap-1 bg-white/40 backdrop-blur-sm text-navy font-semibold px-2.5 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm w-fit group-hover:bg-white/60 transition-colors duration-200 relative z-10">
                        Explorer →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
