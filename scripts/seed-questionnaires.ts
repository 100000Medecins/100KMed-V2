/**
 * Seed : insère les questionnaires d'évaluation dans Supabase
 * (questionnaire_sections + questionnaire_questions)
 *
 * Usage : npx tsx scripts/seed-questionnaires.ts [--dry-run]
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const DRY = process.argv.includes('--dry-run')
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Types ────────────────────────────────────────────────────────────────────

type CritereMajeur = 'interface' | 'fonctionnalites' | 'editeur' | 'qualite_prix' | 'fiabilite'

interface RawQuestion { key: string; question: string; critereMajeur: CritereMajeur }
interface RawSection { titre: string; introduction?: string; questions: RawQuestion[] }

// ── Données ──────────────────────────────────────────────────────────────────

const SECTIONS_DEFAULT: RawSection[] = [
  {
    titre: 'Avant la consultation',
    introduction: 'Quand vous arrivez le matin (ou plus tard) au cabinet :',
    questions: [
      { key: 'detail_connexion', question: 'Est-ce que la connexion à votre logiciel est facile ?', critereMajeur: 'interface' },
      { key: 'detail_interface_generale', question: 'Est-ce que vous jugez son interface lisible et visuellement agréable de façon générale ?', critereMajeur: 'interface' },
      { key: 'detail_reactif', question: 'Est-ce que vous diriez qu\'il est rapide, "réactif" ?', critereMajeur: 'interface' },
      { key: 'detail_agenda', question: 'Si votre agenda est intégré ou interfacé à votre logiciel, trouvez-vous cela pratique et bien fait ?', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Pendant la consultation — Nouveau patient',
    introduction: 'Comment évaluez-vous la création d\'un nouveau dossier patient, avec :',
    questions: [
      { key: 'detail_ins', question: 'Qualification de l\'INS (Identifiant National de Santé) ?', critereMajeur: 'interface' },
      { key: 'detail_dmp_recuperation', question: 'La récupération des données de son Espace Santé (ex-DMP) ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_atcd', question: 'La création de nouveaux antécédents au sein de votre logiciel ?', critereMajeur: 'interface' },
      { key: 'detail_classement_docs', question: 'La numérisation et/ou le classement des documents (courriers, résultats…) au bon endroit ?', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Pendant la consultation — Examen',
    introduction: 'Vous l\'avez évidemment interrogé, observé, examiné. Comment jugez-vous :',
    questions: [
      { key: 'detail_notes_consultation', question: 'La saisie de vos notes de consultation ?', critereMajeur: 'interface' },
      { key: 'detail_modeles_consultation', question: 'L\'usage des « modèles de consultation » s\'ils existent ?', critereMajeur: 'interface' },
      { key: 'detail_ia_scribe', question: 'Votre « IA Scribe » (le fameux « assistant virtuel » qui prend les notes à votre place) si vous en avez un ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_examens_integration', question: 'La facilité d\'intégration de vos éventuels examens complémentaires en consultation ? (ECG, audiométrie…)', critereMajeur: 'fonctionnalites' },
      { key: 'detail_examens_visualisation', question: 'La visualisation des examens complémentaires réalisés précédemment ? (biologie, imageries…)', critereMajeur: 'interface' },
    ],
  },
  {
    titre: 'Pendant la consultation — Prescription',
    introduction: 'Vous devez lui faire une prescription. Comment jugez-vous :',
    questions: [
      { key: 'detail_ordonnance_pharmacie', question: 'La création d\'une nouvelle ordonnance de pharmacie, avec les posologies spécifiques à sa situation ?', critereMajeur: 'interface' },
      { key: 'detail_modeles_ordonnance', question: 'Les modèles d\'ordonnances, s\'ils existent ?', critereMajeur: 'interface' },
      { key: 'detail_ordonnance_numerique', question: 'La facilité de faire une ordonnance numérique ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_signature_numerique', question: 'La facilité de signer numériquement cette ordonnance ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_envoi_dmp', question: 'L\'envoi dans le DMP/ENS du patient ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_donnees_utiles_prescription', question: 'L\'accès à des données utiles (antécédents, allergies, DFG par ex) pendant votre prescription ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_alertes_ldap', question: 'Les alertes de votre logiciel d\'aide à la prescription ? (Vidal, BCB, Synapse…) ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_modeles_certificats', question: 'Les modèles de certificats, d\'attestations ou de courriers-types ?', critereMajeur: 'interface' },
      { key: 'detail_prescription_autres', question: 'La prescription d\'examens complémentaires ou de soins paramédicaux ?', critereMajeur: 'interface' },
    ],
  },
  {
    titre: 'Pendant la consultation — Avis complémentaire',
    introduction: 'Vous souhaitez demander un avis complémentaire. Comment évalueriez-vous :',
    questions: [
      { key: 'detail_messagerie_interne', question: 'L\'envoi d\'un message à votre collègue au sein du cabinet via le logiciel ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_pluripro', question: 'Le partage (ou masquage) certains éléments de votre dossier avec votre collègue ou en pluriprofessionnalité ?', critereMajeur: 'interface' },
      { key: 'detail_staffs', question: 'L\'organisation d\'une réunion/staff mono ou pluridisciplinaire et la réintégration de ses conclusions ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_courrier_adressage', question: 'La rédaction d\'un courrier d\'adressage pour un avis extérieur ?', critereMajeur: 'interface' },
      { key: 'detail_messagerie_securisee', question: 'Son envoi via une messagerie sécurisée (Mailiz, Apicrypt…), si besoin après recherche du correspondant dans l\'annuaire ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_carnet_adresse', question: 'La gestion du carnet d\'adresse, s\'il existe au sein de votre logiciel ?', critereMajeur: 'interface' },
      { key: 'detail_teleexpertise', question: 'La demande et/ou réintégration d\'une téléexpertise via votre logiciel, si vous en faites ?', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Arrêt de travail et facturation',
    introduction: 'Vous devez faire un arrêt de travail, et facturer la consultation. Est-ce facile :',
    questions: [
      { key: 'detail_aati', question: 'D\'utiliser le téléservice « arrêt de travail » (AATi) de l\'Assurance-Maladie intégré dans votre logiciel, s\'il existe ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_teleservices', question: 'D\'utiliser les autres téléservices le cas échéant ? (déclaration médecin traitant (DMTi), déclaration d\'ALD (ALDi)…)', critereMajeur: 'fonctionnalites' },
      { key: 'detail_fse', question: 'De faire une feuille de soins électronique de façon générale ? (en dégradé, en tiers payant, en AT…)', critereMajeur: 'interface' },
      { key: 'detail_mobilite', question: 'Si vous faites des visites à domicile : est-ce que votre logiciel est agréable et facile à utiliser en mobilité ?', critereMajeur: 'interface' },
    ],
  },
  {
    titre: 'Après la consultation',
    introduction: 'C\'est la fin de la journée de consultations. Comment évalueriez-vous :',
    questions: [
      { key: 'detail_comptabilite', question: 'Le module de comptabilité, si votre logiciel le permet ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_teletransmission', question: 'Le module de télétransmission et de vérification / relance des retours « Noémie » ?', critereMajeur: 'fonctionnalites' },
      { key: 'detail_resultats_bio', question: 'La récupération et le classement des résultats biologiques et/ou radiologiques (Hprim, CDA…) ?', critereMajeur: 'interface' },
    ],
  },
  {
    titre: 'Et si cela vous concerne…',
    introduction: 'Comment jugeriez-vous la facilité :',
    questions: [
      { key: 'detail_profil_remplacant', question: 'De créer un profil utilisateur pour votre remplaçant / interne ?', critereMajeur: 'interface' },
      { key: 'detail_prise_en_main', question: 'Pour votre remplaçant / interne de prendre en main votre logiciel ?', critereMajeur: 'interface' },
      { key: 'detail_recherche_multicriteres', question: 'D\'aller chercher quels patients sont possiblement concernés par une nouvelle recommandation ? (recherche de type « lister les diabétiques de moins de 65 ans n\'ayant pas eu de bilan depuis 1 an »)', critereMajeur: 'fonctionnalites' },
      { key: 'detail_droits_acces', question: 'Pour votre secrétaire, interne ou remplaçant d\'avoir accès à vos courriers et résultats en cas de besoin ?', critereMajeur: 'interface' },
    ],
  },
  {
    titre: 'Fiabilité et relations avec l\'éditeur',
    introduction: 'Évoquons la qualité de vos relations avec l\'éditeur de votre logiciel.',
    questions: [
      { key: 'detail_pratiques_commerciales', question: 'Êtes-vous satisfait des pratiques commerciales de votre éditeur ? (avant-vente, sollicitations, compensations par ex.)', critereMajeur: 'editeur' },
      { key: 'detail_import_donnees', question: 'Si vous avez été concerné, avez-vous pu récupérer les données de votre ancien logiciel de façon acceptable ?', critereMajeur: 'editeur' },
      { key: 'detail_stabilite', question: 'Est-ce que votre logiciel plante souvent ?', critereMajeur: 'fiabilite' },
      { key: 'detail_sav', question: 'Quand vous avez un problème, pouvez-vous compter sur le SAV ?', critereMajeur: 'editeur' },
      { key: 'detail_communication', question: 'Trouvez-vous la stratégie de communication de votre éditeur adaptée ? (en cas de nouveauté, de panne, etc.)', critereMajeur: 'editeur' },
      { key: 'detail_hebergement', question: 'Comment évalueriez-vous les modalités de conservation et de sécurisation de vos données ? (0 si vous ne savez pas)', critereMajeur: 'editeur' },
      { key: 'detail_maj', question: 'Comment évalueriez-vous la stratégie de mise à jour de votre logiciel ?', critereMajeur: 'editeur' },
      { key: 'detail_formation', question: 'Comment évalueriez-vous la formation initiale et continue sur l\'utilisation de votre logiciel, et l\'accessibilité de sa documentation le cas échéant ?', critereMajeur: 'editeur' },
      { key: 'detail_ecoute_besoins', question: 'Avez-vous l\'impression que vos besoins sont pris en considération, ou que l\'éditeur avance de son côté sans tenir compte de l\'avis de ses utilisateurs ?', critereMajeur: 'editeur' },
      { key: 'detail_resiliation', question: 'Est-il facile de savoir quand et comment résilier votre logiciel en cas de besoin ?', critereMajeur: 'editeur' },
    ],
  },
  {
    titre: 'Et le meilleur pour la fin',
    questions: [
      { key: 'detail_politique_tarifaire', question: 'Comment évaluez-vous la politique tarifaire ? (abonnements, packs, options, licences, MAJ…)', critereMajeur: 'qualite_prix' },
      { key: 'detail_rapport_qualite_prix', question: 'Comment évalueriez-vous le rapport qualité/prix de votre logiciel ?', critereMajeur: 'qualite_prix' },
      { key: 'detail_efficience', question: 'Estimez-vous que votre logiciel vous fait globalement perdre ou gagner du temps (de 0 à 10) ?', critereMajeur: 'fiabilite' },
      { key: 'detail_nps', question: 'Recommanderiez-vous ce logiciel à vos collègues ?', critereMajeur: 'fiabilite' },
    ],
  },
]

const SECTIONS_AGENDA: RawSection[] = [
  {
    titre: 'Prise de rendez-vous',
    introduction: 'Comment évalueriez-vous les fonctionnalités de prise de rendez-vous :',
    questions: [
      { key: 'agenda_rdv_en_ligne', question: 'La prise de rendez-vous en ligne par vos patients est-elle simple et intuitive ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_rdv_types', question: 'Pouvez-vous facilement configurer différents types de rendez-vous (consultation, téléconsultation, urgence…) ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_rdv_recurrence', question: 'La gestion des rendez-vous récurrents ou des plages horaires est-elle pratique ?', critereMajeur: 'interface' },
      { key: 'agenda_rdv_multisite', question: 'Si vous exercez sur plusieurs sites, la gestion multi-cabinet est-elle bien faite ?', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Rappels et communication patients',
    introduction: 'Concernant la communication avec vos patients :',
    questions: [
      { key: 'agenda_rappel_sms', question: 'Le rappel de rendez-vous par SMS fonctionne-t-il bien ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_rappel_email', question: 'Les rappels par e-mail sont-ils efficaces et personnalisables ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_confirmation', question: 'La confirmation de rendez-vous par le patient (SMS ou en ligne) est-elle bien gérée ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_liste_attente', question: 'Y a-t-il une liste d\'attente automatique en cas d\'annulation ?', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Téléconsultation',
    introduction: 'Si votre agenda propose la téléconsultation :',
    questions: [
      { key: 'agenda_teleconsultation_integree', question: 'La téléconsultation est-elle intégrée directement dans l\'agenda ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_teleconsultation_qualite', question: 'La qualité audio/vidéo de la téléconsultation est-elle satisfaisante ?', critereMajeur: 'fiabilite' },
      { key: 'agenda_teleconsultation_facilite', question: 'Est-ce facile pour vos patients de rejoindre la téléconsultation (lien, application…) ?', critereMajeur: 'interface' },
    ],
  },
  {
    titre: 'Secrétariat et assistance',
    introduction: 'Concernant la gestion du secrétariat :',
    questions: [
      { key: 'agenda_secretariat_tel', question: 'Disposez-vous d\'un secrétariat téléphonique intelligent (IA ou automatisé) et est-il efficace ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_secretariat_filtrage', question: 'Le filtrage et la qualification des appels sont-ils bien gérés ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_secretariat_messages', question: 'La prise de messages et leur transmission sont-elles fiables ?', critereMajeur: 'fiabilite' },
    ],
  },
  {
    titre: 'Interface et ergonomie',
    introduction: 'Au quotidien, comment jugez-vous :',
    questions: [
      { key: 'agenda_vue_planning', question: 'La vue planning (jour, semaine, mois) est-elle claire et lisible ?', critereMajeur: 'interface' },
      { key: 'agenda_code_couleurs', question: 'Le système de codes couleurs ou d\'étiquettes est-il pratique ?', critereMajeur: 'interface' },
      { key: 'agenda_mobile', question: 'L\'accès à votre agenda sur mobile est-il agréable et fonctionnel ?', critereMajeur: 'interface' },
      { key: 'agenda_rapidite', question: 'L\'agenda est-il rapide et réactif, même avec beaucoup de rendez-vous ?', critereMajeur: 'fiabilite' },
    ],
  },
  {
    titre: 'Intégration et interopérabilité',
    introduction: 'Concernant les connexions avec vos autres outils :',
    questions: [
      { key: 'agenda_synchro_logiciel', question: 'La synchronisation avec votre logiciel métier est-elle bien faite ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_synchro_calendrier', question: 'La synchronisation avec vos calendriers personnels (Google, iCal…) fonctionne-t-elle bien ?', critereMajeur: 'fonctionnalites' },
      { key: 'agenda_import_patients', question: 'L\'import de votre base de patients existante s\'est-il bien passé ?', critereMajeur: 'editeur' },
    ],
  },
  {
    titre: 'Éditeur et tarification',
    questions: [
      { key: 'agenda_sav', question: 'Le support client est-il réactif et compétent en cas de problème ?', critereMajeur: 'editeur' },
      { key: 'agenda_tarif', question: 'Le modèle tarifaire est-il clair et adapté à votre pratique ?', critereMajeur: 'qualite_prix' },
      { key: 'agenda_rapport_qualite_prix', question: 'Le rapport qualité/prix global de cet agenda est-il satisfaisant ?', critereMajeur: 'qualite_prix' },
      { key: 'agenda_nps', question: 'Recommanderiez-vous cet agenda à vos collègues ?', critereMajeur: 'fiabilite' },
    ],
  },
]

const SECTIONS_IA_SCRIBES: RawSection[] = [
  {
    titre: 'Utilisabilité',
    introduction: 'Commençons par évaluer « l\'utilisabilité » de votre « IA scribe » :',
    questions: [
      { key: 'scribe_lancement', question: 'Estimez-vous que son lancement lors d\'une consultation est pratique ?', critereMajeur: 'interface' },
      { key: 'scribe_interface', question: 'Globalement, diriez-vous que son interface est agréable à utiliser ?', critereMajeur: 'interface' },
      { key: 'scribe_parametrage', question: 'Pouvez-vous paramétrer votre IA de façon suffisamment fine pour obtenir un rendu qui vous convienne ?', critereMajeur: 'fonctionnalites' },
      { key: 'scribe_delai_generation', question: 'Le délai de la génération de résumé vous semble-t-il adapté à votre pratique ?', critereMajeur: 'fiabilite' },
      { key: 'scribe_reintegration_lm', question: 'Comment évaluez-vous la qualité de la réintégration des résumés de consultation avec les données numériques au bon endroit dans votre Logiciel Métier ? (0 si nécessité de faire du copier/coller)', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Utilité en pratique quotidienne',
    introduction: 'Maintenant, évaluons l\'utilité en pratique quotidienne de votre « IA scribe » :',
    questions: [
      { key: 'scribe_pertinence_resumes', question: 'Estimez-vous que les résumés générés sont pertinents et adaptés à vos attentes ?', critereMajeur: 'fonctionnalites' },
      { key: 'scribe_corrections', question: 'À quel point devez-vous corriger les résumés ?', critereMajeur: 'fonctionnalites' },
      { key: 'scribe_reutilisation', question: 'Arrivez-vous facilement à réutiliser les résumés générés par IA lors de vos consultations antérieures, en comparaison avec vos notes personnelles ?', critereMajeur: 'interface' },
      { key: 'scribe_gain_temps', question: 'Globalement, estimez-vous que votre « IA Scribe » vous fait gagner du temps ?', critereMajeur: 'fonctionnalites' },
      { key: 'scribe_serenite', question: 'Diriez-vous que l\'utilisation d\'une « IA Scribe » au quotidien vous permet de repartir plus serein le soir ?', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Fiabilité',
    introduction: 'Tentons d\'évaluer la fiabilité de votre « IA Scribe » :',
    questions: [
      { key: 'scribe_hallucinations', question: 'Comment estimez-vous la fréquence des « hallucinations » de votre IA ? (items jamais évoqués en consultation)', critereMajeur: 'fiabilite' },
      { key: 'scribe_erreurs_transcription', question: 'Comment estimez-vous la fréquence des erreurs de transcription de votre IA ? (item évoqué mais dont la transcription nécessite une correction manuelle)', critereMajeur: 'fiabilite' },
      { key: 'scribe_stabilite', question: 'Est-ce que votre service d\'« IA Scribe » plante souvent ? (Impossibilité de transcrire une consultation)', critereMajeur: 'fiabilite' },
      { key: 'scribe_support', question: 'Quand vous avez un problème, pouvez-vous compter sur le support ?', critereMajeur: 'editeur' },
    ],
  },
  {
    titre: 'Rapports avec l\'éditeur',
    introduction: 'Maintenant, au sujet de vos rapports avec l\'éditeur :',
    questions: [
      { key: 'scribe_pratiques_commerciales', question: 'Êtes-vous satisfait des pratiques commerciales de votre éditeur ? (avant-vente, sollicitations, compensations par ex.)', critereMajeur: 'editeur' },
      { key: 'scribe_communication', question: 'Trouvez-vous la stratégie de communication de votre éditeur adaptée ? (en cas de nouveauté, de panne, etc.)', critereMajeur: 'editeur' },
      { key: 'scribe_mises_a_jour', question: 'Comment évalueriez-vous la stratégie de mise à jour de votre IA Scribe ? (fréquence, modalités…)', critereMajeur: 'editeur' },
      { key: 'scribe_transparence_technique', question: 'Comment évaluez-vous la facilité de trouver des infos sur le fonctionnement technique de votre « IA Scribe », et sur sa légalité selon les critères actuels ? (0 si vous ne savez pas)', critereMajeur: 'editeur' },
      { key: 'scribe_ecoute_besoins', question: 'Avez-vous l\'impression que vos besoins sont pris en considération, ou que l\'éditeur avance de son côté sans tenir compte de l\'avis de ses utilisateurs ?', critereMajeur: 'editeur' },
      { key: 'scribe_resiliation', question: 'Est-ce facile de résilier votre « IA Scribe » ?', critereMajeur: 'editeur' },
    ],
  },
  {
    titre: 'Rapport qualité-prix',
    introduction: 'Et enfin, en ce qui concerne le rapport qualité-prix :',
    questions: [
      { key: 'scribe_politique_tarifaire', question: 'Comment évaluez-vous la politique tarifaire de l\'éditeur de façon générale ? (abonnements, options, MAJ…)', critereMajeur: 'qualite_prix' },
      { key: 'scribe_qualite_prix', question: 'Comment évaluez-vous le rapport qualité/prix de votre « IA Scribe » ?', critereMajeur: 'qualite_prix' },
    ],
  },
]

const SECTIONS_IA_DOCUMENTAIRES: RawSection[] = [
  {
    titre: 'Utilisabilité',
    introduction: 'Commençons par évaluer « l\'utilisabilité » de votre « IA documentaire » :',
    questions: [
      { key: 'docai_pratique_consultation', question: 'Estimez-vous qu\'il est pratique de l\'utiliser en consultation ?', critereMajeur: 'interface' },
      { key: 'docai_interface', question: 'Diriez-vous que son interface est lisible, agréable à utiliser ?', critereMajeur: 'interface' },
      { key: 'docai_delai_reponse', question: 'Le délai de réponse est-il adapté à votre pratique ?', critereMajeur: 'fiabilite' },
      { key: 'docai_parametrage', question: 'Avez-vous la possibilité de régler des paramètres pour affiner le rendu selon vos souhaits ?', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Fiabilité et utilité en pratique quotidienne',
    introduction: 'Évaluons la fiabilité et l\'utilité en pratique quotidienne de votre « IA documentaire » :',
    questions: [
      { key: 'docai_pertinence_reponses', question: 'Estimez-vous que les réponses soient globalement pertinentes et adaptées à vos attentes ?', critereMajeur: 'fonctionnalites' },
      { key: 'docai_sources', question: 'Les sources citées vous paraissent-elles cohérentes et lisibles ?', critereMajeur: 'fiabilite' },
      { key: 'docai_hallucinations', question: 'Repérez-vous régulièrement des erreurs voire des hallucinations (réponses totalement inadaptées et/ou sur des sujets non couverts par la question) ?', critereMajeur: 'fiabilite' },
      { key: 'docai_syntheses', question: 'Estimez-vous que votre IA sait bien générer des synthèses documentaires ? (ex. protocoles de soins, fiche-conseils pour les patients…)', critereMajeur: 'fonctionnalites' },
      { key: 'docai_transparence_corpus', question: 'Est-ce facile de trouver des infos sur le fonctionnement de votre « IA Documentaire » et le corpus documentaire sur lequel elle se base ? (recos type Vidal, sites internet grand public, PubMed…) (0 si vous ne savez pas)', critereMajeur: 'editeur' },
      { key: 'docai_utilite', question: 'Globalement, estimez-vous que votre « IA Documentaire » soit actuellement utile dans votre pratique ?', critereMajeur: 'fonctionnalites' },
      { key: 'docai_impact_pratiques', question: 'À quel point l\'utilisation de votre IA a changé vos pratiques quotidiennes ?', critereMajeur: 'fonctionnalites' },
    ],
  },
  {
    titre: 'Rapports avec l\'éditeur',
    introduction: 'Au sujet de vos rapports avec l\'éditeur :',
    questions: [
      { key: 'docai_pratiques_commerciales', question: 'Êtes-vous satisfait des pratiques commerciales de l\'éditeur ?', critereMajeur: 'editeur' },
      { key: 'docai_communication', question: 'Trouvez-vous la stratégie de communication de votre éditeur adaptée ? (en cas de modification des algos de recherche, de panne, etc.)', critereMajeur: 'editeur' },
      { key: 'docai_ecoute_besoins', question: 'Avez-vous l\'impression que vos besoins sont pris en considération, ou que l\'éditeur avance de son côté sans tenir compte de l\'avis de ses utilisateurs ?', critereMajeur: 'editeur' },
      { key: 'docai_resiliation', question: 'Est-ce facile de résilier votre « IA Documentaire » ?', critereMajeur: 'editeur' },
    ],
  },
  {
    titre: 'Rapport qualité-prix',
    introduction: 'Et enfin, en ce qui concerne le rapport qualité-prix :',
    questions: [
      { key: 'docai_politique_tarifaire', question: 'Comment évaluez-vous la politique tarifaire de l\'éditeur de façon générale ? (abonnements, options…)', critereMajeur: 'qualite_prix' },
      { key: 'docai_qualite_prix', question: 'Comment évaluez-vous le rapport qualité/prix de votre « IA Documentaire » ?', critereMajeur: 'qualite_prix' },
      { key: 'docai_recommandation', question: 'La recommanderiez-vous à vos collègues ?', critereMajeur: 'fiabilite' },
    ],
  },
]

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seedQuestionnaire(categorieSlug: string, sections: RawSection[]) {
  console.log(`\n📋 Questionnaire : "${categorieSlug}"`)

  // Supprimer l'existant pour ce slug
  if (!DRY) {
    const { data: existing } = await (supabase as any)
      .from('questionnaire_sections')
      .select('id')
      .eq('categorie_slug', categorieSlug)
    if (existing && existing.length > 0) {
      await (supabase as any)
        .from('questionnaire_sections')
        .delete()
        .eq('categorie_slug', categorieSlug)
      console.log(`  🗑  ${existing.length} section(s) existante(s) supprimée(s)`)
    }
  }

  for (let sIndex = 0; sIndex < sections.length; sIndex++) {
    const section = sections[sIndex]
    console.log(`  Section ${sIndex + 1} : "${section.titre}" (${section.questions.length} questions)`)

    if (DRY) continue

    const { data: sectionRow, error: sErr } = await (supabase as any)
      .from('questionnaire_sections')
      .insert({
        categorie_slug: categorieSlug,
        titre: section.titre,
        introduction: section.introduction ?? null,
        ordre: sIndex,
      })
      .select('id')
      .single()

    if (sErr || !sectionRow) {
      console.error(`  ❌ Erreur section "${section.titre}" :`, sErr?.message)
      continue
    }

    const questions = section.questions.map((q, qIndex) => ({
      section_id: sectionRow.id,
      key: q.key,
      question: q.question,
      critere_majeur: q.critereMajeur,
      ordre: qIndex,
    }))

    const { error: qErr } = await (supabase as any)
      .from('questionnaire_questions')
      .insert(questions)

    if (qErr) {
      console.error(`  ❌ Erreur questions :`, qErr.message)
    }
  }
}

async function main() {
  console.log(DRY ? '🔍 Mode dry-run\n' : '🚀 Seed en cours...\n')

  await seedQuestionnaire('default', SECTIONS_DEFAULT)
  await seedQuestionnaire('agenda-medical', SECTIONS_AGENDA)
  await seedQuestionnaire('intelligence-artificielle-medecine', SECTIONS_IA_SCRIBES)
  await seedQuestionnaire('ia-documentaires', SECTIONS_IA_DOCUMENTAIRES)

  console.log('\n✅ Terminé.')
}

main().catch(console.error)
