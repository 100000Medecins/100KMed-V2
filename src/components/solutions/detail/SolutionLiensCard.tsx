import Link from 'next/link'
import { Link2 } from 'lucide-react'
import type { SolutionLienVoisin, LienType } from '@/lib/db/solution-liens'

const TYPE_LABELS: Record<string, string> = {
  meme_suite: 'Même suite produit',
  interoperable: 'Interopérable',
  embedded: 'Moteur intégré',
  partenariat: 'Partenariat',
}

function libelleType(type: LienType): string {
  return TYPE_LABELS[type] ?? type
}

export default function SolutionLiensCard({ liens }: { liens: SolutionLienVoisin[] }) {
  if (liens.length === 0) return null

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <Link2 className="w-4 h-4 text-accent-blue shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Solutions liées</h3>
      </div>
      <ul className="divide-y divide-gray-50">
        {liens.map((lien) => {
          const s = lien.solution
          const href = s.categorie?.slug && s.slug ? `/solutions/${s.categorie.slug}/${s.slug}` : null
          const inner = (
            <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain bg-gray-50 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy truncate">{s.nom}</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {s.categorie?.nom ? <>{s.categorie.nom} · </> : null}
                  <span className="text-accent-blue">{libelleType(lien.type)}</span>
                </p>
                {lien.description && (
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{lien.description}</p>
                )}
              </div>
            </div>
          )
          return (
            <li key={lien.lienId}>
              {href ? <Link href={href}>{inner}</Link> : inner}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
