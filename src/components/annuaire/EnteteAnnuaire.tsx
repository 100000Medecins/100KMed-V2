import Link from 'next/link'

const ONGLETS = [
  { cle: 'fiche', href: '/mon-compte/annuaire', libelle: 'Ma fiche annuaire' },
  { cle: 'complet', href: '/annuaire', libelle: 'Annuaire MSSanté complet' },
] as const

/** En-tête commun de l'annuaire (Mon compte) : titre et onglets « Ma fiche » / « Annuaire complet ». */
export default function EnteteAnnuaire({ actif }: { actif: (typeof ONGLETS)[number]['cle'] }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-navy">Annuaire MSSanté</h1>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Annuaire">
        {ONGLETS.map((o) => (
          <Link
            key={o.cle}
            href={o.href}
            aria-current={actif === o.cle ? 'page' : undefined}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              actif === o.cle ? 'bg-accent-blue/10 text-accent-blue' : 'text-gray-500 hover:text-navy hover:bg-white'
            }`}
          >
            {o.libelle}
          </Link>
        ))}
      </nav>
    </div>
  )
}
