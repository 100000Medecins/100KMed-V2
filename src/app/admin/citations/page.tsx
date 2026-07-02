export const dynamic = 'force-dynamic'

import { getAllCitationsAdmin } from '@/lib/db/citations'
import AdminCitationsClient from '@/components/admin/AdminCitationsClient'

export default async function AdminCitationsPage() {
  const citations = await getAllCitationsAdmin()
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Citations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Corpus du carrousel affiché en tête des pages catalogue. Seules les citations
          <span className="font-medium text-green-600"> publiées </span>
          sont visibles sur le site.
        </p>
      </div>
      <AdminCitationsClient citations={citations} />
    </div>
  )
}
