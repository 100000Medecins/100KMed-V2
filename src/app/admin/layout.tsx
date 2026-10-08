import AdminLoginForm from '@/components/admin/AdminLoginForm'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import { getAdminBadges } from '@/lib/db/admin-badges'
import { roleAdmin } from '@/lib/auth/admin-guard'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await roleAdmin()

  if (!role) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <AdminLoginForm />
      </div>
    )
  }

  const badges = await getAdminBadges()

  return (
    <div className="min-h-screen bg-surface-light">
      <AdminHeader role={role} />
      <div className="flex">
        <AdminSidebar badges={badges} role={role} />
        <main className="flex-1 p-6 md:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
