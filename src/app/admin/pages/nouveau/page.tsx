export const dynamic = 'force-dynamic'

import { createPageStatique } from '@/lib/actions/admin'

export default function AdminNouvellePagePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Nouvelle page</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8 max-w-lg">
        <form action={createPageStatique} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Titre *</label>
            <input
              name="titre"
              type="text"
              required
              placeholder="Ex : Notre charte éditoriale"
              className="w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Slug (URL) *</label>
            <input
              name="slug"
              type="text"
              required
              placeholder="Ex : charte-editoriale"
              className="w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-5 py-3"
            />
            <p className="text-xs text-gray-400 mt-1">Sans espaces ni caractères spéciaux. Sera accessible à /[slug].</p>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm bg-navy text-white hover:bg-navy-dark shadow-soft transition-all"
            >
              Créer la page
            </button>
            <a
              href="/admin/pages"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm border-2 border-navy text-navy hover:bg-navy hover:text-white transition-all"
            >
              Annuler
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
