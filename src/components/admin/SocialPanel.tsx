'use client'

import { useState } from 'react'
import { Send, Clock, Check, ChevronDown, ChevronUp, Sparkles, X, AlertCircle, Globe } from 'lucide-react'
import { publishArticle } from '@/lib/actions/admin'

type Network = 'linkedin' | 'facebook' | 'instagram'

type NetworkPost = {
  network: Network
  text: string
  scheduled_at: string
  immediate: boolean
  status: 'idle' | 'sending' | 'sent' | 'error'
  error?: string
}

const NETWORK_LABELS: Record<Network, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
}

const NETWORK_COLORS: Record<Network, string> = {
  linkedin: 'bg-[#0A66C2] text-white',
  facebook: 'bg-[#1877F2] text-white',
  instagram: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white',
}

const NETWORK_LIMITS: Record<Network, number> = {
  linkedin: 3000,
  facebook: 2000,
  instagram: 2200,
}

const OPTIMAL_HOURS: Record<Network, number> = {
  linkedin: 9,
  facebook: 12,
  instagram: 11,
}

const NETWORKS: Network[] = ['linkedin', 'facebook', 'instagram']

function nextWeekdayAt(hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  if (d.getDay() === 6) d.setDate(d.getDate() + 2)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

interface Props {
  article: {
    id: string
    titre: string
    extrait?: string | null
    slug?: string | null
    image_couverture?: string | null
    statut?: string | null
  }
}

export default function SocialPanel({ article }: Props) {
  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<NetworkPost[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(article.statut === 'publié')

  const articleUrl = article.slug
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://100000medecins.org'}/blog/${article.slug}`
    : undefined

  async function handlePublish() {
    setIsPublishing(true)
    const result = await publishArticle(article.id)
    if (!result?.error) setIsPublished(true)
    setIsPublishing(false)
  }

  async function handleGenerate() {
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

    const newPosts: NetworkPost[] = NETWORKS.map((network) => ({
      network,
      text: data[network] ?? '',
      scheduled_at: nextWeekdayAt(OPTIMAL_HOURS[network]),
      immediate: false,
      status: 'idle',
    }))
    setPosts(newPosts)
    setIsGenerating(false)
  }

  function updatePost(network: Network, field: 'text' | 'scheduled_at', value: string) {
    setPosts((prev) => prev.map((p) => p.network === network ? { ...p, [field]: value } : p))
  }

  function toggleImmediate(network: Network) {
    setPosts((prev) => prev.map((p) => p.network === network ? { ...p, immediate: !p.immediate } : p))
  }

  function removePost(network: Network) {
    setPosts((prev) => prev.filter((p) => p.network !== network))
  }

  async function sendPost(network: Network) {
    const post = posts.find((p) => p.network === network)
    if (!post) return

    setPosts((prev) => prev.map((p) => p.network === network ? { ...p, status: 'sending' } : p))

    const res = await fetch('/api/social-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        network: post.network,
        text: post.text,
        scheduled_at: post.immediate ? undefined : (post.scheduled_at ? new Date(post.scheduled_at).toISOString() : undefined),
        image_url: article.image_couverture ?? undefined,
        article_url: articleUrl,
      }),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setPosts((prev) => prev.map((p) => p.network === network ? { ...p, status: 'error', error: data.error } : p))
    } else {
      setPosts((prev) => prev.map((p) => p.network === network ? { ...p, status: 'sent' } : p))
    }
  }

  async function sendAll() {
    for (const post of posts.filter((p) => p.status === 'idle')) {
      await sendPost(post.network)
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

          {/* Article non publié */}
          {!isPublished && (
            <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>L'article n'est pas encore publié.</strong> Publie-le maintenant pour que la vignette de lien s'affiche correctement sur LinkedIn et Facebook.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                {isPublishing ? 'Publication…' : 'Publier'}
              </button>
            </div>
          )}

          {/* Instagram sans image */}
          {!article.image_couverture && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Cet article n'a pas d'image de couverture. Instagram requiert une image — le post Instagram sera envoyé sans image (Make.com gèrera selon ta configuration).
              </p>
            </div>
          )}

          {/* Bouton générer */}
          {posts.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Génère 3 messages adaptés à chaque réseau, puis programme leur publication.
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
                const limit = NETWORK_LIMITS[post.network]
                const count = post.text.length
                const ok = count <= limit
                const sent = post.status === 'sent'
                const sending = post.status === 'sending'
                const hasError = post.status === 'error'

                return (
                  <div key={post.network} className={`rounded-2xl border p-4 space-y-3 ${sent ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${NETWORK_COLORS[post.network]}`}>
                        {NETWORK_LABELS[post.network]}
                      </span>
                      {!sent && (
                        <button type="button" onClick={() => removePost(post.network)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {sent ? (
                      <p className="text-sm text-green-700 flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> Envoyé à Make.com avec succès
                      </p>
                    ) : (
                      <>
                        <div>
                          <textarea
                            value={post.text}
                            onChange={(e) => updatePost(post.network, 'text', e.target.value)}
                            rows={5}
                            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50"
                          />
                          <p className={`text-xs mt-1 text-right ${ok ? 'text-gray-400' : 'text-red-500 font-semibold'}`}>
                            {count} / {limit}
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2">
                            <Clock className="w-3.5 h-3.5" /> Date de publication
                          </label>
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => toggleImmediate(post.network)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${post.immediate ? 'bg-accent-blue text-white border-accent-blue' : 'bg-white text-gray-500 border-gray-200 hover:border-accent-blue/50'}`}
                            >
                              Immédiat
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleImmediate(post.network)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${!post.immediate ? 'bg-accent-blue text-white border-accent-blue' : 'bg-white text-gray-500 border-gray-200 hover:border-accent-blue/50'}`}
                            >
                              Programmer
                            </button>
                          </div>
                          {!post.immediate && (
                            <input
                              type="datetime-local"
                              value={post.scheduled_at}
                              onChange={(e) => updatePost(post.network, 'scheduled_at', e.target.value)}
                              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 w-full"
                            />
                          )}
                          {!post.immediate && <p className="text-xs text-gray-400 mt-1">Créneau optimal suggéré</p>}
                        </div>

                        {hasError && <p className="text-xs text-red-600">{post.error}</p>}

                        <button
                          type="button"
                          onClick={() => sendPost(post.network)}
                          disabled={sending || !ok}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-accent-blue text-accent-blue rounded-xl hover:bg-accent-blue/5 disabled:opacity-50 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {sending ? 'Envoi…' : 'Envoyer à Make.com'}
                        </button>
                      </>
                    )}
                  </div>
                )
              })}

              {!allSent && posts.some((p) => p.status === 'idle') && (
                <button
                  type="button"
                  onClick={sendAll}
                  disabled={anySending}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-navy text-white rounded-xl hover:bg-navy-dark disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {anySending ? 'Envoi en cours…' : 'Tout envoyer à Make.com'}
                </button>
              )}

              {!allSent && (
                <button
                  type="button"
                  onClick={() => setPosts([])}
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
