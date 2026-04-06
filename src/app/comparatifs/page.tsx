import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'

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
    <main className="max-w-5xl mx-auto px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-navy mb-3">Tous nos comparatifs</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Des comparatifs réalisés par et pour des médecins libéraux — sans jargon marketing.
        </p>
      </div>

      <div className="space-y-12">
        {groupes.map((groupe) => (
          <div key={groupe.id}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              {groupe.nom}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {groupe.categories.map((cat) => (
                <a
                  key={cat.slug}
                  href={`/solutions/${cat.slug}`}
                  className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-card hover:border-accent-blue/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {cat.icon && (
                    <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                  )}
                  <span className="text-sm font-semibold text-navy leading-snug">{cat.nom}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
