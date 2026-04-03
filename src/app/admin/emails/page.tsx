import { getEmailTemplate } from '@/lib/actions/emailTemplates'
import EmailTemplateEditor from '@/components/admin/EmailTemplateEditor'

export const dynamic = 'force-dynamic'

export default async function AdminEmailsPage() {
  const template = await getEmailTemplate('verification_psc')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Templates email</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personnalisez les emails envoyés automatiquement aux utilisateurs.
        </p>
      </div>

      <div className="bg-white rounded-card shadow-card p-6">
        <div className="mb-4 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-navy">Email de vérification PSC</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Envoyé aux nouveaux évaluateurs pour vérifier leur identité via Pro Santé Connect.
            Utilisez <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{'{{psc_link}}'}</code> pour insérer le lien de vérification.
          </p>
        </div>

        <EmailTemplateEditor
          templateId="verification_psc"
          initialSujet={template?.sujet ?? 'Validez votre évaluation sur 100 000 Médecins'}
          initialHtml={template?.contenu_html ?? ''}
          updatedAt={template?.updated_at ?? null}
        />
      </div>
    </div>
  )
}
