export const dynamic = 'force-dynamic'

import EditeurSearchPreview from '@/components/admin/EditeurSearchPreview'

export default function AdminNouvelEditeurPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Nouvel éditeur</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <EditeurSearchPreview />
      </div>
    </div>
  )
}
