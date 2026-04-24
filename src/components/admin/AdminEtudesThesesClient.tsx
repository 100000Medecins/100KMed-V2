'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import {
  BookOpen, CheckCircle, XCircle, Trash2, ExternalLink,
  Clock, Loader2, FlaskConical, GraduationCap,
  CalendarDays, Plus, Pencil, Archive, X,
} from 'lucide-react'
import type { QuestionnaireThese } from '@/lib/actions/questionnaires-these'
import type { EtudeClinique } from '@/lib/actions/etudes-cliniques'
import EtudeForm from '@/components/etudes/EtudeForm'

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false })

// ── Helpers ───────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isExpired(date_fin: string | null): boolean {
  if (!date_fin) return false
  return date_fin < today()
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', icon: Clock, className: 'text-amber-600 bg-amber-50' },
  publie: { label: 'Publié', icon: CheckCircle, className: 'text-green-600 bg-green-50' },
  refuse: { label: 'Refusé', icon: XCircle, className: 'text-red-600 bg-red-50' },
} as const

// ── Formulaire questionnaire (admin) ─────────────────────────────────────────

type FormValues = {
  titre: string
  description: string
  lien: string
  image_url: string
  date_fin: string
  statut: 'en_attente' | 'publie' | 'refuse'
}

function emptyForm(): FormValues {
  return { titre: '', description: '', lien: '', image_url: '', date_fin: '', statut: 'publie' }
}

function fromQuestionnaire(q: QuestionnaireThese): FormValues {
  return {
    titre: q.titre,
    description: q.description ?? '',
    lien: q.lien,
    image_url: q.image_url ?? '',
    date_fin: q.date_fin ?? '',
    statut: q.statut,
  }
}

interface QuestionnaireFormProps {
  initial?: QuestionnaireThese
  onSave: (values: FormValues) => Promise<void>
  onCancel: () => void
  saving: boolean
  error: string | null
}

function QuestionnaireForm({ initial, onSave, onCancel, saving, error }: QuestionnaireFormProps) {
  const [values, setValues] = useState<FormValues>(initial ? fromQuestionnaire(initial) : emptyForm())
  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }))

  return (
    <div className="bg-white rounded-card shadow-card p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-navy">
          {initial ? 'Modifier le questionnaire' : 'Nouveau questionnaire'}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
            <input value={values.titre} onChange={set('titre')} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
              placeholder="Titre de la thèse" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lien *</label>
            <input value={values.lien} onChange={set('lien')} required type="url"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
              placeholder="https://forms.gle/..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin *</label>
            <input value={values.date_fin} onChange={set('date_fin')} required type="date"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image URL <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <input value={values.image_url} onChange={set('image_url')} type="url"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
              placeholder="https://..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
            <select value={values.statut} onChange={set('statut')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue bg-white">
              <option value="publie">Publié</option>
              <option value="en_attente">En attente</option>
              <option value="refuse">Refusé</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Description <span className="text-gray-400 font-normal">(optionnel)</span></label>
          <RichTextEditor
            initialContent={values.description}
            onChange={(html) => setValues((v) => ({ ...v, description: html }))}
            minHeight={200}
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>
          <button
            onClick={() => onSave(values)}
            disabled={saving || !values.titre || !values.lien || !values.date_fin}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Enregistrement...' : initial ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

type MainTab = 'theses' | 'etudes'

interface Props {
  questionnaires: QuestionnaireThese[]
  etudes: EtudeClinique[]
}

export default function AdminEtudesThesesClient({ questionnaires: initialQ, etudes: initialE }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('theses')

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-white rounded-xl shadow-card p-1 w-fit">
        <button onClick={() => setMainTab('theses')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mainTab === 'theses' ? 'bg-accent-blue text-white' : 'text-gray-500 hover:text-navy hover:bg-surface-light'
          }`}>
          <GraduationCap className="w-4 h-4" />
          Questionnaires de thèse
          <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${mainTab === 'theses' ? 'bg-white/20' : 'bg-gray-100'}`}>{initialQ.length}</span>
        </button>
        <button onClick={() => setMainTab('etudes')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mainTab === 'etudes' ? 'bg-accent-blue text-white' : 'text-gray-500 hover:text-navy hover:bg-surface-light'
          }`}>
          <FlaskConical className="w-4 h-4" />
          Études cliniques
          <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${mainTab === 'etudes' ? 'bg-white/20' : 'bg-gray-100'}`}>{initialE.length}</span>
        </button>
      </div>

      {mainTab === 'theses'
        ? <QuestionnairesSection questionnaires={initialQ} />
        : <EtudesSection etudes={initialE} />
      }
    </div>
  )
}

// ── Section questionnaires de thèse ──────────────────────────────────────────

type TheseTab = 'en_attente' | 'publie' | 'archive' | 'refuse'

const THESE_TABS: { key: TheseTab; label: string }[] = [
  { key: 'en_attente', label: 'En attente' },
  { key: 'publie', label: 'Publiés' },
  { key: 'archive', label: 'Archives' },
  { key: 'refuse', label: 'Refusés' },
]

function filterThese(tab: TheseTab, q: QuestionnaireThese): boolean {
  const expired = isExpired(q.date_fin)
  if (tab === 'archive') return expired && q.statut === 'publie'
  if (tab === 'publie') return q.statut === 'publie' && !expired
  if (tab === 'en_attente') return q.statut === 'en_attente'
  if (tab === 'refuse') return q.statut === 'refuse'
  return false
}

function QuestionnairesSection({ questionnaires: initial }: { questionnaires: QuestionnaireThese[] }) {
  const [questionnaires, setQuestionnaires] = useState(initial)
  const [activeTab, setActiveTab] = useState<TheseTab>('en_attente')
  const [showForm, setShowForm] = useState(false)
  const [editingQ, setEditingQ] = useState<QuestionnaireThese | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = questionnaires.filter((q) => filterThese(activeTab, q))

  const counts: Record<TheseTab, number> = {
    en_attente: questionnaires.filter((q) => filterThese('en_attente', q)).length,
    publie: questionnaires.filter((q) => filterThese('publie', q)).length,
    archive: questionnaires.filter((q) => filterThese('archive', q)).length,
    refuse: questionnaires.filter((q) => filterThese('refuse', q)).length,
  }

  const openCreate = () => { setEditingQ(null); setFormError(null); setShowForm(true) }
  const openEdit = (q: QuestionnaireThese) => { setEditingQ(q); setFormError(null); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditingQ(null) }

  const handleSave = async (values: FormValues) => {
    setSaving(true)
    setFormError(null)
    if (editingQ) {
      const { updateQuestionnaireAdmin } = await import('@/lib/actions/questionnaires-these')
      const result = await updateQuestionnaireAdmin(editingQ.id, values)
      if (result.error) { setFormError(result.error); setSaving(false); return }
      setQuestionnaires((prev) => prev.map((q) => q.id === editingQ.id ? { ...q, ...values } : q))
    } else {
      const { createQuestionnaireAdmin } = await import('@/lib/actions/questionnaires-these')
      const result = await createQuestionnaireAdmin(values)
      if (result.error) { setFormError(result.error); setSaving(false); return }
      const { getAllQuestionnairesAdmin } = await import('@/lib/actions/questionnaires-these')
      setQuestionnaires(await getAllQuestionnairesAdmin())
    }
    setSaving(false)
    closeForm()
  }

  const handleStatut = (id: string, statut: 'publie' | 'refuse') => {
    setPendingId(id)
    startTransition(async () => {
      const { setStatutQuestionnaire } = await import('@/lib/actions/questionnaires-these')
      const result = await setStatutQuestionnaire(id, statut)
      if (!result.error) setQuestionnaires((prev) => prev.map((q) => q.id === id ? { ...q, statut } : q))
      setPendingId(null)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer définitivement ce questionnaire ?')) return
    setPendingId(id)
    startTransition(async () => {
      const { supprimerQuestionnaireAdmin } = await import('@/lib/actions/questionnaires-these')
      await supprimerQuestionnaireAdmin(id)
      setQuestionnaires((prev) => prev.filter((q) => q.id !== id))
      setPendingId(null)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-white rounded-xl shadow-card p-1 w-fit">
          {THESE_TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === key ? 'bg-navy text-white' : 'text-gray-500 hover:text-navy hover:bg-surface-light'
              }`}>
              {key === 'archive' && <Archive className="w-3 h-3" />}
              {label}
              {counts[key] > 0 && (
                <span className={`text-xs rounded-full px-1.5 font-semibold ${activeTab === key ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 transition-colors">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {showForm && (
        <QuestionnaireForm
          initial={editingQ ?? undefined}
          onSave={handleSave}
          onCancel={closeForm}
          saving={saving}
          error={formError}
        />
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-10 text-center">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aucun questionnaire dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const cfg = STATUT_CONFIG[q.statut]
            const StatusIcon = cfg.icon
            const isLoading = isPending && pendingId === q.id
            const expired = isExpired(q.date_fin)

            return (
              <div key={q.id} className={`bg-white rounded-card shadow-card p-5 ${expired ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-4">
                  {q.image_url && (
                    <img src={q.image_url} alt={q.titre} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy text-sm">{q.titre}</p>
                        {q.auteur && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {q.auteur.prenom} {q.auteur.nom}{q.auteur.email ? ` — ${q.auteur.email}` : ''}
                          </p>
                        )}
                        {q.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{stripHtml(q.description)}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${cfg.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {q.date_fin && (
                        <span className={`flex items-center gap-1 text-xs ${expired ? 'text-red-400' : 'text-gray-400'}`}>
                          <CalendarDays className="w-3 h-3" />
                          Fin : {formatDate(q.date_fin)}{expired ? ' (expiré)' : ''}
                        </span>
                      )}
                      <a href={q.lien} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-accent-blue hover:underline">
                        <ExternalLink className="w-3 h-3" />
                        Questionnaire
                      </a>

                      <div className="flex items-center gap-1.5 ml-auto">
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            <button onClick={() => openEdit(q)} disabled={isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                              <Pencil className="w-3.5 h-3.5" />
                              Modifier
                            </button>
                            {q.statut !== 'publie' && (
                              <button onClick={() => handleStatut(q.id, 'publie')} disabled={isPending}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Publier
                              </button>
                            )}
                            {q.statut !== 'refuse' && (
                              <button onClick={() => handleStatut(q.id, 'refuse')} disabled={isPending}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                                <XCircle className="w-3.5 h-3.5" />
                                Refuser
                              </button>
                            )}
                            <button onClick={() => handleDelete(q.id)} disabled={isPending}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Section études cliniques ──────────────────────────────────────────────────

type EtudeTab = 'actives' | 'archives'

function EtudesSection({ etudes: initial }: { etudes: EtudeClinique[] }) {
  const [etudes, setEtudes] = useState(initial)
  const [activeTab, setActiveTab] = useState<EtudeTab>('actives')
  const [editingEtude, setEditingEtude] = useState<EtudeClinique | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const t = today()

  const actives = etudes.filter((e) => !e.date_fin || e.date_fin >= t)
  const archives = etudes.filter((e) => e.date_fin && e.date_fin < t)
  const filtered = activeTab === 'actives' ? actives : archives

  const reload = async () => {
    const { getEtudesCliniquesSuperAdmin } = await import('@/lib/actions/etudes-cliniques')
    setEtudes(await getEtudesCliniquesSuperAdmin())
  }

  const handleCreate = async (formData: FormData) => {
    const { createEtudeCliniqueAdmin } = await import('@/lib/actions/etudes-cliniques')
    await createEtudeCliniqueAdmin(formData)
    await reload()
    setShowCreateForm(false)
  }

  const handleEdit = async (formData: FormData) => {
    if (!editingEtude) return
    const { updateEtudeCliniqueAdmin } = await import('@/lib/actions/etudes-cliniques')
    await updateEtudeCliniqueAdmin(editingEtude.id, formData)
    await reload()
    setEditingEtude(null)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer définitivement cette étude clinique ?')) return
    setPendingId(id)
    startTransition(async () => {
      const { deleteEtudeCliniqueAdmin } = await import('@/lib/actions/etudes-cliniques')
      await deleteEtudeCliniqueAdmin(id)
      setEtudes((prev) => prev.filter((e) => e.id !== id))
      setPendingId(null)
    })
  }

  return (
    <div>
      {/* Header section */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-navy">Études cliniques</h2>
          <p className="text-xs text-emerald-600 font-medium">en partenariat avec le Digital Medical Hub</p>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-card shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-navy">Nouvelle étude clinique</h2>
            <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <EtudeForm onSave={handleCreate} onCancel={() => setShowCreateForm(false)} />
        </div>
      )}

      {editingEtude && !showCreateForm && (
        <div className="bg-white rounded-card shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-navy">Modifier l&apos;étude clinique</h2>
            <button onClick={() => setEditingEtude(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <EtudeForm etude={editingEtude} onSave={handleEdit} onCancel={() => setEditingEtude(null)} />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-white rounded-xl shadow-card p-1 w-fit">
          <button onClick={() => setActiveTab('actives')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'actives' ? 'bg-navy text-white' : 'text-gray-500 hover:text-navy hover:bg-surface-light'
            }`}>
            <FlaskConical className="w-3 h-3" />
            En cours
            {actives.length > 0 && <span className={`text-xs rounded-full px-1.5 font-semibold ${activeTab === 'actives' ? 'bg-white/20' : 'bg-gray-100'}`}>{actives.length}</span>}
          </button>
          <button onClick={() => setActiveTab('archives')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'archives' ? 'bg-navy text-white' : 'text-gray-500 hover:text-navy hover:bg-surface-light'
            }`}>
            <Archive className="w-3 h-3" />
            Archives
            {archives.length > 0 && <span className={`text-xs rounded-full px-1.5 font-semibold ${activeTab === 'archives' ? 'bg-white/20' : 'bg-gray-100'}`}>{archives.length}</span>}
          </button>
        </div>
        <button
          onClick={() => { setEditingEtude(null); setShowCreateForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 transition-colors">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-10 text-center">
          <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {activeTab === 'actives' ? 'Aucune étude clinique en cours.' : 'Aucune étude clinique archivée.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const isLoading = isPending && pendingId === e.id
            const expired = e.date_fin && e.date_fin < t

            return (
              <div key={e.id} className={`bg-white rounded-card shadow-card p-5 ${expired ? 'opacity-70' : ''}`}>
                <div className="flex items-start gap-4">
                  {e.images[0] && (
                    <img src={e.images[0]} alt={e.titre} className="w-14 h-14 object-cover rounded-xl shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy text-sm">{e.titre}</p>
                        {e.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{stripHtml(e.description)}</p>
                        )}
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        expired ? 'text-gray-400 bg-gray-100' : 'text-green-600 bg-green-50'
                      }`}>
                        <FlaskConical className="w-3 h-3" />
                        {expired ? 'Terminée' : 'Active'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {(e.date_debut || e.date_fin) && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <CalendarDays className="w-3 h-3" />
                          {e.date_debut ? formatDate(e.date_debut) : '—'} → {e.date_fin ? formatDate(e.date_fin) : 'indéfini'}
                        </span>
                      )}
                      {e.lien && (
                        <a href={e.lien} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-accent-blue hover:underline">
                          <ExternalLink className="w-3 h-3" />
                          Lien
                        </a>
                      )}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            <button
                              onClick={() => { setShowCreateForm(false); setEditingEtude(e); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                              disabled={isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                              <Pencil className="w-3.5 h-3.5" />
                              Modifier
                            </button>
                            <button onClick={() => handleDelete(e.id)} disabled={isPending}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
