import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlugOrNull } from '@/lib/db/pages'
import PageStatique from '@/components/PageStatique'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlugOrNull('difficile-de-changer')
  if (!page) return { title: 'Difficile de changer — 100 000 Médecins' }
  return {
    title: page.titre + ' — 100 000 Médecins',
    description: page.meta_description,
  }
}

export default async function DifficileDeChanger() {
  const page = await getPageBySlugOrNull('difficile-de-changer')
  if (!page) notFound()

  return <PageStatique page={page} breadcrumbLabel="Difficile de changer" />
}
