import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/db/pages'
import PageStatique from '@/components/PageStatique'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await getPageBySlug('irritants-esante')
    return {
      title: page.titre + ' — 10000médecins.org',
      description: page.meta_description,
    }
  } catch {
    return { title: 'Les irritants de l\'e-santé — 10000médecins.org' }
  }
}

export default async function IrritantsEsante() {
  let page
  try {
    page = await getPageBySlug('irritants-esante')
  } catch {
    notFound()
  }

  return <PageStatique page={page} breadcrumbLabel="Les irritants de l'e-santé" />
}
