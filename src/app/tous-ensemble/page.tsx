import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/db/pages'
import PageStatique from '@/components/PageStatique'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('tous-ensemble')
  return {
    title: page.titre + ' — 10000médecins.org',
    description: page.meta_description,
  }
}

export default async function TousEnsemble() {
  let page
  try {
    page = await getPageBySlug('tous-ensemble')
  } catch {
    notFound()
  }

  return <PageStatique page={page} breadcrumbLabel="Tous ensemble" />
}
