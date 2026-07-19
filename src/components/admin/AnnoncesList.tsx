'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteAnnonce, toggleAnnonceActif } from '@/lib/actions/admin'
import type { Annonce } from '@/lib/db/annonces'

function ToggleActif({ id, actif }: { id: string; actif: boolean }) {
  const [localActif, setLocalActif] = useState(actif)
  const [, startTransition] = useTransition()

  function handleToggle() {
    const newValue = !localActif
    setLocalActif(newValue)
    startTransition(async () => {
      await toggleAnnonceActif(id, newValue)
    })
  }

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:ring-offset-2 ${
        localActif ? 'bg-green-500' : 'bg-gray-300'
      }`}
      title={localActif ? 'Désactiver' : 'Activer'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          localActif ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function statutFenetre(a: Annonce): { label: string; cls: string } {
  const now = Date.now()
  const debut = new Date(a.date_debut).getTime()
  const fin = new Date(a.date_fin).getTime()
  if (now < debut) return { label: 'À venir', cls: 'bg-blue-50 text-blue-600' }
  if (now > fin) return { label: 'Expirée', cls: 'bg-gray-100 text-gray-500' }
  return { label: 'En cours', cls: 'bg-green-50 text-green-600' }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AnnoncesList({ initialAnnonces }: { initialAnnonces: Annonce[] }) {
  const [annonces, setAnnonces] = useState(initialAnnonces)
  const [, startTransition] = useTransition()

  function handleDelete(id: string, titre: string) {
    if (!confirm(`Supprimer l'annonce "${titre}" ?`)) return
    startTransition(async () => {
      await deleteAnnonce(id)
      setAnnonces((prev) => prev.filter((a) => a.id !== id))
    })
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Titre</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Fenêtre
              </th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">État</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {annonces.map((a) => {
              const st = statutFenetre(a)
              return (
                <tr key={a.id} className="hover:bg-surface-light transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-navy text-sm">{a.titre}</div>
                    {a.cta_label && a.cta_url && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        CTA : {a.cta_label} → {a.cta_url}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap">
                    {fmtDate(a.date_debut)}
                    <br />→ {fmtDate(a.date_fin)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <ToggleActif id={a.id} actif={a.actif} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/annonces/${a.id}/modifier`}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                      >
                        Éditer <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(a.id, a.titre)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {annonces.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                  Aucune annonce pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
