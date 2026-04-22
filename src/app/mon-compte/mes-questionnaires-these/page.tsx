'use client'

import { useEffect, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { ExternalLink, Plus, Trash2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { QuestionnaireThese } from '@/lib/actions/questionnaires-these'

const RichTextEditorLight = dynamic(() => import('@/components/admin/RichTextEditorLight'), { ssr: false })

const STATUT_CONFIG = {
  en_attente: { label: 'En attente de validation', icon: Clock, className: 'text-amber-600 bg-amber-50' },
  publie: { label: 'Publié', icon: CheckCircle, className: 'text-green-600 bg-green-50' },
  refuse: { label: 'Refusé', icon: XCircle, className: 'text-red-600 bg-red-50' },
}

export default function MesQuestionnairesThesePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireThese[]>([])
  const [fetching, setFetching] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [lien, setLien] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/connexion'); return }

    const load = async () => {
      try {
        const { getMesQuestionnaires } = await import('@/lib/actions/questionnaires-these')
        const data = await getMesQuestionnaires()
        setQuestionnaires(data)
        // Ouvrir le formulaire directement si aucun questionnaire existant
        if (data.length === 0) setShowForm(true)
      } finally {
        setFetching(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    startTransition(async () => {
      const { deposerQuestionnaire } = await import('@/lib/actions/questionnaires-these')
      const result = await deposerQuestionnaire({
        titre: titre.trim(),
        description: description.trim() || undefined,
        lien: lien.trim(),
        image_url: imageUrl.trim() || undefined,
        date_fin: dateFin,
      })

      if (result.error) {
        setFormError(result.error)
        return
      }

      // Refresh list
      const { getMesQuestionnaires } = await import('@/lib/actions/questionnaires-these')
      setQuestionnaires(await getMesQuestionnaires())
      setTitre('')
      setDescription('')
      setLien('')
      setImageUrl('')
      setDateFin('')
      setShowForm(false)
      setFormSuccess(true)
      setTimeout(() => setFormSuccess(false), 4000)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const { supprimerQuestionnaire } = await import('@/lib/actions/questionnaires-these')
      await supprimerQuestionnaire(id)
      setQuestionnaires((prev) => prev.filter((q) => q.id !== id))
    })
  }

  if (loading || fetching) {
    return <div className="animate-pulse text-gray-400 py-8">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-navy">Mes questionnaires de thèse</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Déposer un questionnaire
          </button>
        )}
      </div>

      {formSuccess && (
        <div className="bg-green-50 text-green-700 text-sm p-4 rounded-xl mb-6 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Questionnaire déposé — il sera visible après validation par l&apos;équipe.
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-card shadow-card p-6 mb-6">
          <h2 className="text-sm font-semibold text-navy mb-4">Nouveau questionnaire de thèse</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Titre de la thèse *</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="Ex. : Impact de la télémédecine sur les déserts médicaux"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Description <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <RichTextEditorLight
                initialContent={description}
                onChange={setDescription}
                minHeight={150}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lien vers le questionnaire *</label>
              <input
                type="url"
                value={lien}
                onChange={(e) => setLien(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="https://forms.gle/..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin de collecte *</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
              />
              <p className="text-xs text-gray-400 mt-1">Le questionnaire ne sera plus affiché après cette date.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Image / affiche <span className="text-gray-400 font-normal">(URL, optionnel)</span>
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                placeholder="https://..."
              />
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(null) }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-xl hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isPending ? 'Envoi...' : 'Déposer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {questionnaires.length === 0 ? null : (
        <div className="space-y-3">
          {questionnaires.map((q) => {
            const cfg = STATUT_CONFIG[q.statut]
            const StatusIcon = cfg.icon
            return (
              <div key={q.id} className="bg-white rounded-card shadow-card p-5 flex items-start gap-4">
                {q.image_url && (
                  <img
                    src={q.image_url}
                    alt={q.titre}
                    className="w-16 h-16 object-cover rounded-xl shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy text-sm">{q.titre}</p>
                  {q.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{q.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <a
                      href={q.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-accent-blue hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Voir le questionnaire
                    </a>
                  </div>
                </div>
                {q.statut === 'en_attente' && (
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={isPending}
                    className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
