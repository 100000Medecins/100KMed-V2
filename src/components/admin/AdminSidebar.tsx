'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Package, FolderOpen, BarChart3, FileText, Mail, Building2, Home, Newspaper, Users, Search, Video, ListChecks, GraduationCap, BookOpen, CalendarDays, Sparkles, MessageCircle, Settings, Activity, X } from 'lucide-react'
import type { AdminBadges } from '@/lib/db/admin-badges'
import { useAdminMobileNav } from '@/stores/useAdminMobileNav'

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
      { href: '/admin/communautes', label: 'Communautés', icon: MessageCircle, badgeKey: 'communautes' },
      { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
  { href: '/admin/activite', label: 'Activité', icon: Activity, badgeKey: 'activite' },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
  { href: '/admin/blog', label: 'Blog', icon: Newspaper },
  { href: '/admin/questionnaires-these', label: 'Études & Thèses', icon: GraduationCap, badgeKey: 'etudesThese' },
  { href: '/admin/videos', label: 'Vidéos & Tutos', icon: Video, badgeKey: 'videos' },
  { href: '/admin/propositions', label: 'Propositions', icon: Sparkles, badgeKey: 'propositions' },
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

/**
 * Liste de navigation extraite — rendue à la fois dans l'aside desktop
 * et dans le drawer mobile pour éviter la duplication du code des liens.
 */
function NavList({ badges, onLinkClick }: { badges: AdminBadges; onLinkClick?: () => void }) {
  const pathname = usePathname()

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
    <nav className="bg-white rounded-card shadow-card p-4 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = matchPath(pathname, item.href)
        const isChildActive = item.children?.some((c) => matchPath(pathname, c.href))
        const parentBadge = getBadgeForItem(item)

        return (
          <div key={item.href}>
            <Link
              href={item.href}
              onClick={onLinkClick}
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
                      onClick={onLinkClick}
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
  )
}

export default function AdminSidebar({ badges }: { badges: AdminBadges }) {
  const { isOpen, close } = useAdminMobileNav()
  const pathname = usePathname()

  // Auto-fermeture du drawer mobile à chaque changement de route.
  useEffect(() => {
    close()
  }, [pathname, close])

  // Bloquer le scroll body quand le drawer est ouvert.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Fermer avec ESC.
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, close])

  return (
    <>
      {/* Sidebar desktop — sticky, inchangée */}
      <aside className="w-64 flex-shrink-0 p-6 hidden md:block">
        <div className="sticky top-6">
          <NavList badges={badges} />
        </div>
      </aside>

      {/* Backdrop mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer mobile — slide-in depuis la gauche */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-surface-light z-50 md:hidden transform transition-transform shadow-2xl overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation admin"
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Menu admin</span>
          <button
            type="button"
            onClick={close}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-navy transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <NavList badges={badges} onLinkClick={close} />
        </div>
      </aside>
    </>
  )
}
