'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { getEditeurDataForUser, updateEditeurByUser, updateSolutionByEditeur, syncGalerieByEditeur } from '@/lib/actions/admin-users'
import { ChevronDown, ChevronUp, Save, Play, Plus, Trash2, GripVertical, Building2, Clock } from 'lucide-react'
import Link from 'next/link'

type GalerieItem = { id?: number; url: string; titre: string | null; ordre: number | null; type?: string | null }
type Solution = {
  id: string
  nom: string
  slug: string | null
  logo_url: string | null
  actif: boolean | null
  prix_ttc: number | null
  prix_devise: string | null
  prix_frequence: string | null
  prix_duree_engagement_mois: number | null
  galerie: GalerieItem[]
}
type Editeur = {
  id: string
  nom: string | null
  nom_commercial: string | null
  logo_url: string | null
  logo_titre: string | null
  website: string | null
  mot_editeur: string | null
  contact_email: string | null
  contact_telephone: string | null
  contact_adresse: string | null
  contact_cp: string | null
  contact_ville: string | null
  contact_pays: string | null
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
    if (!user) return
    if (userRole === null) return // rôle pas encore résolu → on attend
    if (userRole !== 'editeur') {
      // Éditeur déclaré mais demande pas encore validée par l'admin → rien à charger
      setFetching(false)
      return
    }
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
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6 text-amber-500" />
        </div>
        <h2 className="text-base font-semibold text-navy mb-1">Demande d&apos;accès éditeur en cours</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Votre demande de rattachement à un éditeur a bien été enregistrée. Elle est en attente de validation par l&apos;équipe 100&nbsp;000 Médecins.
        </p>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-3">
          Vous aurez accès à votre espace éditeur dès qu&apos;elle sera approuvée.
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center">
        <p className="text-gray-500 text-sm">Aucun éditeur associé à votre compte.</p>
        <p className="text-xs text-gray-400 mt-2">Contactez l&apos;administrateur du site.</p>
      </div>
    )
  }

  const { editeur, solutions } = data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Espace éditeur</h1>

      {/* Bloc unique : champs éditeur partagés */}
      <EditeurInfoCard
        editeur={editeur}
        userId={user!.id}
        onSaved={(updated) => setData((prev) => (prev ? { ...prev, editeur: { ...prev.editeur, ...updated } } : prev))}
      />

      {solutions.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center text-gray-400 text-sm">
          Aucune solution associée à votre éditeur.
        </div>
      ) : (
        solutions.map((sol) => (
          <SolutionEditeurCard
            key={sol.id}
            solution={sol}
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

/* ─────────────────────────────────────────────────────────────────────────
   Bloc 1 — Informations éditeur (partagées entre toutes les solutions)
   ───────────────────────────────────────────────────────────────────────── */
function EditeurInfoCard({
  editeur,
  userId,
  onSaved,
}: {
  editeur: Editeur
  userId: string
  onSaved: (fields: Partial<Editeur>) => void
}) {
  const [nomCommercial, setNomCommercial] = useState(editeur.nom_commercial ?? '')
  const [logoUrl, setLogoUrl] = useState(editeur.logo_url ?? '')
  const [logoTitre, setLogoTitre] = useState(editeur.logo_titre ?? '')
  const [website, setWebsite] = useState(editeur.website ?? '')
  const [motEditeur, setMotEditeur] = useState(editeur.mot_editeur ?? '')
  const [email, setEmail] = useState(editeur.contact_email ?? '')
  const [tel, setTel] = useState(editeur.contact_telephone ?? '')
  const [adresse, setAdresse] = useState(editeur.contact_adresse ?? '')
  const [cp, setCp] = useState(editeur.contact_cp ?? '')
  const [ville, setVille] = useState(editeur.contact_ville ?? '')
  const [pays, setPays] = useState(editeur.contact_pays ?? '')
  const [open, setOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const fields = {
        nom_commercial: nomCommercial,
        logo_url: logoUrl,
        logo_titre: logoTitre,
        website,
        mot_editeur: motEditeur,
        contact_email: email,
        contact_telephone: tel,
        contact_adresse: adresse,
        contact_cp: cp,
        contact_ville: ville,
        contact_pays: pays,
      }
      await updateEditeurByUser(userId, fields)
      onSaved(fields)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-accent-blue" />
          <span className="font-semibold text-navy">{editeur.nom_commercial || editeur.nom || 'Mon entreprise'}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-5 space-y-5">
          {/* Nom commercial */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Nom commercial</label>
            <input type="text" value={nomCommercial} onChange={(e) => setNomCommercial(e.target.value)} className={inputClass} />
          </div>

          {/* Logo + titre */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-navy mb-1.5">Logo entreprise (URL)</label>
              <div className="flex gap-3 items-start">
                {logoUrl && (
                  <img src={logoUrl} alt="" className="w-16 h-12 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1 flex-shrink-0" />
                )}
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Titre du logo</label>
              <input type="text" value={logoTitre} onChange={(e) => setLogoTitre(e.target.value)} className={inputClass} />
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

          {/* Contact */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-semibold text-navy mb-3">Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                <input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                <input type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code postal</label>
                <input type="text" value={cp} onChange={(e) => setCp(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
                <input type="text" value={ville} onChange={(e) => setVille(e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Pays</label>
                <input type="text" value={pays} onChange={(e) => setPays(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Bouton enregistrer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
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
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Bloc 2 — Solution (1 par solution)
   ───────────────────────────────────────────────────────────────────────── */
function SolutionEditeurCard({
  solution,
  userId,
  isOpen,
  onToggle,
  onSaved,
}: {
  solution: Solution
  userId: string
  isOpen: boolean
  onToggle: () => void
  onSaved: (s: Solution) => void
}) {
  const [logoUrl, setLogoUrl] = useState(solution.logo_url ?? '')
  const [prixTtc, setPrixTtc] = useState(solution.prix_ttc?.toString() ?? '')
  const [prixDevise, setPrixDevise] = useState(solution.prix_devise ?? 'EUR')
  const [prixFrequence, setPrixFrequence] = useState(solution.prix_frequence ?? '')
  const [prixDuree, setPrixDuree] = useState(solution.prix_duree_engagement_mois?.toString() ?? '')
  const [galerie, setGalerie] = useState<GalerieItem[]>(solution.galerie ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const fields = {
        logo_url: logoUrl,
        prix_ttc: prixTtc === '' ? null : Number(prixTtc),
        prix_devise: prixDevise,
        prix_frequence: prixFrequence,
        prix_duree_engagement_mois: prixDuree === '' ? null : Number(prixDuree),
      }
      await Promise.all([
        updateSolutionByEditeur(userId, solution.id, fields),
        syncGalerieByEditeur(userId, solution.id, galerie),
      ])
      onSaved({
        ...solution,
        logo_url: logoUrl,
        prix_ttc: fields.prix_ttc,
        prix_devise: prixDevise,
        prix_frequence: prixFrequence,
        prix_duree_engagement_mois: fields.prix_duree_engagement_mois,
        galerie,
      })
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

          {/* Logo solution */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Logo solution (URL)</label>
            <div className="flex gap-3 items-start">
              {logoUrl && (
                <img src={logoUrl} alt="" className="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1 flex-shrink-0" />
              )}
              <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>

          {/* Tarification */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-semibold text-navy mb-3">Tarification</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prix TTC</label>
                <input
                  type="number"
                  step="0.01"
                  value={prixTtc}
                  onChange={(e) => setPrixTtc(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Devise</label>
                <select value={prixDevise} onChange={(e) => setPrixDevise(e.target.value)} className={inputClass}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fréquence</label>
                <select value={prixFrequence} onChange={(e) => setPrixFrequence(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  <option value="mois">par mois</option>
                  <option value="an">par an</option>
                  <option value="unique">paiement unique</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Durée engag. (mois)</label>
                <input
                  type="number"
                  value={prixDuree}
                  onChange={(e) => setPrixDuree(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Galerie */}
          <div className="pt-3 border-t border-gray-100">
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

          {/* Footer : voir la page + bouton enregistrer */}
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
