'use client'

import Link from 'next/link'
import Image from 'next/image'
import { logoutAdmin } from '@/lib/actions/admin'
import { LogOut, Menu } from 'lucide-react'
import { useAdminMobileNav } from '@/stores/useAdminMobileNav'

export default function AdminHeader() {
  const { toggle } = useAdminMobileNav()

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-3">
        {/* Bouton burger — uniquement sur mobile (la sidebar est cachée < md) */}
        <button
          type="button"
          onClick={toggle}
          className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-navy transition-colors"
          aria-label="Ouvrir le menu admin"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link href="/admin" className="flex items-center gap-3">
          <Image
            src="/logos/logo-secondaire-couleur.svg"
            alt="100 000 Médecins"
            width={220}
            height={52}
            className="h-[40px] md:h-[52px]"
            style={{ width: 'auto' }}
            priority
            unoptimized
          />
          <span className="text-gray-300 text-sm font-light hidden sm:inline">|</span>
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wide hidden sm:inline">Admin</span>
        </Link>
      </div>

      <form action={logoutAdmin}>
        <button
          type="submit"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </form>
    </header>
  )
}
