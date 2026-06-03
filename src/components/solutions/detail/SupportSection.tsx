import { Mail, Phone, ExternalLink, Briefcase, Headphones } from 'lucide-react'
import type { SolutionWithRelations } from '@/types/models'

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
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-accent-blue hover:bg-accent-blue/5 transition-colors text-sm text-navy"
    >
      <Icon className="w-4 h-4 text-accent-blue" />
      <span className="font-medium">{label}</span>
    </a>
  )
}

/**
 * Section « Contacts utiles » en bas de chaque page solution.
 * Affiche jusqu'à deux sous-blocs (commercial / support) selon ce que l'éditeur a renseigné
 * pour CETTE solution (les contacts sont propres à chaque produit, pas à l'éditeur).
 * Masquée si aucun contact n'est renseigné.
 */
export default function SupportSection({ solution, displayCommercial = false }: SupportSectionProps) {
  const sol = solution as unknown as Record<string, string | null>
  const contactEmail = sol.contact_email
  const contactTel = sol.contact_telephone
  const supportEmail = sol.support_email
  const supportTel = sol.support_telephone
  const supportSite = sol.support_website

  // Le bloc commercial n'est rendu QUE si le toggle admin est activé ET qu'il y a des coordonnées renseignées.
  const hasCommercial = displayCommercial && !!(contactEmail || contactTel)
  const hasSupport = !!(supportEmail || supportTel || supportSite)
  if (!hasCommercial && !hasSupport) return null

  const nom = solution.editeur?.nom_commercial || solution.editeur?.nom || 'l\'éditeur'

  return (
    <section className="max-w-7xl mx-auto">
      <div className="bg-white rounded-card shadow-card p-6 md:p-8">
        <h2 className="text-lg font-bold text-navy mb-1">Contacts utiles</h2>
        <p className="text-sm text-gray-500 mb-6">
          {`Pour joindre ${nom} au sujet de cette solution :`}
        </p>

        <div className="space-y-6">
          {hasCommercial && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-accent-blue" />
                </div>
                <h3 className="text-sm font-semibold text-navy">Contacts commerciaux <span className="text-gray-400 font-normal">(demande de démo, devis…)</span></h3>
              </div>
              <div className="flex flex-wrap gap-3 ml-10">
                {contactEmail && (
                  <ContactButton href={`mailto:${contactEmail}`} icon={Mail} label={contactEmail} />
                )}
                {contactTel && (
                  <ContactButton href={`tel:${contactTel.replace(/\s/g, '')}`} icon={Phone} label={contactTel} />
                )}
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
              <div className="flex flex-wrap gap-3 ml-10">
                {supportEmail && (
                  <ContactButton href={`mailto:${supportEmail}`} icon={Mail} label={supportEmail} />
                )}
                {supportTel && (
                  <ContactButton href={`tel:${supportTel.replace(/\s/g, '')}`} icon={Phone} label={supportTel} />
                )}
                {supportSite && (
                  <ContactButton href={supportSite} icon={ExternalLink} label="Page de support" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
