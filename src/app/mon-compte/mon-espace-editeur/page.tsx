'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { getEditeurDataForUser, updateEditeurByUser, updateSolutionByEditeur, syncGalerieByEditeur } from '@/lib/actions/admin-users'
import { ChevronDown, ChevronUp, Save, Play, Plus, Trash2, GripVertical, Building2, Clock, Headphones, FileText, Layers, Briefcase, Euro, Users, Upload } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { buildPrixDisplay } from '@/lib/prix'
import ImageUploadField from '@/components/ui/ImageUploadField'
import ProposeCommunauteModal from '@/components/solutions/detail/ProposeCommunauteModal'
import ContactsListEditor from '@/components/admin/ContactsListEditor'
import { normalizeContacts } from '@/lib/contacts'
import type { ContactLigne } from '@/types/models'

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false })

type GalerieItem = { id?: number; url: string; titre: string | null; ordre: number | null; type?: string | null }
type Solution = {
  id: string
  nom: string
  slug: string | null
  logo_url: string | null
  actif: boolean | null
  id_editeur: string | null
  mot_editeur: string | null
  prix_ttc: number | null
  prix_ttc_min: number | null
  prix_ttc_max: number | null
  prix_devise: string | null
  prix_frequence: string | null
  prix_duree_engagement_mois: number | null
  support_website: string | null
  contacts_commerciaux: ContactLigne[] | null
  contacts_support: ContactLigne[] | null
  categorie: { slug: string | null } | null
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
  contact_ville: string | null
  contact_pays: string | null
  nb_employes: number | null
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url)
}

function getYoutubeThumbnail(url: string): string | null {
  const id = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue'

type Tab = 'editeur' | 'solutions'

export default function MonEspaceEditeurPage() {
  const { user, userRole, loading } = useAuth()
  const [data, setData] = useState<{ editeur: Editeur; solutions: Solution[]; filiales: Editeur[] } | null>(null)
  const [selectedEditeurId, setSelectedEditeurId] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)
  const [openSolutionId, setOpenSolutionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('editeur')

  useEffect(() => {
    if (!user) return
    if (userRole === null) return
    if (userRole !== 'editeur') {
      setFetching(false)
      return
    }
    getEditeurDataForUser(user.id).then((d) => {
      const typed = d as { editeur: Editeur; solutions: Solution[]; filiales: Editeur[] } | null
      setData(typed)
      // Si l'éditeur n'a qu'une seule solution, on la déplie automatiquement
      if (typed && typed.solutions.length === 1) {
        setOpenSolutionId(typed.solutions[0].id)
      }
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

  const { editeur, solutions, filiales } = data

  // Multi-marque : si l'éditeur a des filiales (maison-mère), on affiche sur chaque
  // solution la marque à laquelle elle est rattachée pour s'y retrouver.
  const multiMarque = filiales.length > 0
  const nomById = new Map<string, string>([
    [editeur.id, editeur.nom_commercial || editeur.nom || 'Éditeur'],
    ...filiales.map((f) => [f.id, f.nom_commercial || f.nom || 'Filiale'] as [string, string]),
  ])

  // Maison-mère : le compte peut éditer la page de l'éditeur parent ET de ses filiales.
  const editeursGeres: Editeur[] = [editeur, ...filiales]
  const currentEditeurId = selectedEditeurId ?? editeur.id
  const selectedEditeur = editeursGeres.find((e) => e.id === currentEditeurId) ?? editeur

  const handleEditeurSaved = (updated: Partial<Editeur>) =>
    setData((prev) => {
      if (!prev) return prev
      if (currentEditeurId === prev.editeur.id) {
        return { ...prev, editeur: { ...prev.editeur, ...updated } }
      }
      return {
        ...prev,
        filiales: prev.filiales.map((f) => (f.id === currentEditeurId ? { ...f, ...updated } : f)),
      }
    })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">Espace éditeur</h1>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200">
        <TabButton active={activeTab === 'editeur'} onClick={() => setActiveTab('editeur')} icon={Building2} label="Page éditeur" />
        <TabButton active={activeTab === 'solutions'} onClick={() => setActiveTab('solutions')} icon={Layers} label={`Pages solutions (${solutions.length})`} />
      </div>

      {activeTab === 'editeur' ? (
        <div className="space-y-4">
          {/* Sélecteur de marque (maison-mère + filiales) */}
          {editeursGeres.length > 1 && (
            <div className="bg-white rounded-card shadow-card p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Page éditeur à modifier</p>
              <div className="flex flex-wrap gap-2">
                {editeursGeres.map((e) => {
                  const isParent = e.id === editeur.id
                  const active = e.id === currentEditeurId
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedEditeurId(e.id)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? 'bg-navy text-white border-navy'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-navy'
                      }`}
                    >
                      {e.nom_commercial || e.nom}
                      {isParent && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-accent-blue/10 text-accent-blue'}`}>
                          maison-mère
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <EditeurInfoCard
            key={currentEditeurId}
            editeur={selectedEditeur}
            editeurId={currentEditeurId}
            userId={user!.id}
            onSaved={handleEditeurSaved}
          />
        </div>
      ) : solutions.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center text-gray-400 text-sm">
          Aucune solution associée à votre éditeur.
        </div>
      ) : (
        <div className="space-y-4">
          {solutions.map((sol) => (
            <SolutionEditeurCard
              key={sol.id}
              solution={sol}
              userId={user!.id}
              editeurLabel={multiMarque && sol.id_editeur ? nomById.get(sol.id_editeur) : undefined}
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
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   TabButton
   ───────────────────────────────────────────────────────────────────────── */
function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Building2
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-accent-blue text-accent-blue'
          : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Page éditeur — champs partagés entre toutes les solutions
   ───────────────────────────────────────────────────────────────────────── */
function EditeurInfoCard({
  editeur,
  editeurId,
  userId,
  onSaved,
}: {
  editeur: Editeur
  editeurId: string
  userId: string
  onSaved: (fields: Partial<Editeur>) => void
}) {
  const [nomCommercial, setNomCommercial] = useState(editeur.nom_commercial ?? '')
  const [logoUrl, setLogoUrl] = useState(editeur.logo_url ?? '')
  const [logoTitre, setLogoTitre] = useState(editeur.logo_titre ?? '')
  const [website, setWebsite] = useState(editeur.website ?? '')
  const [motEditeur, setMotEditeur] = useState(editeur.mot_editeur ?? '')
  const [ville, setVille] = useState(editeur.contact_ville ?? '')
  const [pays, setPays] = useState(editeur.contact_pays ?? '')
  const [nbEmployes, setNbEmployes] = useState(editeur.nb_employes?.toString() ?? '')
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
        contact_ville: ville,
        contact_pays: pays,
        nb_employes: nbEmployes === '' ? null : Number(nbEmployes),
      }
      await updateEditeurByUser(userId, editeurId, fields)
      onSaved(fields)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-card shadow-card p-6 space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <Building2 className="w-5 h-5 text-accent-blue" />
        <span className="font-semibold text-navy">{editeur.nom_commercial || editeur.nom || 'Mon entreprise'}</span>
      </div>

      {/* Nom commercial */}
      <div>
        <label className="block text-sm font-semibold text-navy mb-1.5">Nom commercial</label>
        <input type="text" value={nomCommercial} onChange={(e) => setNomCommercial(e.target.value)} className={inputClass} />
      </div>

      {/* Logo + titre */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-navy mb-1.5">Logo entreprise</label>
          <ImageUploadField
            value={logoUrl}
            onChange={setLogoUrl}
            inputClassName={inputClass}
            previewClassName="w-16 h-12 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1 flex-shrink-0"
          />
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

      {/* Localisation */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-sm font-semibold text-navy mb-3">Localisation</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
            <input type="text" value={ville} onChange={(e) => setVille(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pays</label>
            <input type="text" value={pays} onChange={(e) => setPays(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre d&apos;employés</label>
            <input
              type="number"
              min={0}
              value={nbEmployes}
              onChange={(e) => setNbEmployes(e.target.value)}
              className={inputClass}
              placeholder="—"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 italic">
        Les contacts commerciaux et support sont propres à chaque produit : retrouvez-les dans l&apos;onglet « Pages solutions », sur la fiche de la solution concernée.
      </p>

      {/* Mot de l'éditeur (page éditeur globale) */}
      <div className="pt-3 border-t border-gray-100">
        <label className="block text-sm font-semibold text-navy mb-1.5">Mot de l&apos;éditeur (page éditeur globale)</label>
        <p className="text-xs text-gray-400 mb-2">
          Texte affiché sur votre page éditeur. Pour le mot affiché en bas de chaque page solution, utilisez l&apos;onglet « Pages solutions ».
        </p>
        <RichTextEditor
          minimal
          initialContent={motEditeur}
          onChange={setMotEditeur}
          minHeight={140}
        />
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
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Page solution (1 par solution)
   ───────────────────────────────────────────────────────────────────────── */
type PrixMode = 'unique' | 'plage'

function SolutionEditeurCard({
  solution,
  userId,
  editeurLabel,
  isOpen,
  onToggle,
  onSaved,
}: {
  solution: Solution
  userId: string
  editeurLabel?: string
  isOpen: boolean
  onToggle: () => void
  onSaved: (s: Solution) => void
}) {
  const [nom, setNom] = useState(solution.nom)
  const [logoUrl, setLogoUrl] = useState(solution.logo_url ?? '')
  const [motEditeur, setMotEditeur] = useState(solution.mot_editeur ?? '')
  const initialPrixMode: PrixMode = solution.prix_ttc_min != null || solution.prix_ttc_max != null ? 'plage' : 'unique'
  const [prixMode, setPrixMode] = useState<PrixMode>(initialPrixMode)
  const [prixTtc, setPrixTtc] = useState(solution.prix_ttc?.toString() ?? '')
  const [prixMin, setPrixMin] = useState(solution.prix_ttc_min?.toString() ?? '')
  const [prixMax, setPrixMax] = useState(solution.prix_ttc_max?.toString() ?? '')
  const [prixDevise, setPrixDevise] = useState(solution.prix_devise ?? 'EUR')
  const [prixFrequence, setPrixFrequence] = useState(solution.prix_frequence ?? '')
  const [prixDuree, setPrixDuree] = useState(solution.prix_duree_engagement_mois?.toString() ?? '')
  const [contactsCommerciaux, setContactsCommerciaux] = useState<ContactLigne[]>(() =>
    normalizeContacts(solution.contacts_commerciaux)
  )
  const [contactsSupport, setContactsSupport] = useState<ContactLigne[]>(() =>
    normalizeContacts(solution.contacts_support)
  )
  const [supportSite, setSupportSite] = useState(solution.support_website ?? '')
  const [galerie, setGalerie] = useState<GalerieItem[]>(solution.galerie ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [galerieUploadingIndex, setGalerieUploadingIndex] = useState<number | null>(null)
  const [galerieBulkUploading, setGalerieBulkUploading] = useState(false)
  const [galerieUploadError, setGalerieUploadError] = useState<string | null>(null)
  const galerieFileInputRef = useRef<HTMLInputElement>(null)
  const galerieBulkInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const [communauteModalOpen, setCommunauteModalOpen] = useState(false)

  const handleSave = async () => {
    const nomTrim = nom.trim()
    if (nomTrim === '') {
      setErreur('Le nom de la solution est obligatoire.')
      return
    }
    setErreur(null)
    setSaving(true)
    try {
      const fields = {
        nom: nomTrim,
        logo_url: logoUrl,
        mot_editeur: motEditeur,
        prix_ttc: prixMode === 'unique' && prixTtc !== '' ? Number(prixTtc) : null,
        prix_ttc_min: prixMode === 'plage' && prixMin !== '' ? Number(prixMin) : null,
        prix_ttc_max: prixMode === 'plage' && prixMax !== '' ? Number(prixMax) : null,
        prix_devise: prixDevise,
        prix_frequence: prixFrequence,
        prix_duree_engagement_mois: prixDuree === '' ? null : Number(prixDuree),
        support_website: supportSite,
        contacts_commerciaux: contactsCommerciaux,
        contacts_support: contactsSupport,
      }
      await Promise.all([
        updateSolutionByEditeur(userId, solution.id, fields),
        syncGalerieByEditeur(userId, solution.id, galerie),
      ])
      onSaved({
        ...solution,
        nom: nomTrim,
        logo_url: logoUrl,
        mot_editeur: motEditeur,
        prix_ttc: fields.prix_ttc,
        prix_ttc_min: fields.prix_ttc_min,
        prix_ttc_max: fields.prix_ttc_max,
        prix_devise: prixDevise,
        prix_frequence: prixFrequence,
        prix_duree_engagement_mois: fields.prix_duree_engagement_mois,
        support_website: supportSite || null,
        contacts_commerciaux: contactsCommerciaux,
        contacts_support: contactsSupport,
        galerie,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  const addImage = () => setGalerie((g) => [...g, { url: '', titre: null, ordre: g.length, type: 'image' }])
  const addVideo = () => setGalerie((g) => [...g, { url: '', titre: null, ordre: g.length, type: 'video' }])
  const removeItem = (i: number) => setGalerie((g) => g.filter((_, idx) => idx !== i))
  const updateItem = (i: number, patch: Partial<GalerieItem>) =>
    setGalerie((g) => g.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))

  const ACCEPT_IMG = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml'

  // Upload d'un fichier pour un item galerie existant → /api/upload (resize + WebP q80).
  async function handleGalerieFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || galerieUploadingIndex === null) return
    const idxCible = galerieUploadingIndex
    setGalerieUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setGalerieUploadError(json.error ?? 'Erreur upload'); return }
      setGalerie((g) => g.map((item, idx) => (idx === idxCible ? { ...item, url: json.url, type: 'image' } : item)))
    } catch {
      setGalerieUploadError('Erreur réseau lors de l\'upload')
    } finally {
      setGalerieUploadingIndex(null)
      if (galerieFileInputRef.current) galerieFileInputRef.current.value = ''
    }
  }

  // Upload multiple : ajoute autant d'items image que de fichiers choisis (chacun compressé).
  async function handleGalerieBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setGalerieBulkUploading(true)
    setGalerieUploadError(null)
    const nouveaux: GalerieItem[] = []
    for (const file of files) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (res.ok) nouveaux.push({ url: json.url, titre: null, ordre: galerie.length + nouveaux.length, type: 'image' })
        else setGalerieUploadError(json.error ?? 'Erreur upload')
      } catch { setGalerieUploadError('Erreur réseau lors de l\'upload') }
    }
    if (nouveaux.length) setGalerie((g) => [...g, ...nouveaux])
    setGalerieBulkUploading(false)
    if (galerieBulkInputRef.current) galerieBulkInputRef.current.value = ''
  }

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
            {editeurLabel && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded-full align-middle">
                <Building2 className="w-2.5 h-2.5" />
                {editeurLabel}
              </span>
            )}
            {solution.actif === false && (
              <span className="ml-2 text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-5 space-y-6">

          {/* Nom de la solution */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Nom de la solution</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} className={inputClass} />
            <p className="text-xs text-gray-400 mt-1">
              Nom affiché sur la fiche publique et dans les listes. L&apos;adresse de la page (URL) reste inchangée.
            </p>
          </div>

          {/* Logo solution */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Logo solution</label>
            <ImageUploadField
              value={logoUrl}
              onChange={setLogoUrl}
              inputClassName={inputClass}
              previewClassName="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1 flex-shrink-0"
            />
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
                        placeholder={isVideo ? 'https://www.youtube.com/watch?v=...' : 'https://... ou uploader un fichier'}
                        className={inputClass}
                      />
                      {!isVideo && (
                        <button
                          type="button"
                          onClick={() => { setGalerieUploadingIndex(i); galerieFileInputRef.current?.click() }}
                          disabled={galerieUploadingIndex === i}
                          className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline disabled:opacity-50"
                        >
                          <Upload className="w-3 h-3" /> {galerieUploadingIndex === i ? 'Upload…' : 'ou uploader un fichier'}
                        </button>
                      )}
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

            {/* Inputs fichier cachés → /api/upload (resize ≤1600px + WebP q80, comme l'admin) */}
            <input ref={galerieFileInputRef} type="file" accept={ACCEPT_IMG} className="hidden" onChange={handleGalerieFileChange} />
            <input ref={galerieBulkInputRef} type="file" accept={ACCEPT_IMG} multiple className="hidden" onChange={handleGalerieBulkUpload} />

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => galerieBulkInputRef.current?.click()}
                disabled={galerieBulkUploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-2 border-dashed border-accent-blue/40 text-accent-blue hover:border-accent-blue hover:bg-accent-blue/5 rounded-xl transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" /> {galerieBulkUploading ? 'Upload en cours…' : 'Uploader des images'}
              </button>
              <button
                type="button"
                onClick={addImage}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-accent-blue hover:text-accent-blue rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter via une URL
              </button>
              <button
                type="button"
                onClick={addVideo}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-2 border-dashed border-red-200 text-red-400 hover:border-red-500 hover:text-red-600 rounded-xl transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> Ajouter une vidéo YouTube / Vimeo
              </button>
            </div>
            {galerieUploadError && <p className="text-xs text-red-600 mt-2">{galerieUploadError}</p>}
          </div>

          {/* Mot de l'éditeur (page solution) */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="w-4 h-4 text-accent-blue" />
              <label className="text-sm font-semibold text-navy">Mot de l&apos;éditeur (page solution)</label>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              Texte affiché en bas de cette page solution. Mise en forme : gras, italique, souligné, listes, lien.
            </p>
            <RichTextEditor
              minimal
              initialContent={motEditeur}
              onChange={setMotEditeur}
              minHeight={140}
            />
          </div>

          {/* Contacts commerciaux (par solution) */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-accent-blue" />
              <p className="text-sm font-semibold text-navy">Contacts commerciaux <span className="text-gray-400 font-normal">(demande de démo, devis&hellip;)</span></p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Si renseignés, apparaîtront en bas de cette page solution dans « Contacts utiles ▸ Contacts commerciaux ».
            </p>
            <ContactsListEditor
              value={contactsCommerciaux}
              onChange={setContactsCommerciaux}
              addLabel="Ajouter un contact commercial"
              emailPlaceholder="contact@…"
              size="sm"
            />
          </div>

          {/* Contacts support (par solution) */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Headphones className="w-4 h-4 text-accent-blue" />
              <p className="text-sm font-semibold text-navy">Contacts support <span className="text-gray-400 font-normal">(SAV, assistance technique)</span></p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Si renseignés, apparaîtront en bas de cette page solution dans « Contacts utiles ▸ Contacts support ».
            </p>
            <ContactsListEditor
              value={contactsSupport}
              onChange={setContactsSupport}
              addLabel="Ajouter un contact support"
              emailPlaceholder="support@…"
              size="sm"
            />
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Site / page de support</label>
              <input type="url" value={supportSite} onChange={(e) => setSupportSite(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>

          {/* Tarification */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-sm font-semibold text-navy">Tarification</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                Bientôt affiché sur le site
              </span>
            </div>

            {/* Toggle mode prix */}
            <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-4">
              <button
                type="button"
                onClick={() => setPrixMode('unique')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  prixMode === 'unique' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
                }`}
              >
                Prix unique
              </button>
              <button
                type="button"
                onClick={() => setPrixMode('plage')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  prixMode === 'plage' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'
                }`}
              >
                Plage de prix
              </button>
            </div>

            <div className={`grid grid-cols-1 ${prixMode === 'plage' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3`}>
              {prixMode === 'unique' ? (
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
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Min TTC</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prixMin}
                      onChange={(e) => setPrixMin(e.target.value)}
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max TTC</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prixMax}
                      onChange={(e) => setPrixMax(e.target.value)}
                      placeholder="0.00"
                      className={inputClass}
                    />
                  </div>
                </>
              )}
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

            {/* Aperçu live du rendu front */}
            {(() => {
              const preview = buildPrixDisplay({
                prix_ttc: prixMode === 'unique' && prixTtc !== '' ? Number(prixTtc) : null,
                prix_ttc_min: prixMode === 'plage' && prixMin !== '' ? Number(prixMin) : null,
                prix_ttc_max: prixMode === 'plage' && prixMax !== '' ? Number(prixMax) : null,
                prix_devise: prixDevise,
                prix_frequence: prixFrequence,
                prix_duree_engagement_mois: prixDuree === '' ? null : Number(prixDuree),
              })
              return (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Aperçu sur la fiche solution
                  </p>
                  {preview.hasPrice && preview.label ? (
                    <div className="flex items-start gap-2">
                      <Euro className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-navy">{preview.label}</p>
                        {preview.engagementLabel && (
                          <p className="text-xs text-gray-500 mt-0.5">{preview.engagementLabel}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-500">
                        Prix sur demande <span className="text-xs text-gray-400 italic">(aucun montant renseigné)</span>
                      </p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Communauté utilisateurs */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-accent-blue" />
              <p className="text-sm font-semibold text-navy">Communauté utilisateurs</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Proposez un groupe d&apos;utilisateurs de cette solution (WhatsApp, Discord, forum…). Après validation par notre équipe, il apparaîtra sur la fiche solution et sur votre page éditeur.
            </p>
            <button
              type="button"
              onClick={() => setCommunauteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Proposer une communauté
            </button>
          </div>

          {/* Footer : voir la page + bouton enregistrer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {solution.slug && solution.categorie?.slug && (
              <Link
                href={`/solutions/${solution.categorie.slug}/${solution.slug}`}
                target="_blank"
                className="text-xs text-accent-blue hover:underline"
              >
                Voir la page solution →
              </Link>
            )}
            <div className="flex items-center gap-3 ml-auto">
              {erreur && <span className="text-xs text-red-600 font-medium">{erreur}</span>}
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

      <ProposeCommunauteModal
        open={communauteModalOpen}
        onClose={() => setCommunauteModalOpen(false)}
        solutionId={solution.id}
        solutionNom={solution.nom}
        userEmail={user?.email ?? null}
      />
    </div>
  )
}
