export default function Footer() {
  return (
    <footer className="bg-navy-dark text-gray-400">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex gap-0.5">
              <span className="w-2 h-2 rounded-full bg-accent-blue" />
              <span className="w-2 h-2 rounded-full bg-accent-orange" />
              <span className="w-2 h-2 rounded-full bg-accent-pink" />
              <span className="w-2 h-2 rounded-full bg-rating-green" />
              <span className="w-2 h-2 rounded-full bg-accent-yellow" />
            </div>
            <span className="text-sm font-bold text-white">
              100000médecins<span className="text-accent-blue">.org</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
            <a href="/rgpd" className="hover:text-white transition-colors">
              Charte de confidentialité et cookies
            </a>
            <a href="/cgu" className="hover:text-white transition-colors">
              Conditions générales d&apos;utilisation
            </a>
            <a href="/transparence" className="hover:text-white transition-colors">
              Charte de transparence
            </a>
            <a href="/contact" className="hover:text-white transition-colors">
              Nous contacter
            </a>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/10 text-center text-xs text-gray-500">
          Tous droits réservés © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
