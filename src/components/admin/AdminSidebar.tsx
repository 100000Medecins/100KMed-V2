'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, FolderOpen, BarChart3, FileText, Mail, Building2, ClipboardList, Home, Newspaper, Users, Search, Video, ListChecks, GraduationCap, BookOpen, CalendarDays, Sparkles, MessageCircle } from 'lucide-react'
import type { AdminBadges } from '@/lib/db/admin-badges'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badgeKey?: keyof AdminBadges  // si défini → applique le badge correspondant
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    href: '/admin/index',
    label: 'Page d\'accueil',
    icon: Home,
    children: [
      { href: '/admin/pages', label: 'Pages statiques', icon: FileText },
      { href: '/admin/acronymes', label: 'Glossaire', icon: BookOpen },
    ],
  },
  {
    href: '/admin/solutions',
    label: 'Solutions',
    icon: Package,
    children: [
      { href: '/admin/editeurs', label: 'Éditeurs', icon: Building2, badgeKey: 'editeurClaims' },
      { href: '/admin/categories', label: 'Catégories', icon: FolderOpen },
      { href: '/admin/seo', label: 'SEO', icon: Search },
      { href: '/admin/questionnaires', label: 'Questionnaires', icon: ListChecks },
    ],
  },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin/questionnaires-these', label: 'Études & Thèses', icon: GraduationCap, badgeKey: 'etudesThese' },
  { href: '/admin/videos', label: 'Vidéos & Tutos', icon: Video, badgeKey: 'videos' },
  { href: '/admin/propositions', label: 'Propositions', icon: Sparkles, badgeKey: 'propositions' },
  { href: '/admin/communautes', label: 'Communautés', icon: MessageCircle, badgeKey: 'communautes' },
  { href: '/admin/emails', label: 'Emails', icon: Mail, badgeKey: 'emails' },
  { href: '/admin/planning', label: 'Planning', icon: CalendarDays },
  { href: '/admin/statistiques', label: 'Statistiques', icon: BarChart3 },
]

function matchPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function AdminSidebar({ badges }: { badges: AdminBadges }) {
  const pathname = usePathname()

  // Le badge d'un parent agrège les badges de ses enfants
  const getBadgeForItem = (item: NavItem): number => {
    let total = item.badgeKey ? badges[item.badgeKey] : 0
    if (item.children) {
      for (const child of item.children) {
        if (child.badgeKey) total += badges[child.badgeKey]
      }
    }
    return total
  }

  return (
    <aside className="w-64 flex-shrink-0 p-6 hidden md:block">
      <nav className="bg-white rounded-card shadow-card p-4 space-y-1 sticky top-6">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = matchPath(pathname, item.href)
          const isChildActive = item.children?.some((c) => matchPath(pathname, c.href))
          const parentBadge = getBadgeForItem(item)

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
                <span className="flex-1">{item.label}</span>
                <Badge count={parentBadge} />
              </Link>

              {item.children && (isActive || isChildActive) && (
                <div className="ml-4 mt-0.5 pl-3 border-l-2 border-accent-blue/20 space-y-0.5">
                  {item.children.map((child) => {
                    const isChildCurrent = matchPath(pathname, child.href)
                    const ChildIcon = child.icon
                    const childBadge = child.badgeKey ? badges[child.badgeKey] : 0
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
                        <span className="flex-1">{child.label}</span>
                        <Badge count={childBadge} />
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
