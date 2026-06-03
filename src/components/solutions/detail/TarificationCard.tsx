import { Euro, Mail, Phone } from 'lucide-react'
import { buildPrixDisplay, type PrixInput } from '@/lib/prix'

interface TarificationCardProps {
  prix: PrixInput
  contactEmail: string | null
  contactTelephone: string | null
}

export default function TarificationCard({ prix, contactEmail, contactTelephone }: TarificationCardProps) {
  const display = buildPrixDisplay(prix)

  if (display.hasPrice && display.label) {
    return (
      <div className="bg-white rounded-card shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Euro className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-navy">Tarification</h3>
        </div>
        <p className="text-base font-semibold text-navy leading-snug">{display.label}</p>
        {display.engagementLabel && (
          <p className="text-xs text-gray-500 mt-1.5">{display.engagementLabel}</p>
        )}
        <p className="text-[11px] text-gray-400 mt-3 italic">
          Tarifs fournis par l&apos;éditeur — sous réserve de validation au devis.
        </p>
      </div>
    )
  }

  // Pas de prix renseigné → "Prix sur demande" + lien contact commercial si dispo
  const hasContact = !!(contactEmail || contactTelephone)
  return (
    <div className="bg-white rounded-card shadow-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Euro className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-bold text-navy">Tarification</h3>
      </div>
      <p className="text-base font-semibold text-gray-600">Prix sur demande</p>
      <p className="text-xs text-gray-500 mt-1.5">L&apos;éditeur n&apos;a pas publié de grille tarifaire.</p>

      {hasContact && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center gap-2 text-xs text-accent-blue hover:underline"
            >
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">Demander un devis</span>
            </a>
          )}
          {contactTelephone && (
            <a
              href={`tel:${contactTelephone.replace(/\s+/g, '')}`}
              className="flex items-center gap-2 text-xs text-accent-blue hover:underline"
            >
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{contactTelephone}</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
