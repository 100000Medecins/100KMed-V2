'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, FolderOpen, BarChart3, FileText, Mail, Building2, ClipboardList, Home, Newspaper } from 'lucide-react'

const navItems = [
  { href: '/admin/index', label: 'Page d\'accueil', icon: Home },
  { href: '/admin/solutions', label: 'Solutions', icon: Package },
  { href: '/admin/editeurs', label: 'Éditeurs', icon: Building2 },
  { href: '/admin/categories', label: 'Catégories', icon: FolderOpen },
  { href: '/admin/questionnaires', label: 'Questionnaires', icon: ClipboardList },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin/pages', label: 'Pages statiques', icon: FileText },
  { href: '/admin/emails', label: 'Emails', icon: Mail },
  { href: '/admin/statistiques', label: 'Statistiques', icon: BarChart3 },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 p-6 hidden md:block">
      <nav className="bg-white rounded-card shadow-card p-4 space-y-1 sticky top-6">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-gray-600 hover:bg-surface-light hover:text-navy'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
