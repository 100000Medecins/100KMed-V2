import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlugOrNull } from '@/lib/db/pages'
import PageStatique from '@/components/PageStatique'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlugOrNull('lancement-100k')
  if (!page) return { title: 'Lancement 100K — 100 000 Médecins' }
  return {
    title: page.titre,
    description: page.meta_description,
  }
}

export default async function Lancement100K() {
  const page = await getPageBySlugOrNull('lancement-100k')
  if (!page) notFound()

  return <PageStatique page={page} breadcrumbLabel="Lancement 100K" />
}
