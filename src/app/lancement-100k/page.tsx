import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/db/pages'
import PageStatique from '@/components/PageStatique'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('lancement-100k')
  return {
    title: page.titre,
    description: page.meta_description,
  }
}

export default async function Lancement100K() {
  let page
  try {
    page = await getPageBySlug('lancement-100k')
  } catch {
    notFound()
  }

  return <PageStatique page={page} breadcrumbLabel="Lancement 100K" />
}
