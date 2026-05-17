import Link from 'next/link'
import Image from 'next/image'
import { createServerClient } from '@/lib/supabase/server'
import { getPrefsByToken } from '@/lib/actions/notifications-public'
import GererNotificationsClient from './GererNotificationsClient'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ uid?: string; iat?: string; token?: string }>
}

export default async function GererNotificationsPage(props: Props) {
  const searchParams = await props.searchParams;
  const content = await renderContent(searchParams)
  return (
    <>
      <MinimalHeader />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-2xl mx-auto px-6 py-10">{content}</div>
      </main>
    </>
  )
}

async function renderContent(searchParams: Awaited<Props['searchParams']>) {
  const uid = searchParams.uid
  const iatStr = searchParams.iat
  const token = searchParams.token

  if (!uid || !iatStr || !token) return <ErrorContent type="invalid" />

  const iat = Number(iatStr)
  if (!Number.isFinite(iat)) return <ErrorContent type="invalid" />

  const result = await getPrefsByToken({ uid, iat, token })

  if (result.status === 'expired') return <ErrorContent type="expired" />
  if (result.status !== 'ok') return <ErrorContent type="invalid" />

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <GererNotificationsClient
      uid={uid}
      iat={iat}
      token={token}
      initialPrefs={result.prefs}
      isEditeur={result.isEditeur}
      hasSession={!!user}
    />
  )
}

function ErrorContent({ type }: { type: 'invalid' | 'expired' }) {
  return (
    <div className="bg-white rounded-card shadow-card p-8 text-center">
      <h1 className="text-xl font-bold text-navy mb-3">
        {type === 'expired' ? 'Ce lien a expiré' : 'Lien invalide'}
      </h1>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        {type === 'expired'
          ? "Les liens de gestion des notifications restent valides un an. Pour mettre à jour vos préférences, connectez-vous à votre compte."
          : "Le lien que vous avez utilisé est invalide ou incomplet. Connectez-vous pour gérer vos préférences depuis votre compte."}
      </p>
      <Link
        href="/connexion?next=/mon-compte/mes-notifications"
        className="inline-block bg-accent-blue text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
      >
        Se connecter
      </Link>
    </div>
  )
}

function MinimalHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 h-[72px]">
      <div className="max-w-7xl mx-auto px-5 h-full flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logos/logo-principal-couleur-trimmed.png"
            alt="100 000 Médecins"
            width={63}
            height={44}
            className="h-[44px] w-auto min-[1150px]:hidden"
            priority
            unoptimized
          />
          <Image
            src="/logos/logo-secondaire-couleur-trimmed.png"
            alt="100 000 Médecins"
            width={400}
            height={100}
            className="h-[27px] w-auto hidden min-[1150px]:block"
            priority
            unoptimized
          />
        </Link>
        <Link
          href="/connexion"
          className="text-xs text-gray-500 hover:text-navy transition-colors"
        >
          Se connecter
        </Link>
      </div>
    </header>
  )
}
