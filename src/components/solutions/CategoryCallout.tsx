import type { CategoryCallout as CategoryCalloutData } from '@/lib/constants/category-callouts'

/** Icône « lien externe » (nouvel onglet). */
function ExternalLinkIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

/**
 * Encadré de renvoi vers une ou plusieurs ressources externes, affiché dans le hero
 * (fond sombre) des pages catégorie. Rendu serveur, visible mobile ET desktop
 * (contrairement à l'intro de catégorie, masquée sur mobile).
 */
export default function CategoryCallout({ callout }: { callout: CategoryCalloutData }) {
  return (
    <div className="max-w-3xl rounded-card border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3.5 md:px-5 md:py-4">
      <div className="flex items-start gap-3">
        <span className="text-xl md:text-2xl leading-none shrink-0" aria-hidden="true">
          {callout.icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mb-1">
            {callout.label}
          </p>
          <p className="text-sm text-white/80 leading-relaxed">{callout.texte}</p>

          <ul className="mt-2 space-y-1">
            {callout.liens.map((lien) => (
              <li key={lien.url} className="text-sm text-white/80 leading-relaxed">
                {lien.amorce}{' '}
                <a
                  href={lien.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white transition-colors"
                >
                  <span>{lien.titre}</span>
                  <ExternalLinkIcon />
                  <span className="sr-only">
                    {lien.hint ? ` (${lien.hint}, nouvel onglet)` : ' (nouvel onglet)'}
                  </span>
                </a>
                {lien.hint && <span className="text-white/55" aria-hidden="true"> ({lien.hint})</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
