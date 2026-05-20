'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function UtilisateursLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/admin/utilisateurs', label: 'Utilisateurs', exact: true },
    { href: '/admin/utilisateurs/avatars', label: 'Avatars' },
  ]

  return (
    <div className="space-y-4">
      <nav className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'border-accent-blue text-accent-blue'
                    : 'border-transparent text-gray-500 hover:text-navy hover:border-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
      <div>{children}</div>
    </div>
  )
}
