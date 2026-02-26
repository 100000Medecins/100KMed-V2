import Link from 'next/link'
import { logoutAdmin } from '@/lib/actions/admin'
import { LogOut } from 'lucide-react'

export default function AdminHeader() {
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
      <Link href="/admin" className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-yellow" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-orange" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-pink" />
        </div>
        <span className="font-bold text-navy text-sm">
          10000médecins<span className="text-gray-400 font-normal ml-1">Admin</span>
        </span>
      </Link>
      <form action={logoutAdmin}>
        <button
          type="submit"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </form>
    </header>
  )
}
