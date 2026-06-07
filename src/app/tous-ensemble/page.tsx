import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlugOrNull } from '@/lib/db/pages'
import PageStatique from '@/components/PageStatique'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlugOrNull('tous-ensemble')
  if (!page) return { title: 'Tous ensemble — 100 000 Médecins' }
  return {
    title: page.titre + ' — 100 000 Médecins',
    description: page.meta_description,
  }
}

export default async function TousEnsemble() {
  const page = await getPageBySlugOrNull('tous-ensemble')
  if (!page) notFound()

  return <PageStatique page={page} breadcrumbLabel="Tous ensemble" />
}
