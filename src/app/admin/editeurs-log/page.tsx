export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'

type LogRow = {
  id: string
  user_id: string | null
  table_cible: string
  id_cible: string
  champ: string
  ancienne_valeur: string | null
  nouvelle_valeur: string | null
  created_at: string
  user?: { nom: string | null; prenom: string | null; contact_email: string | null } | null
}

async function getLogs(): Promise<LogRow[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('editeurs_edit_log')
    .select('id, user_id, table_cible, id_cible, champ, ancienne_valeur, nouvelle_valeur, created_at, user:users(nom, prenom, contact_email)')
    .order('created_at', { ascending: false })
    .limit(200)
  return (data ?? []) as LogRow[]
}

function truncate(s: string | null, max = 80): string {
  if (!s) return '—'
  return s.length > max ? s.slice(0, max) + '…' : s
}

export default async function EditeursLogPage() {
  const logs = await getLogs()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Journal des modifications éditeurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {logs.length} dernière{logs.length > 1 ? 's' : ''} modification{logs.length > 1 ? 's' : ''} faite{logs.length > 1 ? 's' : ''} par les éditeurs (200 max).
          </p>
        </div>
        <Link
          href="/admin/editeurs"
          className="text-sm text-accent-blue hover:underline"
        >
          ← Retour aux éditeurs
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-card shadow-card p-8 text-center text-gray-400 text-sm">
          Aucune modification enregistrée.
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-light border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">Éditeur (user)</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">Table</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">Champ</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">Avant</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">Après</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-light/40">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.user ? (
                      <div>
                        <div className="font-medium text-navy">
                          {[log.user.prenom, log.user.nom].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="text-gray-400">{log.user.contact_email || ''}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">user supprimé</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      log.table_cible === 'editeurs' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.table_cible}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700">{log.champ}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{truncate(log.ancienne_valeur)}</td>
                  <td className="px-4 py-3 text-xs text-navy max-w-xs">{truncate(log.nouvelle_valeur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
