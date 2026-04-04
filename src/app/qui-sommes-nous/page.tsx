import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/db/pages'
import QuiSommesNousPage from '@/components/QuiSommesNousPage'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('qui-sommes-nous')
  return {
    title: page.titre + ' — 10000médecins.org',
    description: page.meta_description,
  }
}

export default async function QuiSommesNous() {
  let page
  try {
    page = await getPageBySlug('qui-sommes-nous')
  } catch {
    notFound()
  }

  return <QuiSommesNousPage page={page} />
}
