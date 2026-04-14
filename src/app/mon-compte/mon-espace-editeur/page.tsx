'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { getEditeurDataForUser, updateSolutionByEditeur, syncGalerieByEditeur } from '@/lib/actions/admin-users'
import { ChevronDown, ChevronUp, Save, Play, Plus, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'

type GalerieItem = { id?: number; url: string; titre: string | null; ordre: number | null; type?: string | null }
type Solution = {
  id: string
  nom: string
  slug: string | null
  logo_url: string | null
  actif: boolean | null
  galerie: GalerieItem[]
}
type Editeur = {
  id: string
  nom: string | null
  nom_commercial: string | null
  logo_url: string | null
  website: string | null
  mot_editeur: string | null
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url)
}

function getYoutubeThumbnail(url: string): string | null {
  const id = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'

export default function MonEspaceEditeurPage() {
  const { user, userRole, loading } = useAuth()
  const [data, setData] = useState<{ editeur: Editeur; solutions: Solution[] } | null>(null)
  const [fetching, setFetching] = useState(true)
  const [openSolutionId, setOpenSolutionId] = useState<string | null>(null)

  useEffect(() => {
    if (!user || userRole !== 'editeur') return
    getEditeurDataForUser(user.id).then((d) => {
      setData(d as { editeur: Editeur; solutions: Solution[] } | null)
      setFetching(false)
    })
  }, [user, userRole])

  if (loading || fetching) {
    return <div className="animate-pulse text-gray-400 text-sm">Chargement...</div>
  }

  if (userRole !== 'editeur') {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center text-gray-400 text-sm">
        Accès non autorisé.
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <p className="text-gray-500 text-sm">Aucun éditeur associé à votre compte.</p>
        <p className="text-xs text-gray-400 mt-2">Contactez l'administrateur du site.</p>
      </div>
    )
  }

  const { editeur, solutions } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Mon espace éditeur</h1>
        <p className="text-sm text-gray-500 mt-1">
          {editeur.nom_commercial || editeur.nom} — {solutions.length} solution{solutions.length > 1 ? 's' : ''}
        </p>
      </div>

      {solutions.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center text-gray-400 text-sm">
          Aucune solution associée à votre éditeur.
        </div>
      ) : (
        solutions.map((sol) => (
          <SolutionEditeurCard
            key={sol.id}
            solution={sol}
            editeur={editeur}
            userId={user!.id}
            isOpen={openSolutionId === sol.id}
            onToggle={() => setOpenSolutionId(openSolutionId === sol.id ? null : sol.id)}
            onSaved={(updatedSol) =>
              setData((prev) =>
                prev
                  ? { ...prev, solutions: prev.solutions.map((s) => (s.id === updatedSol.id ? updatedSol : s)) }
                  : prev
              )
            }
          />
        ))
      )}
    </div>
  )
}

function SolutionEditeurCard({
  solution,
  editeur,
  userId,
  isOpen,
  onToggle,
  onSaved,
}: {
  solution: Solution
  editeur: Editeur
  userId: string
  isOpen: boolean
  onToggle: () => void
  onSaved: (s: Solution) => void
}) {
  const [motEditeur, setMotEditeur] = useState(editeur.mot_editeur ?? '')
  const [logoUrl, setLogoUrl] = useState(editeur.logo_url ?? '')
  const [website, setWebsite] = useState(editeur.website ?? '')
  const [galerie, setGalerie] = useState<GalerieItem[]>(solution.galerie ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all([
        updateSolutionByEditeur(userId, solution.id, {
          mot_editeur: motEditeur,
          logo_url: logoUrl,
          website,
        }),
        syncGalerieByEditeur(userId, solution.id, galerie),
      ])
      onSaved({ ...solution, logo_url: logoUrl, galerie })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const addImage = () => setGalerie((g) => [...g, { url: '', titre: null, ordre: g.length, type: 'image' }])
  const addVideo = () => setGalerie((g) => [...g, { url: '', titre: null, ordre: g.length, type: 'video' }])
  const removeItem = (i: number) => setGalerie((g) => g.filter((_, idx) => idx !== i))
  const updateItem = (i: number, patch: Partial<GalerieItem>) =>
    setGalerie((g) => g.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))

  const handleDragStart = (i: number) => setDragIdx(i)
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    setGalerie((g) => {
      const next = [...g]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(i, 0, moved)
      return next.map((item, idx) => ({ ...item, ordre: idx }))
    })
    setDragIdx(i)
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      {/* Header solution */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {solution.logo_url && (
            <img src={solution.logo_url} alt="" className="w-8 h-8 object-contain rounded-lg bg-gray-50 border border-gray-100 p-0.5" />
          )}
          <div>
            <span className="font-semibold text-navy">{solution.nom}</span>
            {solution.actif === false && (
              <span className="ml-2 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-5 space-y-6">

          {/* Logo éditeur */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Logo éditeur (URL)</label>
            <div className="flex gap-3 items-start">
              {logoUrl && (
                <img src={logoUrl} alt="" className="w-16 h-12 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1 flex-shrink-0" />
              )}
              <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>

          {/* Site web */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Site web</label>
            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.votre-site.fr" className={inputClass} />
          </div>

          {/* Mot de l'éditeur */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Mot de l&apos;éditeur</label>
            <p className="text-xs text-gray-400 mb-2">Texte libre. Utilisez **texte** pour mettre en gras. Les liens ne sont pas autorisés.</p>
            <textarea
              value={motEditeur}
              onChange={(e) => setMotEditeur(e.target.value)}
              rows={5}
              className={`${inputClass} resize-y`}
              placeholder="Présentez votre solution en quelques mots..."
            />
          </div>

          {/* Galerie */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-3">Galerie</label>
            <div className="space-y-3">
              {galerie.map((item, i) => {
                const isVideo = isVideoUrl(item.url) || item.type === 'video'
                const thumb = isVideo ? getYoutubeThumbnail(item.url) : null
                return (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragEnd={() => setDragIdx(null)}
                    className="flex items-start gap-3 p-3 bg-surface-light rounded-xl"
                  >
                    <div className="cursor-grab active:cursor-grabbing pt-2 text-gray-300 hover:text-gray-500 flex-shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    {/* Miniature */}
                    <div className="w-20 h-14 rounded-lg border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden relative">
                      {isVideo ? (
                        <>
                          {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover opacity-80" /> : <div className="w-full h-full bg-gray-800" />}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                        </>
                      ) : item.url ? (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    {/* Champs */}
                    <div className="flex-1 space-y-2">
                      {isVideo && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                          <Play className="w-2.5 h-2.5 fill-red-600" /> Vidéo
                        </span>
                      )}
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) => updateItem(i, { url: e.target.value })}
                        placeholder={isVideo ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        value={item.titre ?? ''}
                        onChange={(e) => updateItem(i, { titre: e.target.value })}
                        placeholder="Titre / description (optionnel)"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={addImage}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-accent-blue hover:text-accent-blue rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter une image
              </button>
              <button
                type="button"
                onClick={addVideo}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-2 border-dashed border-red-200 text-red-400 hover:border-red-500 hover:text-red-600 rounded-xl transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Ajouter une vidéo YouTube / Vimeo
              </button>
            </div>
          </div>

          {/* Bouton enregistrer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {solution.slug && (
              <Link
                href={`/solutions/${solution.slug}`}
                target="_blank"
                className="text-xs text-accent-blue hover:underline"
              >
                Voir la page solution →
              </Link>
            )}
            <div className="flex items-center gap-3 ml-auto">
              {saved && <span className="text-xs text-green-600 font-medium">Enregistré ✓</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-navy text-white hover:bg-navy/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
