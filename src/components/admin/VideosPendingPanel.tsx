'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X, Pencil, Inbox } from 'lucide-react'
import { approveVideoProposal, rejectVideoProposal } from '@/lib/actions/videos'

type PendingVideo = {
  id: string
  titre: string | null
  url: string | null
  description: string | null
  type: string | null
  vignette: string | null
  created_at: string | null
  proposer: { prenom: string | null; nom: string | null; pseudo: string | null; email: string | null } | null
}

function getYouTubeId(url: string | null): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

function proposerLabel(p: PendingVideo['proposer']): string {
  if (!p) return 'Utilisateur supprimé'
  if (p.pseudo) return p.pseudo
  if (p.prenom || p.nom) return `${p.prenom ?? ''} ${p.nom ?? ''}`.trim()
  return p.email ?? 'Anonyme'
}

export default function VideosPendingPanel({ videos }: { videos: PendingVideo[] }) {
  const router = useRouter()
  const [items, setItems] = useState(videos)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (items.length === 0) return null

  const handleApprove = (id: string) => {
    setBusyId(id)
    startTransition(async () => {
      const result = await approveVideoProposal(id)
      if (result.ok) {
        setItems((prev) => prev.filter((v) => v.id !== id))
        router.refresh()
      }
      setBusyId(null)
    })
  }
  const handleReject = (id: string) => {
    if (!confirm('Refuser cette proposition ? Elle sera marquée comme refusée et n\'apparaîtra plus en attente.')) return
    setBusyId(id)
    startTransition(async () => {
      const result = await rejectVideoProposal(id)
      if (result.ok) {
        setItems((prev) => prev.filter((v) => v.id !== id))
        router.refresh()
      }
      setBusyId(null)
    })
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden mb-6 border-l-4 border-amber-400">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-amber-50/50">
        <Inbox className="w-4 h-4 text-amber-500 shrink-0" />
        <p className="text-sm font-semibold text-navy flex-1">
          Propositions à modérer
          <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400 text-white text-[10px] font-bold">
            {items.length}
          </span>
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((v) => {
          const ytId = getYouTubeId(v.url)
          const thumbnail = v.vignette ?? (ytId ? `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg` : null)
          const isBusy = busyId === v.id
          return (
            <div key={v.id} className="flex items-start gap-4 px-5 py-4">
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnail} alt={v.titre ?? ''} className="w-28 h-16 rounded object-cover shrink-0 bg-gray-100" />
              ) : (
                <div className="w-28 h-16 rounded bg-gray-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy text-sm">{v.titre ?? <span className="italic text-gray-400">Sans titre</span>}</p>
                {v.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{v.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-400">
                  <span>Proposé par <strong className="text-gray-600">{proposerLabel(v.proposer)}</strong></span>
                  {v.created_at && (
                    <span>· {new Date(v.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                  {v.url && (
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline truncate max-w-xs">{v.url}</a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/videos/${v.id}/modifier`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </Link>
                <button
                  onClick={() => handleApprove(v.id)}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> Publier
                </button>
                <button
                  onClick={() => handleReject(v.id)}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" /> Refuser
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
