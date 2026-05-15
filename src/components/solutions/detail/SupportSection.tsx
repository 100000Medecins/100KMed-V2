import { Mail, Phone, ExternalLink, Headphones } from 'lucide-react'
import type { Editeur } from '@/types/models'

interface SupportSectionProps {
  editeur: Editeur | null
}

export default function SupportSection({ editeur }: SupportSectionProps) {
  if (!editeur) return null
  const email = editeur.support_email
  const tel = editeur.support_telephone
  const site = editeur.support_website
  if (!email && !tel && !site) return null

  const nom = editeur.nom_commercial || editeur.nom || 'éditeur'

  return (
    <section className="max-w-7xl mx-auto">
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-accent-blue" />
          </div>
          <h2 className="text-lg font-bold text-navy">Support</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Pour toute question ou assistance technique sur ce produit, contactez le support {nom}&nbsp;:
        </p>
        <div className="flex flex-wrap gap-3">
          {email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-accent-blue hover:bg-accent-blue/5 transition-colors text-sm text-navy"
            >
              <Mail className="w-4 h-4 text-accent-blue" />
              <span className="font-medium">{email}</span>
            </a>
          )}
          {tel && (
            <a
              href={`tel:${tel.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-accent-blue hover:bg-accent-blue/5 transition-colors text-sm text-navy"
            >
              <Phone className="w-4 h-4 text-accent-blue" />
              <span className="font-medium">{tel}</span>
            </a>
          )}
          {site && (
            <a
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-accent-blue hover:bg-accent-blue/5 transition-colors text-sm text-navy"
            >
              <ExternalLink className="w-4 h-4 text-accent-blue" />
              <span className="font-medium">Page de support</span>
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
