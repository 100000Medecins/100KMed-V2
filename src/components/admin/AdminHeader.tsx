import Link from 'next/link'
import Image from 'next/image'
import { logoutAdmin } from '@/lib/actions/admin'
import { LogOut } from 'lucide-react'

export default function AdminHeader() {
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
      <Link href="/admin" className="flex items-center gap-3">
        <Image
          src="/logos/logo-secondaire-couleur.svg"
          alt="100 000 Médecins"
          width={140}
          height={33}
          className="h-8 w-auto"
          priority
          unoptimized
        />
        <span className="text-gray-300 text-sm font-light">|</span>
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Admin</span>
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
