import { getEmailTemplate } from '@/lib/actions/emailTemplates'
import AdminEmailsClient from '@/components/admin/AdminEmailsClient'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Newsletter } from '@/app/admin/newsletters/page'

export const dynamic = 'force-dynamic'

async function getOptedInCount(prefKey: 'etudes_cliniques' | 'questionnaires_these'): Promise<number> {
  try {
    const supabase = createServiceRoleClient()
    const { count } = await (supabase as any)
      .from('users_notification_preferences')
      .select('user_id', { count: 'exact', head: true })
      .eq(prefKey, true)
    return count ?? 0
  } catch {
    return 0
  }
}

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
  const supabase = createServiceRoleClient()

  const [
    templatePsc, template1an, template3mois, templateLancement,
    templateSuppression, templateReset, templateEtude, templateQuestionnaire,
    emailsEtudes, emailsQuestionnaires,
    countEtudes, countQuestionnaires,
    { data: newsletters },
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
    getOptedInCount('etudes_cliniques'),
    getOptedInCount('questionnaires_these'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('newsletters')
      .select('id, mois, sujet, contenu_html, contenu_json, status, created_at, sent_at, scheduled_at, recipient_count, notified_at, reminded_at')
      .order('created_at', { ascending: false }),
  ])

  const sections = [
    {
      key: 'systeme',
      label: 'Notifications système',
      description: 'Emails transactionnels envoyés automatiquement par la plateforme.',
      templates: [
        {
          id: 'relance_1an',
          title: 'Relance 1 an — 1ʳᵉ relance',
          description: "Envoyé automatiquement 1 an après la dernière évaluation.",
          variables: ['{{prenom}}', '{{solution_nom}}', '{{lien_1clic}}', '{{lien_reevaluation}}'],
          data: template1an,
          defaultSujet: "Votre avis sur {{solution_nom}} est-il toujours d'actualité ?",
        },
        {
          id: 'relance_3mois',
          title: 'Rappel tous les 3 mois (2ᵉ, 3ᵉ, 4ᵉ relance)',
          description: "Envoyé tous les 3 mois tant que l'utilisateur n'a pas revalidé son avis.",
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
          description: "Envoyé à l'utilisateur après la suppression définitive de son compte.",
          variables: ['{{prenom}}', '{{nom}}'],
          data: templateSuppression,
          defaultSujet: 'Votre compte 100 000 Médecins a été supprimé',
        },
        {
          id: 'reinitialisation_mot_de_passe',
          title: 'Réinitialisation du mot de passe',
          description: "Envoyé lorsqu'un utilisateur demande à réinitialiser son mot de passe.",
          variables: ['{{lien_reinitialisation}}'],
          data: templateReset,
          defaultSujet: 'Réinitialisez votre mot de passe — 100 000 Médecins',
        },
      ],
    },
    {
      key: 'newsletter',
      label: 'Newsletter mensuelle',
      description: '',
      templates: [
        {
          id: 'lancement',
          title: '🚀 Mail de lancement',
          description: 'Envoyé manuellement à toute la base au moment du lancement du site.',
          variables: ['{{nom}}', '{{solution_nom}}', '{{lien_1clic}}', '{{lien_reevaluation}}'],
          data: templateLancement,
          defaultSujet: 'Le nouveau 100 000 Médecins est là — votre avis compte !',
          masseSendable: true,
        },
      ],
    },
    {
      key: 'etudes-theses',
      label: 'Études & Thèses',
      description: `Emails envoyés manuellement aux utilisateurs opt-in. ${countEtudes} inscrits études · ${countQuestionnaires} inscrits questionnaires.`,
      templates: [
        {
          id: 'etude_clinique',
          title: '🔬 Nouvelle étude clinique',
          description: `Envoyé manuellement aux ${emailsEtudes.length} utilisateurs ayant activé "Études cliniques" dans leurs préférences.`,
          variables: ['{{nom}}', '{{lien_etude}}', '{{texte_promoteur}}', '{{lien_desabonnement}}'],
          data: templateEtude,
          defaultSujet: 'Participez à une étude clinique — 100 000 Médecins',
          targetedSend: {
            apiRoute: '/api/admin/send-etude',
            optedInEmails: emailsEtudes,
            labelLien: "Lien vers le site de l'étude",
            labelTextePromoteur: 'Texte fourni par le promoteur de l\'étude',
          },
        },
        {
          id: 'questionnaire_recherche',
          title: '📋 Nouveau questionnaire de thèse',
          description: `Envoyé manuellement aux ${emailsQuestionnaires.length} utilisateurs ayant activé "Questionnaires de thèse" dans leurs préférences.`,
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
      ],
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Emails</h1>
        <p className="text-sm text-gray-500 mt-1">
          Templates et envois manuels.
        </p>
      </div>
      <AdminEmailsClient sections={sections} newsletters={(newsletters as Newsletter[]) ?? []} />
    </div>
  )
}
