'use client'

import { useState, useEffect } from 'react'
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

function NetworkIcon({ network }: { network: Network }) {
  if (network === 'linkedin') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
  if (network === 'facebook') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  )
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

const STORAGE_KEY = (id: string) => `social_posts_${id}`

export default function SocialPanel({ article }: Props) {
  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<NetworkPost[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(article.statut === 'publié')

  // Charger les posts sauvegardés au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(article.id))
      if (saved) setPosts(JSON.parse(saved))
    } catch {}
  }, [article.id])

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
    savePosts(newPosts)
    setIsGenerating(false)
  }

  function savePosts(updated: NetworkPost[]) {
    try { localStorage.setItem(STORAGE_KEY(article.id), JSON.stringify(updated)) } catch {}
    setPosts(updated)
  }

  function updatePost(network: Network, field: 'text' | 'scheduled_at', value: string) {
    savePosts(posts.map((p) => p.network === network ? { ...p, [field]: value } : p))
  }

  function toggleImmediate(network: Network) {
    savePosts(posts.map((p) => p.network === network ? { ...p, immediate: !p.immediate } : p))
  }

  function removePost(network: Network) {
    savePosts(posts.filter((p) => p.network !== network))
  }

  async function sendPost(network: Network) {
    const post = posts.find((p) => p.network === network)
    if (!post) return

    setPosts((prev) => prev.map((p) => p.network === network ? { ...p, status: 'sending' } : p))

    let data: { success?: boolean; error?: string } = {}
    try {
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
      data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Erreur inconnue')
      setPosts((prev) => prev.map((p) => p.network === network ? { ...p, status: 'sent' } : p))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      setPosts((prev) => prev.map((p) => p.network === network ? { ...p, status: 'error', error: msg } : p))
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
                      <span className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-xl ${NETWORK_COLORS[post.network]}`}>
                        <NetworkIcon network={post.network} />
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

                        {post.network === 'instagram' && !article.image_couverture && (
                          <p className="text-xs text-red-600 font-medium">
                            Image de couverture obligatoire pour Instagram. Ajoutez-en une avant d'envoyer.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => sendPost(post.network)}
                          disabled={sending || !ok || (post.network === 'instagram' && !article.image_couverture)}
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
                  onClick={() => { try { localStorage.removeItem(STORAGE_KEY(article.id)) } catch {} setPosts([]) }}
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
