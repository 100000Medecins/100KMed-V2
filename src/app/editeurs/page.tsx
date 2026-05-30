import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { createServiceRoleClient } from '@/lib/supabase/server'
import EditeursListClient, {
  type EditeurCard,
} from '@/components/EditeursListClient'
import EditeurReferencementForm from '@/components/EditeurReferencementForm'

export const revalidate = 3600 // ISR : 1h

export const metadata: Metadata = {
  title: 'Éditeurs de logiciels médicaux — Annuaire',
  description:
    "Retrouvez les éditeurs de logiciels médicaux référencés sur 100 000 Médecins : logiciels métier, agendas, IA, téléconsultation et plus.",
}

async function loadEditeurs(): Promise<EditeurCard[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: editeurs } = await (supabase as any)
    .from('editeurs')
    .select('id, slug, nom, nom_commercial, logo_url, description')
    .eq('affiche_sur_index', true)
    .order('nom', { ascending: true })

  if (!editeurs || editeurs.length === 0) return []

  // Compter les solutions actives par éditeur
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: solutions } = await (supabase as any)
    .from('solutions')
    .select('id_editeur, categorie:categories!inner(actif)')
    .eq('actif', true)
    .eq('categorie.actif', true)

  const countByEd = new Map<string, number>()
  for (const s of (solutions ?? []) as { id_editeur: string | null }[]) {
    if (!s.id_editeur) continue
    countByEd.set(s.id_editeur, (countByEd.get(s.id_editeur) ?? 0) + 1)
  }

  return (editeurs as Array<{
    id: string
    slug: string
    nom: string
    nom_commercial: string | null
    logo_url: string | null
    description: string | null
  }>).map((e) => ({
    slug: e.slug,
    nom: e.nom,
    nom_commercial: e.nom_commercial,
    logo_url: e.logo_url,
    description: e.description,
    nb_solutions: countByEd.get(e.id) ?? 0,
  }))
}

export default async function EditeursPage() {
  const editeurs = await loadEditeurs()

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-5xl mx-auto px-6 pt-4 pb-0">
          <Breadcrumb
            items={[{ label: 'Accueil', href: '/' }, { label: 'Éditeurs' }]}
          />
        </div>

        <div className="max-w-5xl mx-auto px-6 pt-8 pb-24">
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy mb-2">
            Éditeurs de logiciels médicaux
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {editeurs.length} éditeur{editeurs.length > 1 ? 's' : ''} référencé
            {editeurs.length > 1 ? 's' : ''}.
          </p>

          <EditeursListClient editeurs={editeurs} />

          <div id="demande-referencement" className="scroll-mt-24">
            <EditeurReferencementForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
