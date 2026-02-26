import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

function isValidToken(token: string): boolean {
  const expected = createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
  return token === expected
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value

  if (!token || !isValidToken(token)) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <AdminLoginForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-light">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
