// Page de l'admin : protégée par le proxy (jeton admin, rubrique Blog ouverte au rôle contenu).
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import StudioLibre from '@/components/admin/StudioLibre'

export const metadata = { title: 'Studio Instagram' }

export default function StudioInstagramPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy">
          <ArrowLeft className="h-4 w-4" /> Blog
        </Link>
        <h1 className="text-2xl font-bold text-navy">Studio Instagram</h1>
        <p className="max-w-3xl text-sm text-gray-500">
          Le gabarit de la charte sur une photo de votre ordinateur ou de votre téléphone : recadrez, écrivez un texte court, choisissez la
          tonalité, puis téléchargez le post et la story. Rien n&apos;est enregistré. Pour le visuel d&apos;un article, passez plutôt par
          l&apos;article (bouton « Visuel Instagram ») : il y est enregistré et Claude propose une accroche.
        </p>
      </div>
      <StudioLibre />
    </div>
  )
}
