"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import LogoAnime from "@/components/ui/LogoAnime";
import { Menu, X, ChevronDown, UserCircle, Search, LogOut } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import type { NavCategorie, NavResponse } from "@/app/api/nav-categories/route";
import AnnonceBanner from "@/components/sections/AnnonceBanner";
import type { Annonce } from "@/lib/db/annonces";
import dynamic from 'next/dynamic';
const SearchOverlay = dynamic(() => import('@/components/search/SearchOverlay'), { ssr: false });

type Groupe = {
  nom: string
  ordre: number
  categories: NavCategorie[]
}

// Hauteur du logo qui déborde sous la navbar (navbar reste à 72px).
// Ajustables visuellement : tester 90 vs 110 sur desktop.
const LOGO_HEIGHT_DESKTOP = 120
const LOGO_HEIGHT_MOBILE = 80

// Easter egg : paliers de messages selon le nombre de survols « volontaires » du logo.
const LOGO_EGG_MESSAGES: Record<number, string> = {
  5: "C'est fou ce qu'on peut faire des fois, seul devant son écran…",
  20: "Bon ça va là ? T'as pas autre chose à faire ??",
  40: "Non mais ça va pas ? 😭",
  60: "Toi, tu dois avoir vécu les débuts de l'internet pour continuer encore et encore à faire un truc qui sert objectivement à rien, non ?",
  80: "Bon, pour de vrai on adore cette vibe sinon on aurait pas codé cet easter-egg (ni les autres). Pour te récompenser, écris-nous un petit message dans la rubrique « contact » avec marqué « L'easter-egg le plus c@n du monde » on verra bien ce qui se passera ;)",
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

interface NavbarProps {
  /**
   * Mode minimal : masque tous les liens, mega-menus, CTAs et menu mobile.
   * Affiche uniquement le logo + un bouton « Se déconnecter ».
   * Logo non cliquable. Utilisé sur les flux contraints (ex. /completer-profil).
   */
  minimal?: boolean
  /** Bandeaux d'annonce affichés en haut de l'en-tête fixe (accueil uniquement). */
  annonces?: Annonce[]
}

export default function Navbar({ minimal = false, annonces = [] }: NavbarProps) {
  const { user, isEditeur, loading, signOut } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Bouton « Évaluer » contextuel : sur une page solution (/solutions/{cat}/{sol}),
  // pointer vers l'évaluation de CETTE solution ; ailleurs (accueil, catégories,
  // comparatifs…), parcours générique de sélection. Seule la cible change, pas le libellé.
  const solutionMatch = pathname.match(/^\/solutions\/([^/]+)\/([^/]+)$/);
  const evaluerHref = solutionMatch
    ? `/solution/noter/${solutionMatch[1]}/${solutionMatch[2]}`
    : '/solution/noter';
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [bannerH, setBannerH] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileComparatifOpen, setIsMobileComparatifOpen] = useState(true);
  const [isMobileCommunauteOpen, setIsMobileCommunauteOpen] = useState(false);
  const [openGroupes, setOpenGroupes] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<NavCategorie[]>([]);
  const [navConfig, setNavConfig] = useState<NavResponse['navConfig']>({ irritants_visible: false, blog_visible: false, etudes_visible: false, questionnaires_visible: false, section_communaute_visible: false });
  const [navLoaded, setNavLoaded] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isCommunauteMenuOpen, setIsCommunauteMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const communauteMenuRef = useRef<HTMLDivElement>(null);
  const communauteCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Easter egg : survols « volontaires » du logo (= rejeux de l'animation). Des
  // paliers de plus en plus taquins s'affichent à 5, 20, 40 et 60 survols. Le
  // compteur (en ref, pas de re-render) s'accumule sans reset (remis à zéro
  // uniquement au changement de page, la Navbar étant re-montée).
  const logoHoverCount = useRef(0);
  const logoEggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logoEggMessage, setLogoEggMessage] = useState<string | null>(null);

  function handleLogoHover() {
    if (minimal) return;
    logoHoverCount.current += 1;
    const message = LOGO_EGG_MESSAGES[logoHoverCount.current];
    if (message) {
      setLogoEggMessage(message);
      if (logoEggTimer.current) clearTimeout(logoEggTimer.current);
      // Le dernier palier (80) reste affiché plus longtemps (consigne à lire).
      const duree = logoHoverCount.current >= 80 ? 14000 : 6000;
      logoEggTimer.current = setTimeout(() => setLogoEggMessage(null), duree);
    }
  }

  // Purge du timer de l'easter egg au démontage.
  useEffect(() => () => {
    if (logoEggTimer.current) clearTimeout(logoEggTimer.current);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setIsScrolled(y > 10);
        setScrollY(y);
        ticking = false;
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Bandeau d'annonce : mesure sa hauteur (ResizeObserver → gère aussi sa fermeture)
  // pour faire glisser l'en-tête vers le haut au scroll.
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) { setBannerH(0); return; }
    const update = () => setBannerH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [annonces, minimal]);

  useEffect(() => {
    if (minimal) return
    fetch('/api/nav-categories')
      .then((r) => r.json())
      .then((data: NavResponse) => {
        const cats = data.categories ?? []
        setCategories(cats)
        setNavConfig(data.navConfig ?? { irritants_visible: false, blog_visible: false })
        setNavLoaded(true)
        const groupesBuilt = buildGroupes(cats)
        if (groupesBuilt.length > 0) {
          // Tous les groupes (ex. "Logiciels médicaux", "IA médicales") dépliés par défaut.
          setOpenGroupes(Object.fromEntries(groupesBuilt.map((g) => [g.nom, true])))
        }
      })
      .catch(() => {})
  }, [])

  // Fermer les menus en cliquant en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setIsMegaMenuOpen(false)
      }
      if (communauteMenuRef.current && !communauteMenuRef.current.contains(e.target as Node)) {
        setIsCommunauteMenuOpen(false)
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

  function toggleGroupe(nom: string) {
    setOpenGroupes(prev => ({ ...prev, [nom]: !prev[nom] }))
  }

  const groupes = buildGroupes(categories)
  // Navbar toujours sombre sauf sur le hero non scrollé (transparente)
  const darkNav = true
  const navBg = isHome && !isScrolled
    ? 'transparent'
    : 'linear-gradient(135deg, rgba(10,90,90,0.80) 0%, rgba(80,30,130,0.75) 55%, rgba(20,50,110,0.82) 100%)'
  // Le bandeau d'annonce défile avec la page : l'en-tête glisse vers le haut (borné à
  // la hauteur du bandeau), puis la nav reste fixée en haut de l'écran.
  const headerTop = -Math.min(scrollY, bannerH)

  return (
    <header
      className="fixed left-0 right-0 z-50"
      style={{
        top: headerTop,
        background: navBg,
        backdropFilter: 'blur(16px)',
        boxShadow: isHome && !isScrolled ? 'none' : '0 2px 20px rgba(0,0,0,0.18)',
        transition: 'background 500ms ease, box-shadow 500ms ease',
      }}
    >
      {!minimal && annonces.length > 0 && (
        <div ref={bannerRef}>
          <AnnonceBanner annonces={annonces} />
        </div>
      )}
      <nav className="max-w-7xl mx-auto pl-0 pr-0 min-[1150px]:pl-6 min-[1150px]:pr-6 grid grid-cols-[auto_1fr_auto] items-center h-[72px] gap-4">
        {/*
          Col 1 : Logo (3 lignes).
          - Mobile : centré verticalement dans la navbar (taille ≤ 72px donc rentre).
          - Desktop : aligné en haut (self-start) avec overflow visible → déborde
            vers le bas sans pousser les autres éléments.
          z-10 pour passer au-dessus du contenu de la page quand on scrolle.
        */}
        <a
          href={minimal ? undefined : "/"}
          onMouseEnter={handleLogoHover}
          className={`relative z-10 shrink-0 flex items-center min-[1150px]:items-start min-[1150px]:self-start min-[1150px]:h-[72px] min-[1150px]:pt-1 ${minimal ? 'pointer-events-none select-none' : ''}`}
          aria-label={minimal ? "100 000 Médecins" : "100 000 Médecins — accueil"}
        >
          <LogoAnime
            style={{ height: `${LOGO_HEIGHT_MOBILE}px`, transform: 'translateY(-1px)' }}
            className="inline-block w-auto min-[1150px]:!hidden"
          />
          <LogoAnime
            style={{ height: `${LOGO_HEIGHT_DESKTOP}px` }}
            className="hidden w-auto min-[1150px]:!inline-block"
          />
        </a>

        {/* Desktop Nav — masqué en mode minimal */}
        {!minimal && (
        <div className="hidden min-[1150px]:flex items-center justify-center gap-6 min-w-0">
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
                <div className={`mt-4 pt-4 border-t border-white/10 grid gap-6 ${groupes.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <a
                    href="/comparatifs"
                    className="text-xs font-semibold text-accent-blue hover:underline px-2"
                  >
                    Voir tous les comparatifs →
                  </a>
                  <a
                    href="/editeurs"
                    className="text-xs font-semibold text-accent-blue hover:underline px-2"
                  >
                    Voir tous les éditeurs →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Dropdown Communauté */}
          <div
            ref={communauteMenuRef}
            className="relative"
            onMouseEnter={() => { if (communauteCloseTimer.current) clearTimeout(communauteCloseTimer.current); setIsCommunauteMenuOpen(true) }}
            onMouseLeave={() => { communauteCloseTimer.current = setTimeout(() => setIsCommunauteMenuOpen(false), 150) }}
          >
            <button
              type="button"
              className={`flex items-center gap-1 text-sm font-medium transition-colors duration-500 ${darkNav ? 'text-white/85 hover:text-white' : 'text-gray-600 hover:text-navy'}`}
              onClick={() => setIsCommunauteMenuOpen(v => !v)}
            >
              Communauté
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCommunauteMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCommunauteMenuOpen && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full mt-3 rounded-2xl py-2 min-w-[220px]"
                style={{ background: 'linear-gradient(135deg, rgba(10,90,90,0.97) 0%, rgba(80,30,130,0.95) 55%, rgba(20,50,110,0.97) 100%)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
                onMouseEnter={() => { if (communauteCloseTimer.current) clearTimeout(communauteCloseTimer.current) }}
                onMouseLeave={() => { communauteCloseTimer.current = setTimeout(() => setIsCommunauteMenuOpen(false), 150) }}
              >
                <a href="/blog" className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                  📝 Blog
                </a>
                <a href="/stories-tutos" className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                  🎬 Vidéos & tutoriels
                </a>
                <a href="/glossaire" className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                  📖 Glossaire e-Santé
                </a>
                {navLoaded && navConfig.irritants_visible && (
                  <a href="/irritants-esante" className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    ⚡ Irritants de l'e-santé
                  </a>
                )}
                {navLoaded && navConfig.etudes_visible && (
                  <>
                    <div className="mx-4 my-1 border-t border-white/10" />
                    <a href="/mon-compte/etudes-cliniques" className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                      🔬 Études cliniques
                    </a>
                  </>
                )}
                {navLoaded && navConfig.questionnaires_visible && (
                  <a href="/mon-compte/questionnaires-these" className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                    📋 Questionnaires de thèse
                  </a>
                )}
              </div>
            )}
          </div>

          <a
            href="/qui-sommes-nous"
            className={`text-sm font-medium transition-colors duration-500 ${darkNav ? 'text-white/85 hover:text-white' : 'text-gray-600 hover:text-navy'}`}
          >
            Qui sommes-nous ?
          </a>

          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className={`p-2 rounded-full transition-colors duration-500 hover:bg-white/10 ${darkNav ? 'text-white/80 hover:text-white' : 'text-gray-500 hover:text-navy'}`}
            aria-label="Rechercher"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
        )}

        {/* Col 3 : mode minimal → bouton « Se déconnecter ». Sinon : mobile (loupe + évaluer) / desktop (loupe + CTAs) */}
        {minimal ? (
          <button
            type="button"
            onClick={() => signOut()}
            className="justify-self-end inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        ) : (
        <div className="flex items-center gap-2 justify-self-end" style={{ transform: 'translateY(-2px)' }}>
          {/* Loupe mobile */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className={`min-[1150px]:hidden p-2 transition-colors duration-500 focus:outline-none ${darkNav ? 'text-white/80' : 'text-navy'}`}
            aria-label="Rechercher"
          >
            <Search className="w-5 h-5" />
          </button>
          {/* Bouton Évaluer mobile — masqué pour les éditeurs */}
          {!isEditeur && (
            <div className="min-[1150px]:hidden">
              <Button variant="white" href={evaluerHref} className="text-xs py-1.5 px-3">
                Évaluer
              </Button>
            </div>
          )}
          {/* Burger mobile — toujours à droite */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={`min-[1150px]:hidden p-2 transition-colors duration-500 focus:outline-none ${darkNav ? 'text-white' : 'text-navy'}`}
            aria-label="Menu"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* CTAs desktop */}
          <div className="hidden min-[1150px]:flex items-center gap-3">
            {!loading && user ? (
              <>
                {!isEditeur && (
                  <Button variant="primary" href={evaluerHref} className="border-2 border-white">
                    Évaluer un logiciel
                  </Button>
                )}
                <Button variant="white" href="/mon-compte/profil" leftIcon={<UserCircle className="w-4 h-4" />} className={darkNav ? '' : '!border-navy !text-navy hover:!bg-navy hover:!text-white'}>
                  Mon compte
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" href={evaluerHref} className="border-2 border-white">
                  Évaluer un logiciel
                </Button>
                <Button variant="white" href="/connexion" className={darkNav ? '' : '!border-navy !text-navy hover:!bg-navy hover:!text-white'}>
                  Me connecter
                </Button>
              </>
            )}
          </div>
        </div>
        )}
      </nav>

      {/* Easter egg logo : messages par paliers (5 / 20 / 40 / 60 survols) */}
      {logoEggMessage && (
        <div className="pointer-events-none absolute left-4 min-[1150px]:left-6 top-[68px] z-[60]">
          <div key={logoEggMessage} className="rounded-2xl bg-white text-navy text-sm font-medium px-4 py-2.5 shadow-lg max-w-xs animate-fadeIn">
            {logoEggMessage}
          </div>
        </div>
      )}

      {/* Mobile menu — masqué en mode minimal */}
      {!minimal && isMobileOpen && (
        <div className="min-[1150px]:hidden border-t border-white/10 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(10,90,90,0.95) 0%, rgba(80,30,130,0.92) 55%, rgba(20,50,110,0.95) 100%)', backdropFilter: 'blur(16px)' }}>
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
                <div className="pl-4 mt-1 space-y-1 pb-2">
                  {groupes.map((groupe) => {
                    const isGroupeOpen = !!openGroupes[groupe.nom]
                    return (
                      <div key={groupe.nom}>
                        <button
                          type="button"
                          onClick={() => toggleGroupe(groupe.nom)}
                          className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white/70 py-1.5 pr-2 transition-colors"
                        >
                          {groupe.nom}
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isGroupeOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isGroupeOpen && (
                          <ul className="space-y-0.5 mb-1">
                            {groupe.categories.map((cat) => (
                              <li key={cat.slug}>
                                <a
                                  href={`/solutions/${cat.slug}`}
                                  className="block text-sm text-white py-1 pl-2 hover:text-accent-blue transition-colors"
                                  onClick={() => setIsMobileOpen(false)}
                                >
                                  {cat.nom}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                  <a
                    href="/comparatifs"
                    className="block text-xs font-semibold text-accent-blue pt-1"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Voir tous les comparatifs →
                  </a>
                  <a
                    href="/editeurs"
                    className="block text-xs font-semibold text-accent-blue pt-1"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    Voir tous les éditeurs →
                  </a>
                </div>
              )}
            </div>

            {/* Communauté mobile — accordion collapsed par défaut */}
            <div className="border-t border-white/10 pt-2 mt-1">
              <button
                type="button"
                onClick={() => setIsMobileCommunauteOpen((v) => !v)}
                className="flex items-center justify-between w-full text-sm text-white/85 hover:text-white font-medium py-2"
              >
                Communauté
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMobileCommunauteOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMobileCommunauteOpen && (
                <div className="pl-4 mt-1 space-y-0.5 pb-2">
                  <a href="/blog" className="block text-sm text-white/75 hover:text-white py-1" onClick={() => setIsMobileOpen(false)}>📝 Blog</a>
                  <a href="/stories-tutos" className="block text-sm text-white/75 hover:text-white py-1" onClick={() => setIsMobileOpen(false)}>🎬 Vidéos & tutoriels</a>
                  <a href="/glossaire" className="block text-sm text-white/75 hover:text-white py-1" onClick={() => setIsMobileOpen(false)}>📖 Glossaire e-Santé</a>
                  {navLoaded && navConfig.irritants_visible && (
                    <a href="/irritants-esante" className="block text-sm text-white/75 hover:text-white py-1" onClick={() => setIsMobileOpen(false)}>⚡ Irritants de l'e-santé</a>
                  )}
                  {navLoaded && navConfig.etudes_visible && (
                    <a href="/mon-compte/etudes-cliniques" className="block text-sm text-white/75 hover:text-white py-1" onClick={() => setIsMobileOpen(false)}>🔬 Études cliniques</a>
                  )}
                  {navLoaded && navConfig.questionnaires_visible && (
                    <a href="/mon-compte/questionnaires-these" className="block text-sm text-white/75 hover:text-white py-1" onClick={() => setIsMobileOpen(false)}>📋 Questionnaires de thèse</a>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-2 mt-1 space-y-0.5">
              <a
                href="/qui-sommes-nous"
                className="block text-sm text-white/85 hover:text-white font-medium py-1.5"
                onClick={() => setIsMobileOpen(false)}
              >
                Qui sommes-nous ?
              </a>
              <a
                href="/contact"
                className="block text-sm text-white/85 hover:text-white font-medium py-1.5"
                onClick={() => setIsMobileOpen(false)}
              >
                Nous contacter
              </a>
            </div>

            <div className="pt-4 space-y-2">
              {!loading && user ? (
                <>
                  {!isEditeur && (
                    <Button variant="primary" href={evaluerHref} className="w-full justify-center border border-white/40">
                      Évaluer un logiciel
                    </Button>
                  )}
                  <Button variant="white" href="/mon-compte/profil" leftIcon={<UserCircle className="w-4 h-4" />} className="w-full justify-center" onClick={() => setIsMobileOpen(false)}>
                    Mon compte
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="primary" href={evaluerHref} className="w-full justify-center border border-white/40">
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

      {!minimal && isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}
    </header>
  );
}
