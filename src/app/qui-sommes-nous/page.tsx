import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlugOrNull } from '@/lib/db/pages'
import QuiSommesNousPage from '@/components/QuiSommesNousPage'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlugOrNull('qui-sommes-nous')
  if (!page) return { title: 'Qui sommes-nous ? — 100 000 Médecins' }
  return {
    title: page.titre + ' — 100 000 Médecins',
    description: page.meta_description,
  }
}

export default async function QuiSommesNous() {
  // getPageBySlugOrNull distingue 'page absente en BDD' (null → notFound 404)
  // de 'erreur BDD' (throw → error.tsx). Évite de masquer une panne système
  // derrière un faux 404 (cf incident GRANT 2026-05-29).
  const page = await getPageBySlugOrNull('qui-sommes-nous')
  if (!page) notFound()

  return <QuiSommesNousPage page={page} />
}
