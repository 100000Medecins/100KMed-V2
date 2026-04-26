import type { Metadata } from 'next'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import GlossaireClient from '@/components/GlossaireClient'
import GlossaireSuggestForm from '@/components/GlossaireSuggestForm'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Glossaire — Acronymes de l\'e-Santé · 100000médecins.org',
  description: 'Retrouvez les définitions des acronymes de l\'e-santé : ANS, DMP, INS, PSC, LGC, HDS, RPPS et bien d\'autres.',
}

type Acronyme = {
  id: string
  sigle: string
  definition: string
  description: string | null
  lien: string | null
}

async function getAcronymes(): Promise<Acronyme[]> {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('acronymes')
    .select('id, sigle, definition, description, lien')
    .order('sigle', { ascending: true })
  return (data ?? []) as Acronyme[]
}

async function getUserEmail(): Promise<string | null> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const serviceClient = createServiceRoleClient()
    const { data: profile } = await serviceClient
      .from('users')
      .select('contact_email')
      .eq('id', user.id)
      .single()
    return (profile as { contact_email?: string } | null)?.contact_email || user.email || null
  } catch {
    return null
  }
}

export default async function GlossairePage() {
  const [acronymes, userEmail] = await Promise.all([getAcronymes(), getUserEmail()])
  const letters = Array.from(new Set(acronymes.map(a => a.sigle[0].toUpperCase()))).sort()

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <section className="bg-hero-gradient pt-4 pb-14">
          <div className="max-w-5xl mx-auto px-6 pt-2 pb-0">
            <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Glossaire' }]} variant="light" />
          </div>
          <div className="max-w-5xl mx-auto px-6 text-center mt-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">Glossaire e-Santé</h1>
            <p className="text-white/75 text-lg max-w-xl mx-auto">
              {acronymes.length} acronymes de l'e-santé expliqués simplement.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-10">
          <GlossaireClient acronymes={acronymes} letters={letters} />
          <div id="proposer">
            <GlossaireSuggestForm userEmail={userEmail} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
