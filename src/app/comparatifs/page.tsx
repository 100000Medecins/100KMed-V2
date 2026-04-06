import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tous nos comparatifs — 100000médecins.org',
  description: 'Comparez les logiciels médicaux, agendas, IA Scribes et IA Documentaires choisis par des médecins libéraux français.',
}

type CatRow = {
  nom: string
  slug: string | null
  icon: string | null
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
    .select('nom, slug, icon, groupe_id, groupes_categories(id, nom, ordre)')
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
      <main className="pt-[72px]">
        <section className="bg-surface-light py-12 md:py-16">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h1 className="text-3xl font-bold text-navy mb-3">Tous nos comparatifs</h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Des comparatifs réalisés par et pour des médecins libéraux — sans jargon marketing.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-12">
          <div className="space-y-12">
            {groupes.map((groupe) => (
              <div key={groupe.id}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-5 text-center">
                  {groupe.nom}
                </h2>
                <div className="flex flex-wrap justify-center gap-4">
                  {groupe.categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/solutions/${cat.slug}`}
                      className="flex flex-col items-center justify-center gap-3 px-6 py-6 rounded-2xl border-2 border-gray-100 bg-white shadow-card hover:border-accent-blue/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-40 sm:w-52"
                    >
                      {cat.icon && <span className="text-4xl">{cat.icon}</span>}
                      <span className="text-sm font-semibold text-navy leading-snug text-center">{cat.nom}</span>
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
