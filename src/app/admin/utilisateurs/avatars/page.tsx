export const dynamic = 'force-dynamic'

import { adminGetCatalogAvatars, adminGetPersonalAvatarsCount } from '@/lib/actions/admin-avatars'
import AdminAvatarsManager from '@/components/admin/AdminAvatarsManager'

export default async function AvatarsAdminPage() {
  const [catalogAvatars, personalCount] = await Promise.all([
    adminGetCatalogAvatars(),
    adminGetPersonalAvatarsCount(),
  ])

  return <AdminAvatarsManager initialCatalog={catalogAvatars} personalCount={personalCount} />
}
