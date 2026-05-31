import { getEmailTemplate } from '@/lib/actions/emailTemplates'
import { getSiteConfig } from '@/lib/actions/siteConfig'
import AdminEmailsClient from '@/components/admin/AdminEmailsClient'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Newsletter } from '@/app/admin/newsletters/page'
import { getEmailsCampagnes, type EmailCampagne } from '@/lib/actions/emails-campagnes'

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

// Syndicats émetteurs du mail de lancement (mots des présidents = métadonnées de la page « Qui sommes-nous »).
async function getSyndicatsLancement() {
  try {
    const supabase = createServiceRoleClient()
    const { data } = await (supabase as any)
      .from('pages_statiques')
      .select('metadata')
      .eq('slug', 'qui-sommes-nous')
      .single()
    const arr = Array.isArray(data?.metadata) ? data.metadata : []
    return arr
      .filter((s: any) => s?.id && s.id !== 'mg-france')
      .map((s: any) => ({
        id: s.id,
        nom: s.nom,
        nom_complet: s.nom_complet ?? null,
        article: s.article ?? '',
        citation: s.citation ?? '',
        presidents: s.presidents ?? '',
        titre: s.titre ?? '',
        contenu_html_override: typeof s.contenu_html_override === 'string' ? s.contenu_html_override : null,
        logo_height: typeof s.logo_height === 'number' ? s.logo_height : null,
        logo_bg: typeof s.logo_bg === 'string' ? s.logo_bg : null,
      }))
  } catch {
    return []
  }
}

export default async function AdminEmailsPage() {
  const supabase = createServiceRoleClient()

  const [
    templatePsc, template1an, template3mois, templateLancement,
    templateSuppression, templateReset, templateFusion, templateEtude, templateQuestionnaire,
    templateMasterLayout,
    templateRelanceIncomplet,
    templateRelancePsc,
    templateConfirmationInscription,
    templateInfosMensuels,
    emailsEtudes, emailsQuestionnaires,
    countEtudes, countQuestionnaires,
    { data: newsletters },
    cronsActifsRaw,
    excuseScheduledAtRaw,
    excuseDraftHtml,
    excuseDraftSujet,
    campagnes,
    templateLancementSyndicat,
    syndicatsLancement,
    templateMasterLayoutTest,
  ] = await Promise.all([
    getEmailTemplate('verification_psc'),
    getEmailTemplate('relance_1an'),
    getEmailTemplate('relance_3mois'),
    getEmailTemplate('lancement'),
    getEmailTemplate('suppression_compte'),
    getEmailTemplate('reinitialisation_mot_de_passe'),
    getEmailTemplate('fusion_comptes'),
    getEmailTemplate('etude_clinique'),
    getEmailTemplate('questionnaire_recherche'),
    getEmailTemplate('master_layout'),
    getEmailTemplate('relance_incomplet'),
    getEmailTemplate('relance_psc'),
    getEmailTemplate('confirmation_inscription'),
    getEmailTemplate('infos_mensuels'),
    getOptedInEmails('etudes_cliniques'),
    getOptedInEmails('questionnaires_these'),
    getOptedInCount('etudes_cliniques'),
    getOptedInCount('questionnaires_these'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('newsletters')
      .select('id, mois, sujet, contenu_html, contenu_json, status, created_at, sent_at, scheduled_at, recipient_count, notified_at, reminded_at')
      .order('created_at', { ascending: false }),
    getSiteConfig('crons_routiniers_actifs'),
    getSiteConfig('excuse_scheduled_at'),
    getSiteConfig('excuse_draft_html'),
    getSiteConfig('excuse_draft_sujet'),
    getEmailsCampagnes(),
    getEmailTemplate('lancement_syndicat'),
    getSyndicatsLancement(),
    getEmailTemplate('master_layout_test'),
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
        {
          id: 'fusion_comptes',
          title: 'Fusion de comptes',
          description: "Envoyé quand un utilisateur saisit une adresse email déjà associée à un autre compte — contient le lien sécurisé de fusion.",
          variables: ['{{lien_fusion}}'],
          data: templateFusion,
          defaultSujet: 'Fusionnez vos comptes 100 000 Médecins',
        },
        {
          id: 'confirmation_inscription',
          title: "Confirmation d'inscription (email)",
          description: "Envoyé après une inscription par email (pas PSC) — contient le lien HMAC de confirmation d'adresse.",
          variables: ['{{lien_confirmation}}'],
          data: templateConfirmationInscription,
          defaultSujet: 'Confirmez votre inscription — 100 000 Médecins',
        },
        {
          id: 'relance_incomplet',
          title: 'Relance évaluation incomplète',
          description: "Envoyé aux utilisateurs ayant commencé mais non finalisé une évaluation.",
          variables: ['{{prenom}}', '{{nom}}', '{{solution_nom}}', '{{lien_reprise}}'],
          data: templateRelanceIncomplet,
          defaultSujet: 'Votre évaluation de {{solution_nom}} est incomplète',
        },
        {
          id: 'relance_psc',
          title: 'Relance vérification PSC',
          description: "Envoyé aux utilisateurs n'ayant pas finalisé leur vérification Pro Santé Connect (1 à 3 relances).",
          variables: ['{{prenom}}', '{{nom}}', '{{solution_nom}}', '{{psc_link}}', '{{relance_num}}', '{{max_relances}}'],
          data: templateRelancePsc,
          defaultSujet: 'Finalisez votre évaluation de {{solution_nom}} avec ProSanté Connect',
        },
        {
          id: 'infos_mensuels',
          title: 'Newsletter — Infos mensuelles',
          description: "Newsletter mensuelle (en cours de définition côté éditorial). Template prêt à l'emploi avec placeholder.",
          variables: ['{{prenom}}', '{{nom}}'],
          data: templateInfosMensuels,
          defaultSujet: 'Les infos du mois — 100 000 Médecins',
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

  const cronsActifs = cronsActifsRaw === 'true'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Emails</h1>
        <p className="text-sm text-gray-500 mt-1">
          Templates et envois manuels.
        </p>
      </div>
      <AdminEmailsClient
        sections={sections}
        newsletters={(newsletters as Newsletter[]) ?? []}
        cronsActifs={cronsActifs}
        excuseDefaultSujet={excuseDraftSujet ?? 'Correction — votre email de relance pour {{solution_nom}}'}
        excuseDefaultHtml={excuseDraftHtml ?? ''}
        excuseScheduledAt={excuseScheduledAtRaw}
        adminEmail={process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@100000medecins.org'}
        masterLayoutTemplate={templateMasterLayout}
        campagnesEtudes={campagnes.etudes}
        campagnesQuestionnaires={campagnes.questionnaires}
        lancementSyndicatTemplate={templateLancementSyndicat}
        syndicatsLancement={syndicatsLancement}
        masterLayoutTestTemplate={templateMasterLayoutTest}
      />
    </div>
  )
}
