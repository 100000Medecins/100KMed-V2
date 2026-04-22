export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus, Pencil, ExternalLink } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import DeleteEditeurButton from '@/components/admin/DeleteEditeurButton'
import type { Editeur } from '@/types/models'

async function getAllEditeurs(): Promise<Editeur[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('editeurs')
    .select('*')
    .order('nom', { ascending: true })
  if (error) throw error
  return data as Editeur[]
}

export default async function AdminEditeursPage() {
  const editeurs = await getAllEditeurs()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Éditeurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {editeurs.length} éditeur{editeurs.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/admin/editeurs/nouveau"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft hover:shadow-card transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          Ajouter un éditeur
        </Link>
      </div>

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {editeurs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Aucun éditeur pour l'instant.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-light border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Éditeur</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 hidden md:table-cell">Ville</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500 hidden lg:table-cell">Site web</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {editeurs.map((ed) => (
                <tr key={ed.id} className="hover:bg-surface-light transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {ed.logo_url ? (
                        <img
                          src={ed.logo_url}
                          alt={ed.logo_titre || ed.nom || ''}
                          className="h-8 w-16 object-contain rounded bg-gray-50 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-16 rounded bg-gray-100 flex-shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-navy">{ed.nom_commercial || ed.nom}</p>
                          {!ed.description && !ed.website && !ed.logo_url && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                              À compléter
                            </span>
                          )}
                        </div>
                        {ed.nom_commercial && ed.nom && (
                          <p className="text-xs text-gray-400">{ed.nom}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                    {ed.contact_ville || '—'}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    {ed.website ? (
                      <a
                        href={ed.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent-blue hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {(() => { try { return new URL(ed.website!).hostname } catch { return ed.website } })()}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/editeurs/${ed.id}/modifier`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Modifier
                      </Link>
                      <DeleteEditeurButton id={ed.id} nom={ed.nom_commercial || ed.nom} />
                    </div>
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
