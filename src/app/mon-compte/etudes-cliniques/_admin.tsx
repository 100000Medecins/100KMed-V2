'use client'

import { useEffect, useState, useTransition } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { Download, FlaskConical, Users, Pencil, Trash2, Plus, ExternalLink, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { EtudeClinique } from '@/lib/actions/etudes-cliniques'
import { resolveSpecialite } from '@/lib/constants/profil'

const EtudeForm = dynamic(() => import('@/components/etudes/EtudeForm'), { ssr: false })

type Optin = {
  id: string
  email: string | null
  contact_email: string | null
  nom: string | null
  prenom: string | null
  specialite: string | null
  created_at: string | null
}

type Tab = 'inscrits' | 'etudes'

export default function EtudesCliniquesAdmin() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('etudes')

  const [optins, setOptins] = useState<Optin[]>([])
  const [fetchingOptins, setFetchingOptins] = useState(true)

  const [etudes, setEtudes] = useState<EtudeClinique[]>([])
  const [fetchingEtudes, setFetchingEtudes] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEtude, setEditingEtude] = useState<EtudeClinique | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (loading) return
    if (!user || userRole !== 'digital_medical_hub') {
      router.replace('/mon-compte/profil')
      return
    }

    const loadOptins = async () => {
      const { getHdhOptins } = await import('@/lib/actions/admin-users')
      const data = await getHdhOptins(user.id)
      setOptins(data as Optin[])
      setFetchingOptins(false)
    }

    const loadEtudes = async () => {
      const { getEtudesAdmin } = await import('@/lib/actions/etudes-cliniques')
      const data = await getEtudesAdmin()
      setEtudes(data)
      setFetchingEtudes(false)
    }

    loadOptins()
    loadEtudes()
  }, [user, userRole, loading, router])

  const refreshEtudes = async () => {
    const { getEtudesAdmin } = await import('@/lib/actions/etudes-cliniques')
    setEtudes(await getEtudesAdmin())
  }

  const handleSave = async (formData: FormData) => {
    const { createEtudeClinique, updateEtudeClinique } = await import('@/lib/actions/etudes-cliniques')
    if (editingEtude) {
      await updateEtudeClinique(editingEtude.id, formData)
    } else {
      await createEtudeClinique(formData)
    }
    setShowForm(false)
    setEditingEtude(null)
    await refreshEtudes()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette étude ?')) return
    setDeletingId(id)
    const { deleteEtudeClinique } = await import('@/lib/actions/etudes-cliniques')
    await deleteEtudeClinique(id)
    await refreshEtudes()
    setDeletingId(null)
  }

  const exportCsv = () => {
    const rows = [
      ['Email', 'Nom', 'Prénom', 'Spécialité', 'Inscrit le'],
      ...optins.map((u) => [
        u.contact_email || u.email || '',
        u.nom || '',
        u.prenom || '',
        resolveSpecialite(u.specialite) || '',
        u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '',
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `dmh-optins-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="animate-pulse text-gray-400 text-sm">Chargement…</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <FlaskConical className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy">Études cliniques</h1>
          <p className="text-sm text-emerald-600 font-medium">en partenariat avec le Digital Medical Hub</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-light rounded-xl p-1 w-fit">
        {([['etudes', 'Gérer les études', FlaskConical], ['inscrits', `Inscrits (${optins.length})`, Users]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white shadow-sm text-navy' : 'text-gray-500 hover:text-navy'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Onglet Études */}
      {tab === 'etudes' && (
        <div className="space-y-4">
          {!showForm && !editingEtude && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouvelle étude
            </button>
          )}

          {showForm && !editingEtude && (
            <div className="bg-white rounded-card shadow-card p-6">
              <h2 className="text-base font-bold text-navy mb-5">Nouvelle étude clinique</h2>
              <EtudeForm onSave={handleSave} onCancel={() => setShowForm(false)} />
            </div>
          )}

          {fetchingEtudes ? (
            <div className="animate-pulse text-gray-400 text-sm">Chargement…</div>
          ) : etudes.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-8 text-center text-gray-400 text-sm">
              Aucune étude clinique créée pour l'instant.
            </div>
          ) : (
            <div className="space-y-4">
              {etudes.map((etude) => (
                <div key={etude.id}>
                  {editingEtude?.id === etude.id ? (
                    <div className="bg-white rounded-card shadow-card p-6">
                      <h2 className="text-base font-bold text-navy mb-5">Modifier l'étude</h2>
                      <EtudeForm
                        etude={etude}
                        onSave={handleSave}
                        onCancel={() => setEditingEtude(null)}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-card shadow-card p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-navy">{etude.titre}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {etude.date_debut && <span>Du {new Date(etude.date_debut).toLocaleDateString('fr-FR')}</span>}
                            {etude.date_fin && <span>au {new Date(etude.date_fin).toLocaleDateString('fr-FR')}</span>}
                            {!etude.date_debut && !etude.date_fin && <span>Toujours visible</span>}
                            {etude.lien && (
                              <a href={etude.lien} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent-blue hover:underline">
                                <ExternalLink className="w-3 h-3" /> Lien
                              </a>
                            )}
                            <span>{etude.images.length} image{etude.images.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => { setEditingEtude(etude); setShowForm(false) }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(etude.id)}
                            disabled={deletingId === etude.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === etude.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Supprimer
                          </button>
                        </div>
                      </div>
                      {etude.images.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {etude.images.slice(0, 4).map((url, i) => (
                            <img key={i} src={url} alt="" className="w-16 h-12 object-cover rounded-lg" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Inscrits */}
      {tab === 'inscrits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{optins.length} utilisateur{optins.length !== 1 ? 's' : ''} inscrit{optins.length !== 1 ? 's' : ''}</p>
            {optins.length > 0 && (
              <button
                onClick={exportCsv}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporter CSV
              </button>
            )}
          </div>

          <div className="bg-white rounded-card shadow-card overflow-hidden">
            {fetchingOptins ? (
              <div className="p-6 animate-pulse text-gray-400 text-sm">Chargement…</div>
            ) : optins.length === 0 ? (
              <p className="text-sm text-gray-500 p-6">Aucun utilisateur inscrit pour le moment.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-light border-b border-gray-100">
                  <tr>
                    {['Email', 'Nom', 'Prénom', 'Spécialité', 'Inscrit le'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {optins.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-light transition-colors">
                      <td className="px-4 py-3 text-gray-700">{u.contact_email || u.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{u.nom || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{u.prenom || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{resolveSpecialite(u.specialite) || '—'}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
