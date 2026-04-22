export const dynamic = 'force-dynamic'

import { createPartenaire } from '@/lib/actions/admin'
import PartenaireForm from '@/components/admin/PartenaireForm'

export default function AdminNouveauPartenairePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-8">Nouveau partenaire</h1>
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <PartenaireForm action={createPartenaire} />
      </div>
    </div>
  )
}
