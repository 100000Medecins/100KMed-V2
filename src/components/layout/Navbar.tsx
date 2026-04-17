"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, ChevronDown, LogOut, UserCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import type { NavCategorie, NavResponse } from "@/app/api/nav-categories/route";

type Groupe = {
  nom: string
  ordre: number
  categories: NavCategorie[]
}

function buildGroupes(categories: NavCategorie[]): Groupe[] {
  const map = new Map<string, Groupe>()

  for (const cat of categories) {
    const key = cat.groupe_id ?? '__aucun__'
    if (!map.has(key)) {
      map.set(key, {
        nom: cat.groupe_nom ?? 'Autres',
        ordre: cat.groupe_ordre ?? 999,
        categories: [],
      })
    }
    map.get(key)!.categories.push(cat)
  }

  return Array.from(map.values()).sort((a, b) => a.ordre - b.ordre)
}

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileComparatifOpen, setIsMobileComparatifOpen] = useState(true);
  const [categories, setCategories] = useState<NavCategorie[]>([]);
  const [navConfig, setNavConfig] = useState<NavResponse['navConfig']>({ irritants_visible: false, blog_visible: false });
  const [navLoaded, setNavLoaded] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch('/api/nav-categories')
      .then((r) => r.json())
      .then((data: NavResponse) => {
        setCategories(data.categories ?? [])
        setNavConfig(data.navConfig ?? { irritants_visible: false, blog_visible: false })
        setNavLoaded(true)
      })
      .catch(() => {})
  }, [])

  // Fermer les menus en cliquant en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setIsMegaMenuOpen(false)
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleMenuMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setIsMegaMenuOpen(true)
  }

  function handleMenuMouseLeave() {
    closeTimer.current = setTimeout(() => setIsMegaMenuOpen(false), 150)
  }

  const groupes = buildGroupes(categories)
  // Navbar toujours sombre sauf sur le hero non scrollé (transparente)
  const darkNav = true
  const navBg = isHome && !isScrolled
    ? 'transparent'
    : 'linear-gradient(135deg, rgba(10,90,90,0.80) 0%, rgba(80,30,130,0.75) 55%, rgba(20,50,110,0.82) 100%)'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: navBg,
        backdropFilter: 'blur(16px)',
        boxShadow: isHome && !isScrolled ? 'none' : '0 2px 20px rgba(0,0,0,0.18)',
      }}
    >
      <nav className="max-w-7xl mx-auto px-6 grid grid-cols-[auto_1fr_auto_auto] lg:grid-cols-[auto_1fr_auto] items-center h-[72px] gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center shrink-0">
          <Image
            src="/logos/logo-secondaire-couleur.svg"
            alt="100 000 Médecins"
            width={260}
            height={61}
            className="h-[61px] w-auto"
            priority
            unoptimized
          />
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center justify-center gap-6 min-w-0">
          {/* Mega-menu Comparatifs */}
          <div
            ref={megaMenuRef}
            className="relative"
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            <button
              type="button"
              className={`flex items-center gap-1 text-sm font-medium transition-colors duration-500 ${darkNav ? 'text-white/85 hover:text-white' : 'text-gray-600 hover:text-navy'}`}
              onClick={() => setIsMegaMenuOpen((v) => !v)}
            >
              Comparatifs
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMegaMenuOpen && categories.length > 0 && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full mt-3 rounded-2xl p-6 min-w-[480px] max-w-[640px]"
                style={{ background: 'linear-gradient(135deg, rgba(10,90,90,0.97) 0%, rgba(80,30,130,0.95) 55%, rgba(20,50,110,0.97) 100%)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
              >
                <div className={`grid gap-6 ${groupes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {groupes.map((groupe) => (
                    <div key={groupe.nom}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
                        {groupe.nom}
                      </p>
                      <ul className="space-y-1">
                        {groupe.categories.map((cat) => (
                          <li key={cat.slug}>
                            <a
                              href={`/solutions/${cat.slug}`}
                              className="block text-sm text-white/75 hover:text-white hover:bg-white/10 px-2 py-1.5 rounded-lg transition-colors"
                            >
                              {cat.nom}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <a
                    href="/comparatifs"
                    className="text-xs font-semibold text-accent-blue hover:underline"
                  >
                    Voir tous les comparatifs →
                  </a>
                </div>
              </div>
            )}
          </div>

          <a
            href="/qui-sommes-nous"
            className={`text-sm font-medium transition-colors duration-500 ${darkNav ? 'text-white/85 hover:text-white' : 'text-gray-600 hover:text-navy'}`}
          >
            Qui sommes-nous ?
          </a>

          {navLoaded && navConfig.irritants_visible && (
            <a
              href="/irritants-esante"
              className={`text-sm font-medium transition-colors duration-500 ${darkNav ? 'text-white/85 hover:text-white' : 'text-gray-600 hover:text-navy'}`}
            >
              Les irritants de l'e-santé
            </a>
          )}

          {navLoaded && navConfig.blog_visible && (
            <a
              href="/blog"
              className={`text-sm font-medium transition-colors duration-500 ${darkNav ? 'text-white/85 hover:text-white' : 'text-gray-600 hover:text-navy'}`}
            >
              Blog
            </a>
          )}
        </div>

        {/* CTA desktop */}
        <div className="hidden lg:flex items-center gap-3">
          {!loading && user ? (
            <>
              <Button variant={darkNav ? "white" : "primary"} href="/solution/noter">
                Évaluer un logiciel
              </Button>
              {/* Dropdown Mon compte */}
              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((v) => !v)}
                  className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-button font-semibold text-sm transition-all duration-300 border-2 border-white text-white hover:bg-white hover:text-navy ${darkNav ? '' : '!border-navy !text-navy hover:!bg-navy hover:!text-white'}`}
                >
                  Mon compte
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-xl border border-white/10"
                    style={{ background: 'linear-gradient(135deg, rgba(10,90,90,0.97) 0%, rgba(80,30,130,0.95) 55%, rgba(20,50,110,0.97) 100%)', backdropFilter: 'blur(8px)' }}>
                    <a
                      href="/mon-compte/profil"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <UserCircle className="w-4 h-4" />
                      Mon compte
                    </a>
                    <div className="border-t border-white/10" />
                    <button
                      type="button"
                      onClick={() => { setIsAccountMenuOpen(false); signOut() }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-white/85 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button variant={darkNav ? "white" : "primary"} href="/solution/noter">
                Évaluer un logiciel
              </Button>
              <Button variant="white" href="/connexion" className={darkNav ? '' : '!border-navy !text-navy hover:!bg-navy hover:!text-white'}>
                Me connecter
              </Button>
            </>
          )}
        </div>

        {/* Mobile : bouton Évaluer + toggle */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`lg:hidden p-2 transition-colors duration-500 ${darkNav ? 'text-white' : 'text-navy'}`}
          aria-label="Menu"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="lg:hidden">
          <Button variant="white" href="/solution/noter" className="text-xs py-1.5 px-3">
            Évaluer
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMobileOpen && (
        <div className="lg:hidden border-t border-white/10 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(10,90,90,0.95) 0%, rgba(80,30,130,0.92) 55%, rgba(20,50,110,0.95) 100%)', backdropFilter: 'blur(16px)' }}>
          <div className="px-6 py-6 space-y-2">
            {/* Comparatifs accordion */}
            <div>
              <button
                type="button"
                onClick={() => setIsMobileComparatifOpen((v) => !v)}
                className="flex items-center justify-between w-full text-sm text-white/85 hover:text-white font-medium py-2"
              >
                Comparatifs
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileComparatifOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMobileComparatifOpen && (
                <div className="pl-4 mt-1 space-y-3 pb-2">
                  {groupes.map((groupe) => (
                    <div key={groupe.nom}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">
                        {groupe.nom}
                      </p>
                      <ul className="space-y-1">
                        {groupe.categories.map((cat) => (
                          <li key={cat.slug}>
                            <a
                              href={`/solutions/${cat.slug}`}
                              className="block text-sm text-white/75 hover:text-white py-1"
                              onClick={() => setIsMobileOpen(false)}
                            >
                              {cat.nom}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <a
                    href="/comparatifs"
                    className="block text-xs font-semibold text-accent-blue pt-1"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Voir tous les comparatifs →
                  </a>
                </div>
              )}
            </div>

            <a
              href="/qui-sommes-nous"
              className="block text-sm text-white/85 hover:text-white font-medium py-2"
              onClick={() => setIsMobileOpen(false)}
            >
              Qui sommes-nous ?
            </a>

            {navLoaded && navConfig.irritants_visible && (
              <a
                href="/irritants-esante"
                className="block text-sm text-white/85 hover:text-white font-medium py-2"
                onClick={() => setIsMobileOpen(false)}
              >
                Les irritants de l'e-santé
              </a>
            )}

            {navLoaded && navConfig.blog_visible && (
              <a
                href="/blog"
                className="block text-sm text-white/85 hover:text-white font-medium py-2"
                onClick={() => setIsMobileOpen(false)}
              >
                Blog
              </a>
            )}

            <div className="pt-4 space-y-2">
              {!loading && user ? (
                <>
                  <Button variant="primary" href="/solution/noter" className="w-full justify-center">
                    Évaluer un logiciel
                  </Button>
                  <Button variant="white" href="/mon-compte/profil" className="w-full justify-center" onClick={() => setIsMobileOpen(false)}>
                    <UserCircle className="w-4 h-4" />
                    Mon compte
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setIsMobileOpen(false); signOut() }}
                    className="inline-flex items-center justify-center gap-2 w-full px-7 py-3.5 rounded-button font-semibold text-sm transition-all duration-300 border-2 border-white/50 text-white/70 hover:border-white hover:text-white"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <Button variant="primary" href="/solution/noter" className="w-full justify-center">
                    Évaluer un logiciel
                  </Button>
                  <Button variant="white" href="/connexion" className="w-full justify-center">
                    Me connecter
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
