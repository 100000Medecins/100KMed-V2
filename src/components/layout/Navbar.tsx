"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
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
  const { user, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileComparatifOpen, setIsMobileComparatifOpen] = useState(false);
  const [categories, setCategories] = useState<NavCategorie[]>([]);
  const [navConfig, setNavConfig] = useState<NavResponse['navConfig']>({ irritants_visible: true, blog_visible: true });
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
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
        setNavConfig(data.navConfig ?? { irritants_visible: true, blog_visible: true })
      })
      .catch(() => {})
  }, [])

  // Fermer le mega-menu en cliquant en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setIsMegaMenuOpen(false)
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-nav" : "bg-white"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 grid grid-cols-[auto_1fr_auto] items-center h-[72px] gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex gap-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-blue" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent-orange" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent-pink" />
            <span className="w-2.5 h-2.5 rounded-full bg-rating-green" />
            <span className="w-2.5 h-2.5 rounded-full bg-accent-yellow" />
          </div>
          <span className="text-base font-bold text-navy hidden sm:block">
            100000médecins<span className="text-accent-blue">.org</span>
          </span>
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
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-navy font-medium transition-colors"
              onClick={() => setIsMegaMenuOpen((v) => !v)}
            >
              Comparatifs
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMegaMenuOpen && categories.length > 0 && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full mt-3 bg-white rounded-2xl shadow-card border border-gray-100 p-6 min-w-[480px] max-w-[640px]"
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
              >
                <div className={`grid gap-6 ${groupes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {groupes.map((groupe) => (
                    <div key={groupe.nom}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        {groupe.nom}
                      </p>
                      <ul className="space-y-1">
                        {groupe.categories.map((cat) => (
                          <li key={cat.slug}>
                            <a
                              href={`/solutions/${cat.slug}`}
                              className="block text-sm text-gray-700 hover:text-accent-blue hover:bg-accent-blue/5 px-2 py-1.5 rounded-lg transition-colors"
                            >
                              {cat.nom}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
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
            className="text-sm text-gray-600 hover:text-navy font-medium transition-colors"
          >
            Qui sommes-nous ?
          </a>

          {navConfig.irritants_visible && (
            <a
              href="/irritants-esante"
              className="text-sm text-gray-600 hover:text-navy font-medium transition-colors"
            >
              Les irritants de l'e-santé
            </a>
          )}

          {navConfig.blog_visible && (
            <a
              href="/blog"
              className="text-sm text-gray-600 hover:text-navy font-medium transition-colors"
            >
              Blog
            </a>
          )}
        </div>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          {!loading && user ? (
            <>
              <Button variant="primary" href="/solution/noter" className="text-sm py-2.5 px-6">
                Évaluer un logiciel
              </Button>
              <Button variant="outline" href="/mon-compte/profil" className="text-sm py-2.5 px-6">
                Mon compte
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" href="/connexion" className="text-sm py-2.5 px-6">
                Me connecter
              </Button>
              <Button variant="primary" href="/solution/noter" className="text-sm py-2.5 px-6">
                Évaluer un logiciel
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="lg:hidden p-2 text-navy"
          aria-label="Menu"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {isMobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-6 py-6 space-y-2">
            {/* Comparatifs accordion */}
            <div>
              <button
                type="button"
                onClick={() => setIsMobileComparatifOpen((v) => !v)}
                className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-navy font-medium py-2"
              >
                Comparatifs
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileComparatifOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMobileComparatifOpen && (
                <div className="pl-4 mt-1 space-y-3 pb-2">
                  {groupes.map((groupe) => (
                    <div key={groupe.nom}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                        {groupe.nom}
                      </p>
                      <ul className="space-y-1">
                        {groupe.categories.map((cat) => (
                          <li key={cat.slug}>
                            <a
                              href={`/solutions/${cat.slug}`}
                              className="block text-sm text-gray-600 hover:text-navy py-1"
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
              className="block text-sm text-gray-600 hover:text-navy font-medium py-2"
              onClick={() => setIsMobileOpen(false)}
            >
              Qui sommes-nous ?
            </a>

            {navConfig.irritants_visible && (
              <a
                href="/irritants-esante"
                className="block text-sm text-gray-600 hover:text-navy font-medium py-2"
                onClick={() => setIsMobileOpen(false)}
              >
                Les irritants de l'e-santé
              </a>
            )}

            {navConfig.blog_visible && (
              <a
                href="/blog"
                className="block text-sm text-gray-600 hover:text-navy font-medium py-2"
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
                  <Button variant="ghost" href="/mon-compte/profil" className="w-full justify-center">
                    Mon compte
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="primary" href="/solution/noter" className="w-full justify-center">
                    Évaluer un logiciel
                  </Button>
                  <Button variant="ghost" href="/connexion" className="w-full justify-center">
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
