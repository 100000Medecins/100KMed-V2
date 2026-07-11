import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/server'
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
  const supabase = createPublicClient()
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
        <section className="bg-hero-gradient pb-14 md:pb-20">
          <div className="max-w-7xl mx-auto px-6 pt-4 pb-0 min-[1150px]:pl-[200px]">
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
                      className="relative overflow-hidden rounded-2xl md:rounded-3xl min-h-[140px] md:min-h-[220px] flex flex-col items-center justify-between p-4 md:p-8 group"
                      style={{ background: 'linear-gradient(135deg, #148080 0%, #7c35c0 55%, #1e4da0 100%)' }}
                    >
                      <span className="text-[12px] md:text-xl font-extrabold text-white text-center leading-snug relative z-10">{cat.nom}</span>

                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt=""
                          className={`${cat.slug === 'agendas-medicaux' ? 'max-h-[60px]' : cat.slug === 'logiciels-metier' ? 'max-h-[79px]' : 'max-h-[69px]'} md:max-h-[125px] max-w-[70%] w-auto object-contain opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 select-none pointer-events-none`}
                        />
                      ) : cat.icon ? (
                        <span className="text-[50px] md:text-[100px] leading-none opacity-30 group-hover:opacity-50 transition-opacity duration-300 select-none">
                          {cat.icon}
                        </span>
                      ) : null}
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
