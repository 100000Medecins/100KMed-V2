'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { submitEvaluation } from '@/lib/actions/evaluation'
import { Star, ChevronDown, ChevronRight, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react'

interface PageProps {
  params: { slug: string[] }
}

const CRITERES = [
  { key: 'interface', label: 'Interface utilisateur', question: 'Comment jugez-vous l\'ergonomie et la facilité d\'utilisation du logiciel ?' },
  { key: 'fonctionnalites', label: 'Fonctionnalités', question: 'Les fonctionnalités répondent-elles à vos besoins au quotidien ?' },
  { key: 'fiabilite', label: 'Fiabilité', question: 'Le logiciel est-il stable et fiable dans son utilisation quotidienne ?' },
  { key: 'editeur', label: 'Éditeur / Support', question: 'Comment évaluez-vous la qualité du support et de l\'accompagnement de l\'éditeur ?' },
  { key: 'qualite_prix', label: 'Rapport qualité/prix', question: 'Le rapport qualité/prix est-il satisfaisant ?' },
]

// ─── Étape 2 : Questions détaillées « Usage au quotidien » ───────────────────
// Questions issues du document "Critères de notation #2"
// Chaque question est associée à un critère majeur (interface, fonctionnalites, editeur, qualite_prix, fiabilite)

interface DetailQuestion {
  key: string
  question: string
  critereMajeur: 'interface' | 'fonctionnalites' | 'editeur' | 'qualite_prix' | 'fiabilite'
}

interface DetailSection {
  titre: string
  introduction?: string
  questions: DetailQuestion[]
}

const SECTIONS_DETAILLEES: DetailSection[] = [
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

// ─── Questionnaires spécifiques par catégorie ────────────────────────────────

const SECTIONS_PAR_CATEGORIE: Record<string, DetailSection[]> = {
  'agenda-medical': [
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
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retourne les sections détaillées adaptées à la catégorie, ou les sections par défaut */
function getSectionsForCategorie(categorieSlug: string): DetailSection[] {
  return SECTIONS_PAR_CATEGORIE[categorieSlug] || SECTIONS_DETAILLEES
}

function getTotalQuestions(sections: DetailSection[]): number {
  return sections.reduce((sum, s) => sum + s.questions.length, 0)
}

// ─── Composants ──────────────────────────────────────────────────────────────

function StarSelector({
  value,
  onChange,
}: {
  value: number | null   // null = NC, 0 = pas encore répondu, 1-5 = note
  onChange: (v: number | null) => void
}) {
  const [hover, setHover] = useState(0)
  const isNC = value === null

  return (
    <div className="flex items-center gap-2">
      {/* Bouton NC */}
      <button
        type="button"
        onClick={() => onChange(isNC ? 0 : null)}
        className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-colors shrink-0 ${
          isNC
            ? 'bg-gray-500 text-white border-gray-500'
            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'
        }`}
        title="Non concerné"
      >
        NC
      </button>

      {/* Étoiles */}
      <div className={`flex items-center gap-1 ${isNC ? 'opacity-25 pointer-events-none' : ''}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                !isNC && star <= (hover || (value ?? 0))
                  ? 'text-rating-star fill-rating-star'
                  : 'text-gray-200 fill-gray-200'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Label */}
      {isNC && (
        <span className="text-xs font-medium text-gray-400">Non concerné</span>
      )}
      {!isNC && typeof value === 'number' && value > 0 && (
        <span className="text-sm font-bold text-navy">{value}/5</span>
      )}
    </div>
  )
}

function SectionCollapsible({
  section,
  scores,
  onScoreChange,
  defaultOpen = false,
}: {
  section: DetailSection
  scores: Record<string, number | null>
  onScoreChange: (key: string, value: number | null) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  // Compter les questions répondues : note > 0 OU NC (null)
  const ratedInSection = section.questions.filter((q) => q.key in scores && (scores[q.key] === null || scores[q.key]! > 0)).length

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-navy">{section.titre}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {ratedInSection}/{section.questions.length} questions répondues
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ratedInSection === section.questions.length && ratedInSection > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Complet
            </span>
          )}
          {open ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {section.introduction && (
            <p className="text-xs text-gray-500 italic mt-3 mb-4">{section.introduction}</p>
          )}
          <div className="space-y-4">
            {section.questions.map((q) => (
              <div key={q.key} className="pl-2 border-l-2 border-gray-100">
                <p className="text-xs text-gray-600 mb-2">{q.question}</p>
                <StarSelector
                  value={q.key in scores ? scores[q.key] : 0}
                  onChange={(v) => onScoreChange(q.key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Indicateurs d'étapes ────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Évaluation générale' },
    { num: 2, label: 'Usage au quotidien (optionnel)' },
  ]

  return (
    <div className="flex items-center gap-3 mb-6">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-3">
          {i > 0 && <div className="w-8 h-px bg-gray-200" />}
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep === step.num
                  ? 'bg-accent-blue text-white'
                  : currentStep > step.num
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {currentStep > step.num ? '✓' : step.num}
            </div>
            <span
              className={`text-xs font-medium hidden sm:inline ${
                currentStep === step.num ? 'text-navy' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function NoterPage({ params }: PageProps) {
  const [categorieSlug, solutionSlug] = params.slug
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [solution, setSolution] = useState<any>(null)
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [detailScores, setDetailScores] = useState<Record<string, number | null>>({})
  const [commentaire, setCommentaire] = useState('')
  const [dateDebut, setDateDebut] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push(`/connexion?redirect=/solution/noter/${categorieSlug}/${solutionSlug}`)
      return
    }

    const supabase = createClient()

    // Charger la solution et une éventuelle évaluation existante
    supabase
      .from('solutions')
      .select('id, nom, slug, logo_url, categorie:categories(id, slug)')
      .eq('slug', solutionSlug)
      .single()
      .then(({ data: sol }) => {
        if (!sol) {
          setLoading(false)
          return
        }
        setSolution(sol)

        // Charger évaluation existante
        supabase
          .from('evaluations')
          .select('scores')
          .eq('solution_id', sol.id)
          .eq('user_id', user.id)
          .limit(1)
          .then(({ data: evalData }) => {
            const existing = evalData?.[0]?.scores as Record<string, any> | null
            if (existing) {
              const restoredScores: Record<string, number | null> = {}
              const restoredDetailScores: Record<string, number | null> = {}

              for (const c of CRITERES) {
                if (existing[c.key] === null) {
                  restoredScores[c.key] = null // NC
                } else if (typeof existing[c.key] === 'number') {
                  restoredScores[c.key] = existing[c.key]
                }
              }

              // Restaurer les scores détaillés (toutes les catégories possibles)
              const allSections = [
                ...SECTIONS_DETAILLEES,
                ...Object.values(SECTIONS_PAR_CATEGORIE).flat(),
              ]
              for (const section of allSections) {
                for (const q of section.questions) {
                  if (existing[q.key] === null) {
                    restoredDetailScores[q.key] = null // NC
                  } else if (typeof existing[q.key] === 'number') {
                    restoredDetailScores[q.key] = existing[q.key]
                  }
                }
              }

              setScores(restoredScores)
              setDetailScores(restoredDetailScores)

              if (typeof existing.commentaire === 'string') {
                setCommentaire(existing.commentaire)
              }
              if (typeof existing.date_debut === 'string') {
                setDateDebut(existing.date_debut)
              }
            }
            setLoading(false)
          })
      })
  }, [user, authLoading, categorieSlug, solutionSlug, router])

  // Un critère est "répondu" s'il a une note (> 0) OU s'il est marqué NC (null)
  const allRated = CRITERES.every((c) => scores[c.key] === null || (typeof scores[c.key] === 'number' && scores[c.key]! > 0))

  const sectionsDetail = getSectionsForCategorie(categorieSlug)
  const totalQuestionsDetail = getTotalQuestions(sectionsDetail)
  const detailRatedCount = Object.values(detailScores).filter((v) => v === null || (typeof v === 'number' && v > 0)).length

  const handleSubmit = async () => {
    if (!user || !solution || !allRated) return
    setSubmitting(true)
    setError(null)

    try {
      // Construire les scores finaux (critères principaux + détaillés + commentaire)
      // Les valeurs NC (null) sont conservées telles quelles dans le JSONB
      const finalScores: Record<string, number | string | null> = { ...scores, ...detailScores }
      if (commentaire.trim()) {
        finalScores.commentaire = commentaire.trim()
      }
      if (dateDebut) {
        finalScores.date_debut = dateDebut
      }

      // Calculer la moyenne uniquement sur les critères notés (exclure les NC)
      const numericValues = CRITERES
        .map((c) => scores[c.key])
        .filter((v): v is number => typeof v === 'number' && v > 0)
      const moyenne = numericValues.length > 0
        ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length
        : 0

      // Appeler la server action (bypass RLS)
      await submitEvaluation(solution.id, finalScores, moyenne, dateDebut || null)

      router.push(`/solutions/${categorieSlug}/${solutionSlug}`)
    } catch (err) {
      console.error('Erreur soumission:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <>
        <Navbar />
        <main className="pt-[72px] min-h-screen bg-surface-light flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Chargement de l&apos;évaluation...</div>
        </main>
      </>
    )
  }

  if (!solution) {
    return (
      <>
        <Navbar />
        <main className="pt-[72px] min-h-screen bg-surface-light flex items-center justify-center">
          <div className="text-gray-500">Solution introuvable.</div>
        </main>
        <Footer />
      </>
    )
  }

  const ratedCount = CRITERES.filter((c) => scores[c.key] === null || (typeof scores[c.key] === 'number' && scores[c.key]! > 0)).length

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-navy mb-3">
              Évaluer {solution.nom}
            </h1>
            <StepIndicator currentStep={currentStep} />
          </div>

          {/* ─── Étape 1 : Critères principaux ─────────────────────── */}
          {currentStep === 1 && (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-navy mb-1">
                  Étape 1 — Évaluation générale
                </h2>
                <p className="text-sm text-gray-500">
                  {ratedCount}/{CRITERES.length} critères notés
                </p>
                <div className="mt-3 h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-1.5 bg-accent-blue rounded-full transition-all duration-500"
                    style={{ width: `${(ratedCount / CRITERES.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {/* Depuis quand utilisez-vous ce logiciel ? */}
                <div className="bg-white rounded-card shadow-card p-5">
                  <h3 className="text-sm font-semibold text-navy mb-1">
                    Depuis quand utilisez-vous ce logiciel ?
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Indiquez l&apos;année depuis laquelle vous utilisez cette solution.
                  </p>
                  <select
                    value={dateDebut ? dateDebut.substring(0, 4) : ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setDateDebut(val ? `${val}-01-01` : '')
                    }}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                  >
                    <option value="">Sélectionnez une année</option>
                    {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  {dateDebut && (
                    <p className="text-xs text-gray-400 mt-2">
                      {(() => {
                        const debutYear = parseInt(dateDebut.substring(0, 4))
                        const currentYear = new Date().getFullYear()
                        const diff = currentYear - debutYear
                        if (diff < 1) return 'Moins d\'un an'
                        return `${diff} an${diff > 1 ? 's' : ''} d'utilisation`
                      })()}
                    </p>
                  )}
                </div>

                {CRITERES.map((critere) => (
                  <div key={critere.key} className="bg-white rounded-card shadow-card p-5">
                    <h3 className="text-sm font-semibold text-navy mb-1">
                      {critere.label}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">{critere.question}</p>
                    <StarSelector
                      value={critere.key in scores ? scores[critere.key] : 0}
                      onChange={(v) => setScores((prev) => ({ ...prev, [critere.key]: v }))}
                    />
                  </div>
                ))}

                {/* Commentaire */}
                <div className="bg-white rounded-card shadow-card p-5">
                  <h3 className="text-sm font-semibold text-navy mb-1">
                    Votre commentaire
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Partagez votre expérience avec ce logiciel (optionnel).
                  </p>
                  <textarea
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-none"
                    placeholder="Décrivez votre expérience..."
                  />
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mt-4">
                  {error}
                </div>
              )}

              {/* Actions étape 1 */}
              <div className="flex justify-between items-center mt-8">
                <button
                  onClick={() => router.back()}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setCurrentStep(2)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className={!allRated ? 'opacity-50 pointer-events-none' : ''}
                  >
                    <span className="flex items-center gap-2">
                      Continuer
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </div>

              {!allRated && (
                <p className="text-xs text-gray-400 text-right mt-2">
                  Veuillez noter tous les critères (ou indiquer NC) pour continuer.
                </p>
              )}
            </>
          )}

          {/* ─── Étape 2 : Questions détaillées (optionnelle) ──────── */}
          {currentStep === 2 && (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-navy mb-1">
                  Étape 2 — Racontez-nous votre journée
                </h2>
                <p className="text-xs text-gray-400">
                  {detailRatedCount}/{totalQuestionsDetail} questions répondues
                </p>
                <div className="mt-3 h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-1.5 bg-accent-blue rounded-full transition-all duration-500"
                    style={{ width: `${(detailRatedCount / totalQuestionsDetail) * 100}%` }}
                  />
                </div>
              </div>

              {/* Intro narrative */}
              <div className="bg-blue-50 rounded-card p-4 mb-6">
                <p className="text-xs text-blue-800 leading-relaxed">
                  Cette étape est facultative, mais nous aide à mieux comprendre votre expérience au quotidien.
                </p>
              </div>

              {/* Sections détaillées (accordéons) */}
              <div className="space-y-3">
                {sectionsDetail.map((section, idx) => (
                  <SectionCollapsible
                    key={section.titre}
                    section={section}
                    scores={detailScores}
                    onScoreChange={(key, value) =>
                      setDetailScores((prev) => ({ ...prev, [key]: value }))
                    }
                    defaultOpen={idx === 0}
                  />
                ))}
              </div>

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mt-4">
                  {error}
                </div>
              )}

              {/* Actions étape 2 */}
              <div className="flex justify-between items-center mt-8">
                <button
                  onClick={() => {
                    setCurrentStep(1)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    className={submitting ? 'opacity-50 pointer-events-none' : ''}
                  >
                    {submitting ? 'Envoi en cours...' : 'Soumettre mon évaluation'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
