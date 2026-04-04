import { getEmailTemplate } from '@/lib/actions/emailTemplates'
import AdminEmailsAccordion from '@/components/admin/AdminEmailsAccordion'

export const dynamic = 'force-dynamic'

export default async function AdminEmailsPage() {
  const [templatePsc, template1an, template3mois, templateLancement] = await Promise.all([
    getEmailTemplate('verification_psc'),
    getEmailTemplate('relance_1an'),
    getEmailTemplate('relance_3mois'),
    getEmailTemplate('lancement'),
  ])

  const templates = [
    {
      id: 'lancement',
      title: '🚀 Mail de lancement',
      description: 'Envoyé manuellement à toute la base au moment du lancement du site pour inviter les utilisateurs à renoter.',
      variables: ['{{prenom}}', '{{solution_nom}}', '{{lien_1clic}}', '{{lien_reevaluation}}'],
      data: templateLancement,
      defaultSujet: 'Le nouveau 100 000 Médecins est là — votre avis compte !',
      masseSendable: true,
    },
    {
      id: 'relance_1an',
      title: 'Relance 1 an après évaluation',
      description: 'Envoyé automatiquement 1 an après la dernière évaluation pour proposer une mise à jour.',
      variables: ['{{prenom}}', '{{solution_nom}}', '{{lien_1clic}}', '{{lien_reevaluation}}'],
      data: template1an,
      defaultSujet: "Votre avis sur {{solution_nom}} est-il toujours d'actualité ?",
    },
    {
      id: 'relance_3mois',
      title: 'Relance 1 an + 3 mois (rappel)',
      description: "Envoyé 3 mois après la relance 1 an si l'utilisateur n'a pas encore mis à jour son avis.",
      variables: ['{{prenom}}', '{{solution_nom}}', '{{lien_1clic}}', '{{lien_reevaluation}}'],
      data: template3mois,
      defaultSujet: 'Rappel : votre avis sur {{solution_nom}}',
    },
    {
      id: 'verification_psc',
      title: 'Email de vérification PSC',
      description: 'Envoyé aux nouveaux évaluateurs pour vérifier leur identité via Pro Santé Connect.',
      variables: ['{{psc_link}}'],
      data: templatePsc,
      defaultSujet: 'Validez votre évaluation sur 100 000 Médecins',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Templates email</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personnalisez les emails envoyés automatiquement aux utilisateurs.
        </p>
      </div>

      <AdminEmailsAccordion templates={templates} />
    </div>
  )
}
