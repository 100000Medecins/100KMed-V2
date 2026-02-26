export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'

async function getAllPagesStatiquesAdmin() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('pages_statiques')
    .select('*')
    .order('titre', { ascending: true })

  if (error) throw error
  return data
}

export default async function AdminBlogPage() {
  const pages = await getAllPagesStatiquesAdmin()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Blog</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pages.length} page{pages.length > 1 ? 's' : ''} statique{pages.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Titre
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Slug
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Dernière modification
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-surface-light transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-navy text-sm">{page.titre}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono hidden md:table-cell">
                    /{page.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {page.updated_at
                      ? new Date(page.updated_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/blog/${page.id}/modifier`}
                      className="p-2 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors inline-flex"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
