import { Mail, Phone, ExternalLink, Briefcase, Headphones } from 'lucide-react'
import type { SolutionWithRelations, ContactLigne } from '@/types/models'
import { normalizeContacts } from '@/lib/contacts'
import { ensureHttps } from '@/lib/url'

interface SupportSectionProps {
  solution: SolutionWithRelations
  /**
   * Toggle global `app_settings.display_contacts_commerciaux` :
   * si false (défaut), le sous-bloc « Contacts commerciaux » (demande de démo/devis)
   * est masqué. Le sous-bloc « Contacts support » reste affiché.
   */
  displayCommercial?: boolean
}

function ContactButton({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof Mail
  label: string
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="inline-flex items-start gap-2 max-w-full px-4 py-2.5 rounded-xl border border-gray-200 hover:border-accent-blue hover:bg-accent-blue/5 transition-colors text-sm text-navy"
    >
      <Icon className="w-4 h-4 text-accent-blue shrink-0 mt-0.5" />
      <span className="font-medium min-w-0 break-all">{label}</span>
    </a>
  )
}

/** Une ligne de contact : libellé optionnel + boutons email / téléphone. */
function ContactLigneItem({ contact }: { contact: ContactLigne }) {
  return (
    <div>
      {contact.libelle && (
        <p className="text-sm font-medium text-navy mb-1.5">{contact.libelle}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {contact.email && (
          <ContactButton href={`mailto:${contact.email}`} icon={Mail} label={contact.email} />
        )}
        {contact.telephone && (
          <ContactButton href={`tel:${contact.telephone.replace(/\s/g, '')}`} icon={Phone} label={contact.telephone} />
        )}
      </div>
    </div>
  )
}

/**
 * Section « Contacts utiles » en bas de chaque page solution.
 * Affiche deux sous-blocs (commercial / support), chacun pouvant contenir
 * plusieurs contacts nommés (colonnes JSONB `contacts_commerciaux` / `contacts_support`).
 * Les contacts sont propres à chaque solution (pas à l'éditeur).
 * Masquée si aucun contact n'est renseigné.
 */
export default function SupportSection({ solution, displayCommercial = false }: SupportSectionProps) {
  const commerciaux = normalizeContacts(solution.contacts_commerciaux)
  const support = normalizeContacts(solution.contacts_support)
  const supportSiteUrl = ensureHttps(solution.support_website)

  // Le bloc commercial n'est rendu QUE si le toggle admin est activé ET qu'il y a des contacts.
  const hasCommercial = displayCommercial && commerciaux.length > 0
  const hasSupport = support.length > 0 || !!supportSiteUrl
  if (!hasCommercial && !hasSupport) return null

  return (
    <section className="max-w-7xl mx-auto">
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <h2 className="text-lg font-bold text-navy mb-6">Contacts utiles</h2>

        <div className="space-y-6">
          {hasCommercial && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-accent-blue" />
                </div>
                <h3 className="text-sm font-semibold text-navy">Contacts commerciaux <span className="text-gray-400 font-normal">(demande de démo, devis…)</span></h3>
              </div>
              <div className="space-y-4 sm:ml-10">
                {commerciaux.map((c, i) => (
                  <ContactLigneItem key={i} contact={c} />
                ))}
              </div>
            </div>
          )}

          {hasSupport && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-accent-blue" />
                </div>
                <h3 className="text-sm font-semibold text-navy">Contacts support <span className="text-gray-400 font-normal">(SAV, assistance technique)</span></h3>
              </div>
              <div className="space-y-4 sm:ml-10">
                {support.map((c, i) => (
                  <ContactLigneItem key={i} contact={c} />
                ))}
                {supportSiteUrl && (
                  <div className="flex flex-wrap gap-3">
                    <ContactButton href={supportSiteUrl} icon={ExternalLink} label="Page de support" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
