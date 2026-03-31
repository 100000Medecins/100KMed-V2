"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { navItems } from "@/lib/data";
import Button from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";

type NavCategorie = { nom: string; slug: string }

export default function NavbarClient({ categories }: { categories: NavCategorie[] }) {
  const { user, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const allNavItems = [
    { label: "Qui sommes-nous ?", href: "/qui-sommes-nous" },
    ...categories.map((c) => ({ label: `Comparatif ${c.nom}`, href: `/solutions/${c.slug}` })),
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-nav" : "bg-white"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 flex items-center justify-between h-[72px]">
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
        <div className="hidden lg:flex items-center gap-8">
          {allNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-gray-600 hover:text-navy font-medium transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          {!loading && user ? (
            <Button variant="primary" href="/mon-compte/mes-evaluations" className="text-sm py-2.5 px-6">
              Mon compte
            </Button>
          ) : (
            <>
              <Button variant="ghost" href="/connexion" className="text-sm py-2.5 px-5">
                Me connecter
              </Button>
              <Button variant="primary" href="/connexion" className="text-sm py-2.5 px-6">
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
          <div className="px-6 py-6 space-y-4">
            {allNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block text-sm text-gray-600 hover:text-navy font-medium py-2"
                onClick={() => setIsMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 space-y-2">
              {!loading && user ? (
                <Button variant="primary" href="/mon-compte/mes-evaluations" className="w-full justify-center">
                  Mon compte
                </Button>
              ) : (
                <>
                  <Button variant="primary" href="/connexion" className="w-full justify-center">
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
