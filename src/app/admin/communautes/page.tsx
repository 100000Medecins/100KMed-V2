export const dynamic = 'force-dynamic'

import { listSolutionCommunautesAdmin } from '@/lib/actions/solution-communautes'
import CommunautesAdminClient from '@/components/admin/CommunautesAdminClient'

export default async function AdminCommunautesPage() {
  const communautes = await listSolutionCommunautesAdmin()
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Communautés autour des solutions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Groupes WhatsApp, Discord, Facebook, forums proposés par les utilisateurs pour chaque solution.
        </p>
      </div>
      <CommunautesAdminClient communautes={communautes} />
    </div>
  )
}
