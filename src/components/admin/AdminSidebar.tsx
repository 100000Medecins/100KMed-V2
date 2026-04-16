'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, FolderOpen, BarChart3, FileText, Mail, Building2, ClipboardList, Home, Newspaper, Users, Search, Video, ListChecks, GraduationCap, Mails } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  children?: { href: string; label: string; icon: React.ElementType }[]
}

const navItems: NavItem[] = [
  {
    href: '/admin/index',
    label: 'Page d\'accueil',
    icon: Home,
    children: [
      { href: '/admin/pages', label: 'Pages statiques', icon: FileText },
    ],
  },
  {
    href: '/admin/solutions',
    label: 'Solutions',
    icon: Package,
    children: [
      { href: '/admin/editeurs', label: 'Éditeurs', icon: Building2 },
      { href: '/admin/categories', label: 'Catégories', icon: FolderOpen },
      { href: '/admin/seo', label: 'SEO', icon: Search },
      { href: '/admin/questionnaires', label: 'Questionnaires', icon: ListChecks },
    ],
  },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin/questionnaires-these', label: 'Études & Thèses', icon: GraduationCap },
  { href: '/admin/videos', label: 'Vidéos & Tutos', icon: Video },
  {
    href: '/admin/emails',
    label: 'Emails',
    icon: Mail,
    children: [
      { href: '/admin/newsletters', label: 'Newsletters', icon: Mails },
    ],
  },
  { href: '/admin/statistiques', label: 'Statistiques', icon: BarChart3 },
]

function matchPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex-shrink-0 p-6 hidden md:block">
      <nav className="bg-white rounded-card shadow-card p-4 space-y-1 sticky top-6">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = matchPath(pathname, item.href)
          const isChildActive = item.children?.some((c) => matchPath(pathname, c.href))

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive || isChildActive
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'text-gray-600 hover:bg-surface-light hover:text-navy'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>

              {item.children && (isActive || isChildActive) && (
                <div className="ml-4 mt-0.5 pl-3 border-l-2 border-accent-blue/20 space-y-0.5">
                  {item.children.map((child) => {
                    const isChildCurrent = matchPath(pathname, child.href)
                    const ChildIcon = child.icon
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isChildCurrent
                            ? 'text-accent-blue bg-accent-blue/10'
                            : 'text-gray-500 hover:text-navy hover:bg-surface-light'
                        }`}
                      >
                        <ChildIcon className="w-3 h-3" />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
