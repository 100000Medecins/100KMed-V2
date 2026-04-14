'use client'

import { useEffect, useState, useTransition } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { FlaskConical, ExternalLink, CheckCircle, Loader2 } from 'lucide-react'
import type { EtudeClinique } from '@/lib/actions/etudes-cliniques'
import { sanitizeHtml } from '@/lib/sanitize'

export default function EtudesCliniquesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [etudes, setEtudes] = useState<EtudeClinique[]>([])
  const [fetching, setFetching] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/connexion'); return }

    const load = async () => {
      // Vérifier l'opt-in
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: prefs } = await (supabase as any)
        .from('users_notification_preferences')
        .select('etudes_cliniques')
        .eq('user_id', user.id)
        .single()

      if (!prefs?.etudes_cliniques) {
        router.replace('/mon-compte/mes-notifications')
        return
      }

      setHasAccess(true)

      const { getEtudesActives } = await import('@/lib/actions/etudes-cliniques')
      setEtudes(await getEtudesActives())
      setFetching(false)
    }

    load()
  }, [user, loading, router])

  const handleEnSavoirPlus = (etude: EtudeClinique) => {
    startTransition(async () => {
      const { demanderInfoEtude } = await import('@/lib/actions/etudes-cliniques')
      await demanderInfoEtude(etude.id, etude.titre)
      setSentIds((prev) => new Set([...prev, etude.id]))
    })
  }

  if (loading || fetching || !hasAccess) {
    return <div className="animate-pulse text-gray-400 text-sm">Chargement…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="w-6 h-6 text-teal-600" />
        <div>
          <h1 className="text-xl font-bold text-navy">Études cliniques</h1>
          <p className="text-sm text-gray-500">Participez aux études cliniques avec le Digital Medical Hub</p>
        </div>
      </div>

      {etudes.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-10 text-center text-gray-400 text-sm">
          Aucune étude clinique disponible pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {etudes.map((etude) => (
            <EtudeCard
              key={etude.id}
              etude={etude}
              sent={sentIds.has(etude.id)}
              onEnSavoirPlus={() => handleEnSavoirPlus(etude)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EtudeCard({
  etude,
  sent,
  onEnSavoirPlus,
}: {
  etude: EtudeClinique
  sent: boolean
  onEnSavoirPlus: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [imgIndex, setImgIndex] = useState(0)

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden flex flex-col">
      {/* Images */}
      {etude.images.length > 0 && (
        <div className="relative aspect-video bg-gray-100">
          <img
            src={etude.images[imgIndex]}
            alt={etude.titre}
            className="w-full h-full object-cover"
          />
          {etude.images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {etude.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === imgIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <h2 className="font-bold text-navy text-base">{etude.titre}</h2>

        {etude.description && (
          <div
            className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(etude.description) }}
          />
        )}

        <div className="mt-auto pt-3 flex flex-col gap-2">
          {etude.lien && (
            <a
              href={etude.lien}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-accent-blue hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              En savoir plus sur l'étude
            </a>
          )}

          {sent ? (
            <div className="flex items-center gap-2 text-sm text-teal-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              Votre demande a été envoyée
            </div>
          ) : (
            <button
              onClick={() => startTransition(onEnSavoirPlus)}
              disabled={isPending}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Je souhaite en savoir plus
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
