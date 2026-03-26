import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/db/pages'
import PageStatique from '@/components/PageStatique'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('difficile-de-changer')
  return {
    title: page.titre + ' — 10000médecins.org',
    description: page.meta_description,
  }
}

export default async function DifficileDeChanger() {
  let page
  try {
    page = await getPageBySlug('difficile-de-changer')
  } catch {
    notFound()
  }

  return <PageStatique page={page} breadcrumbLabel="Difficile de changer" />
}
