export const dynamic = 'force-dynamic'

import { getDisplayPrixFront, getDisplayContactsCommerciaux } from '@/lib/db/settings'
import ParametresClient from '@/components/admin/ParametresClient'

export default async function AdminParametresPage() {
  const [displayPrixFront, displayContactsCommerciaux] = await Promise.all([
    getDisplayPrixFront(),
    getDisplayContactsCommerciaux(),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Réglages globaux du site.</p>
      </div>
      <ParametresClient
        initialDisplayPrixFront={displayPrixFront}
        initialDisplayContactsCommerciaux={displayContactsCommerciaux}
      />
    </div>
  )
}
