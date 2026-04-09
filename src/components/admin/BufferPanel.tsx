'use client'

import { useState, useEffect } from 'react'
import { Send, Clock, Check, ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react'

type BufferProfile = {
  id: string
  service: string
  service_username: string
  avatar: string | null
}

type NetworkPost = {
  profile_id: string
  service: string
  service_username: string
  text: string
  scheduled_at: string
  status: 'idle' | 'sending' | 'sent' | 'error'
  error?: string
}

const SERVICE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
}

const SERVICE_COLORS: Record<string, string> = {
  instagram: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white',
  linkedin: 'bg-[#0A66C2] text-white',
  facebook: 'bg-[#1877F2] text-white',
}

const SERVICE_LIMITS: Record<string, number> = {
  instagram: 2200,
  linkedin: 3000,
  facebook: 2000,
}

// Suggestions de créneaux horaires optimaux par réseau
const OPTIMAL_HOURS: Record<string, number> = {
  instagram: 11,
  linkedin: 9,
  facebook: 12,
}

function nextWeekdayAt(hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  // Éviter le weekend
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  if (d.getDay() === 6) d.setDate(d.getDate() + 2)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

function charCount(text: string, service: string): { count: number; limit: number; ok: boolean } {
  const limit = SERVICE_LIMITS[service] ?? 2000
  return { count: text.length, limit, ok: text.length <= limit }
}

interface Props {
  article: {
    titre: string
    extrait?: string | null
    slug?: string | null
  }
}

export default function BufferPanel({ article }: Props) {
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<BufferProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [posts, setPosts] = useState<NetworkPost[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const articleUrl = article.slug
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://100000medecins.org'}/blog/${article.slug}`
    : undefined

  // Charger les profils Buffer au premier clic
  useEffect(() => {
    if (!open || profiles.length > 0) return
    setLoadingProfiles(true)
    setProfilesError(null)
    fetch('/api/buffer-profiles')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setProfilesError(data.error); return }
        setProfiles(data.profiles ?? [])
      })
      .catch(() => setProfilesError('Erreur réseau'))
      .finally(() => setLoadingProfiles(false))
  }, [open])

  async function handleGenerate() {
    if (!profiles.length) return
    setIsGenerating(true)
    setGenerateError(null)

    const res = await fetch('/api/generer-posts-sociaux', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: article.titre,
        extrait: article.extrait,
        url: articleUrl,
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      setGenerateError(data.error ?? 'Erreur lors de la génération')
      setIsGenerating(false)
      return
    }

    // Construire un post par profil, avec créneau horaire suggéré
    const newPosts: NetworkPost[] = profiles.map((p) => ({
      profile_id: p.id,
      service: p.service,
      service_username: p.service_username,
      text: data[p.service] ?? data.linkedin ?? '',
      scheduled_at: nextWeekdayAt(OPTIMAL_HOURS[p.service] ?? 9),
      status: 'idle',
    }))
    setPosts(newPosts)
    setIsGenerating(false)
  }

  function updatePost(profileId: string, field: 'text' | 'scheduled_at', value: string) {
    setPosts((prev) => prev.map((p) => p.profile_id === profileId ? { ...p, [field]: value } : p))
  }

  function removePost(profileId: string) {
    setPosts((prev) => prev.filter((p) => p.profile_id !== profileId))
  }

  async function sendPost(profileId: string) {
    const post = posts.find((p) => p.profile_id === profileId)
    if (!post) return

    setPosts((prev) => prev.map((p) => p.profile_id === profileId ? { ...p, status: 'sending' } : p))

    const res = await fetch('/api/buffer-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_id: post.profile_id,
        text: post.text,
        scheduled_at: post.scheduled_at ? new Date(post.scheduled_at).toISOString() : undefined,
        link: articleUrl,
      }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setPosts((prev) => prev.map((p) => p.profile_id === profileId ? { ...p, status: 'error', error: data.error } : p))
    } else {
      setPosts((prev) => prev.map((p) => p.profile_id === profileId ? { ...p, status: 'sent' } : p))
    }
  }

  async function sendAll() {
    const toSend = posts.filter((p) => p.status === 'idle')
    for (const post of toSend) {
      await sendPost(post.profile_id)
    }
  }

  const allSent = posts.length > 0 && posts.every((p) => p.status === 'sent')
  const anySending = posts.some((p) => p.status === 'sending')

  return (
    <div className="bg-white border border-gray-200 rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-light transition-colors"
      >
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-accent-blue" />
          <span className="font-semibold text-navy text-sm">Publier sur les réseaux</span>
          {allSent && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Programmé</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 py-5 space-y-5">

          {/* Erreur profils */}
          {profilesError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{profilesError}</p>
          )}

          {/* Chargement profils */}
          {loadingProfiles && (
            <p className="text-sm text-gray-400">Chargement des profils Buffer…</p>
          )}

          {/* Profils chargés — bouton générer */}
          {!loadingProfiles && profiles.length > 0 && posts.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                {profiles.length} compte{profiles.length > 1 ? 's' : ''} connecté{profiles.length > 1 ? 's' : ''} :&nbsp;
                {profiles.map((p) => SERVICE_LABELS[p.service] ?? p.service).join(', ')}
              </p>
              {generateError && <p className="text-xs text-red-600">{generateError}</p>}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-accent-blue text-white rounded-xl hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Génération en cours…' : 'Générer les 3 messages'}
              </button>
            </div>
          )}

          {/* Posts générés */}
          {posts.length > 0 && (
            <div className="space-y-5">
              {posts.map((post) => {
                const { count, limit, ok } = charCount(post.text, post.service)
                const sent = post.status === 'sent'
                const sending = post.status === 'sending'
                const hasError = post.status === 'error'

                return (
                  <div key={post.profile_id} className={`rounded-2xl border p-4 space-y-3 ${sent ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
                    {/* En-tête réseau */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${SERVICE_COLORS[post.service] ?? 'bg-gray-200 text-gray-700'}`}>
                        {SERVICE_LABELS[post.service] ?? post.service}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">@{post.service_username}</span>
                        {!sent && (
                          <button type="button" onClick={() => removePost(post.profile_id)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {sent ? (
                      <p className="text-sm text-green-700 flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Programmé avec succès
                      </p>
                    ) : (
                      <>
                        {/* Texte éditable */}
                        <div>
                          <textarea
                            value={post.text}
                            onChange={(e) => updatePost(post.profile_id, 'text', e.target.value)}
                            rows={5}
                            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50"
                          />
                          <p className={`text-xs mt-1 text-right ${ok ? 'text-gray-400' : 'text-red-500 font-semibold'}`}>
                            {count} / {limit}
                          </p>
                        </div>

                        {/* Date/heure */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-1.5">
                            <Clock className="w-3.5 h-3.5" /> Date de publication
                            <span className="text-gray-400 font-normal">(créneau optimal suggéré)</span>
                          </label>
                          <input
                            type="datetime-local"
                            value={post.scheduled_at}
                            onChange={(e) => updatePost(post.profile_id, 'scheduled_at', e.target.value)}
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 w-full"
                          />
                        </div>

                        {hasError && (
                          <p className="text-xs text-red-600">{post.error}</p>
                        )}

                        {/* Bouton envoyer ce post */}
                        <button
                          type="button"
                          onClick={() => sendPost(post.profile_id)}
                          disabled={sending || !ok}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-accent-blue text-accent-blue rounded-xl hover:bg-accent-blue/5 disabled:opacity-50 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {sending ? 'Envoi…' : 'Programmer ce post'}
                        </button>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Tout programmer d'un coup */}
              {!allSent && posts.some((p) => p.status === 'idle') && (
                <button
                  type="button"
                  onClick={sendAll}
                  disabled={anySending}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navy-dark disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {anySending ? 'Envoi en cours…' : 'Programmer tous les posts'}
                </button>
              )}

              {/* Regénérer */}
              {!allSent && (
                <button
                  type="button"
                  onClick={() => { setPosts([]); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Regénérer les messages
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
