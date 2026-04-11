import { getEmailTemplate } from '@/lib/actions/emailTemplates'
import AdminEmailsAccordion from '@/components/admin/AdminEmailsAccordion'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getOptedInEmails(prefKey: 'etudes_cliniques' | 'questionnaires_these'): Promise<string[]> {
  try {
    const supabase = createServiceRoleClient()
    const { data: prefs } = await (supabase as any)
      .from('users_notification_preferences')
      .select('user_id')
      .eq(prefKey, true)
    if (!prefs || prefs.length === 0) return []
    const userIds = prefs.map((p: any) => p.user_id)
    const { data: users } = await (supabase as any)
      .from('users')
      .select('email')
      .in('id', userIds)
    return (users ?? []).map((u: any) => u.email).filter(Boolean)
  } catch {
    return []
  }
}

export default async function AdminEmailsPage() {
  const [
    templatePsc, template1an, template3mois, templateLancement,
    templateSuppression, templateReset, templateEtude, templateQuestionnaire,
    emailsEtudes, emailsQuestionnaires,
  ] = await Promise.all([
    getEmailTemplate('verification_psc'),
    getEmailTemplate('relance_1an'),
    getEmailTemplate('relance_3mois'),
    getEmailTemplate('lancement'),
    getEmailTemplate('suppression_compte'),
    getEmailTemplate('reinitialisation_mot_de_passe'),
    getEmailTemplate('etude_clinique'),
    getEmailTemplate('questionnaire_recherche'),
    getOptedInEmails('etudes_cliniques'),
    getOptedInEmails('questionnaires_these'),
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
    {
      id: 'etude_clinique',
      title: '🔬 Étude clinique',
      description: `Envoyé manuellement aux ${emailsEtudes.length} utilisateurs ayant activé "Études cliniques" dans leurs préférences de notification.`,
      variables: ['{{nom}}', '{{lien_etude}}', '{{texte_promoteur}}', '{{lien_desabonnement}}'],
      data: templateEtude,
      defaultSujet: 'Participez à une étude clinique — 100 000 Médecins',
      targetedSend: {
        apiRoute: '/api/admin/send-etude',
        optedInEmails: emailsEtudes,
        labelLien: 'Lien vers le site de l\'étude',
        labelTextePromoteur: 'Texte fourni par le promoteur de l\'étude',
      },
    },
    {
      id: 'questionnaire_recherche',
      title: '📋 Questionnaire de recherche',
      description: `Envoyé manuellement aux ${emailsQuestionnaires.length} utilisateurs ayant activé "Questionnaires de recherche" dans leurs préférences de notification.`,
      variables: ['{{nom}}', '{{lien_etude}}', '{{texte_promoteur}}', '{{lien_desabonnement}}'],
      data: templateQuestionnaire,
      defaultSujet: 'Participez à un questionnaire de recherche — 100 000 Médecins',
      targetedSend: {
        apiRoute: '/api/admin/send-questionnaire',
        optedInEmails: emailsQuestionnaires,
        labelLien: 'Lien vers le questionnaire',
        labelTextePromoteur: 'Texte fourni par le promoteur de l\'étude',
      },
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
