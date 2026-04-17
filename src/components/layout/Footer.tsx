import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-navy-dark text-gray-400">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <a href="/" className="shrink-0">
            <Image
              src="/logos/logo-principal-nb.svg"
              alt="100 000 Médecins"
              width={200}
              height={140}
              className="h-[140px] w-auto brightness-0 invert"
              unoptimized
            />
          </a>

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
