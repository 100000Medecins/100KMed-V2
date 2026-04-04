import { getEmailTemplate } from '@/lib/actions/emailTemplates'
import AdminEmailsAccordion from '@/components/admin/AdminEmailsAccordion'

export const dynamic = 'force-dynamic'

export default async function AdminEmailsPage() {
  const [templatePsc, template1an, template3mois, templateLancement, templateSuppression, templateReset] = await Promise.all([
    getEmailTemplate('verification_psc'),
    getEmailTemplate('relance_1an'),
    getEmailTemplate('relance_3mois'),
    getEmailTemplate('lancement'),
    getEmailTemplate('suppression_compte'),
    getEmailTemplate('reinitialisation_mot_de_passe'),
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
      title: 'Relance 1 an — 1ʳᵉ relance',
      description: 'Envoyé automatiquement 1 an après la dernière évaluation. C\'est le premier email de relance reçu par l\'utilisateur.',
      variables: ['{{prenom}}', '{{solution_nom}}', '{{lien_1clic}}', '{{lien_reevaluation}}'],
      data: template1an,
      defaultSujet: "Votre avis sur {{solution_nom}} est-il toujours d'actualité ?",
    },
    {
      id: 'relance_3mois',
      title: 'Rappel tous les 3 mois (2ᵉ, 3ᵉ, 4ᵉ relance)',
      description: "Envoyé tous les 3 mois indéfiniment tant que l'utilisateur n'a pas revalidé son avis (à 1 an 3 mois, 1 an 6 mois, 1 an 9 mois…). S'arrête uniquement si l'utilisateur revalide ou désactive les relances dans ses notifications.",
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
    {
      id: 'suppression_compte',
      title: 'Confirmation de suppression de compte',
      description: 'Envoyé à l\'utilisateur après la suppression définitive de son compte.',
      variables: ['{{prenom}}', '{{nom}}'],
      data: templateSuppression,
      defaultSujet: 'Votre compte 100 000 Médecins a été supprimé',
    },
    {
      id: 'reinitialisation_mot_de_passe',
      title: 'Réinitialisation du mot de passe',
      description: 'Envoyé lorsqu\'un utilisateur demande à réinitialiser son mot de passe (depuis la page connexion ou depuis son compte).',
      variables: ['{{lien_reinitialisation}}'],
      data: templateReset,
      defaultSujet: 'Réinitialisez votre mot de passe — 100 000 Médecins',
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
