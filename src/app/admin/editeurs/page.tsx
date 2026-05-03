export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus, Pencil, ExternalLink } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import DeleteEditeurButton from '@/components/admin/DeleteEditeurButton'
import AdminEditeurClaims from '@/components/admin/AdminEditeurClaims'
import type { Editeur } from '@/types/models'
import type { ClaimRow, EditeurOption } from '@/components/admin/AdminEditeurClaims'

async function getAllEditeurs(): Promise<Editeur[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('editeurs')
    .select('*')
    .order('nom', { ascending: true })
  if (error) throw error
  return data as Editeur[]
}

async function getEditeurClaims(): Promise<ClaimRow[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('editeur_claims')
    .select(`
      id, created_at, libre_texte, statut, note_admin,
      user:users(nom, prenom, contact_email),
      editeur:editeurs(id, nom, nom_commercial),
      solution:solutions(id, nom)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as unknown as ClaimRow[]
}

export default async function AdminEditeursPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const tab = searchParams.tab === 'demandes' ? 'demandes' : 'editeurs'
  const [editeurs, claims] = await Promise.all([getAllEditeurs(), getEditeurClaims()])

  const pendingCount = claims.filter((c) => c.statut === 'en_attente').length
  const editeurOptions: EditeurOption[] = editeurs.map((e) => ({
    id: e.id,
    nom: e.nom_commercial || e.nom || e.id,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        <Link
          href="/admin/editeurs"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'editeurs'
              ? 'border-navy text-navy'
              : 'border-transparent text-gray-500 hover:text-navy'
          }`}
        >
          Éditeurs
        </Link>
        <Link
          href="/admin/editeurs?tab=demandes"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            tab === 'demandes'
              ? 'border-navy text-navy'
              : 'border-transparent text-gray-500 hover:text-navy'
          }`}
        >
          Demandes
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-orange text-white text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {/* Contenu */}
      {tab === 'editeurs' && (
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
      )}

      {tab === 'demandes' && (
        <AdminEditeurClaims claims={claims} editeurs={editeurOptions} />
      )}
    </div>
  )
}
