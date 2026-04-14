'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { Download, FlaskConical } from 'lucide-react'

type Optin = {
  id: string
  email: string | null
  contact_email: string | null
  nom: string | null
  prenom: string | null
  specialite: string | null
  created_at: string | null
}

export default function HealthDataHubPage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const [optins, setOptins] = useState<Optin[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user || userRole !== 'health_data_hub') {
      router.replace('/mon-compte/profil')
      return
    }

    const load = async () => {
      try {
        const { getHdhOptins } = await import('@/lib/actions/admin-users')
        const data = await getHdhOptins(user.id)
        setOptins(data as Optin[])
      } catch {
        // accès refusé ou erreur réseau
      } finally {
        setFetching(false)
      }
    }

    load()
  }, [user, userRole, loading, router])

  const exportCsv = () => {
    const rows = [
      ['Email', 'Nom', 'Prénom', 'Spécialité', 'Inscrit le'],
      ...optins.map((u) => [
        u.contact_email || u.email || '',
        u.nom || '',
        u.prenom || '',
        u.specialite || '',
        u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '',
      ]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hdh-optins-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading || fetching) {
    return (
      <div className="animate-pulse text-gray-400 text-sm">Chargement...</div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6 text-teal-600" />
          <div>
            <h1 className="text-xl font-bold text-navy">Études cliniques</h1>
            <p className="text-sm text-gray-500">
              {optins.length} utilisateur{optins.length !== 1 ? 's' : ''} inscrit{optins.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
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
        {optins.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">Aucun utilisateur inscrit pour le moment.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-light border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prénom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Spécialité</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Inscrit le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {optins.map((u) => (
                <tr key={u.id} className="hover:bg-surface-light transition-colors">
                  <td className="px-4 py-3 text-gray-700">{u.contact_email || u.email || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-700">{u.nom || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-700">{u.prenom || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{u.specialite || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
