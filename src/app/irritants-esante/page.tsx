import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlugOrNull } from '@/lib/db/pages'
import PageStatique from '@/components/PageStatique'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlugOrNull('irritants-esante')
  if (!page) return { title: 'Les irritants de l\'e-santé — 100 000 Médecins' }
  return {
    title: page.titre + ' — 100 000 Médecins',
    description: page.meta_description,
  }
}

export default async function IrritantsEsante() {
  const page = await getPageBySlugOrNull('irritants-esante')
  if (!page) notFound()

  return <PageStatique page={page} breadcrumbLabel="Les irritants de l'e-santé" />
}
