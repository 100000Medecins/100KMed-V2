'use client'

import React, { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { submitEvaluation, submitEvaluationAnonyme, saveDraftEvaluation } from '@/lib/actions/evaluation'
import { Star, ChevronDown, ChevronRight, ArrowLeft, ArrowRight, SkipForward, Mail, CheckCircle } from 'lucide-react'
import { getCritereLabel } from '@/lib/constants/criteres'
import AcronymText from '@/components/AcronymText'

interface PageProps {
  params: Promise<{ slug: string[] }>
}

const CRITERES = [
  { key: 'interface', question: 'Comment jugez-vous l\'ergonomie et la facilité d\'utilisation du logiciel ?' },
  { key: 'fonctionnalites', question: 'Les fonctionnalités répondent-elles à vos besoins au quotidien ?' },
  { key: 'fiabilite', question: 'Le logiciel est-il stable et fiable dans son utilisation quotidienne ?' },
  { key: 'editeur', question: 'Comment évaluez-vous la qualité du support et de l\'accompagnement de l\'éditeur ?' },
  { key: 'qualite_prix', question: 'Le rapport qualité/prix est-il satisfaisant ?' },
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

interface SubstepGroup {
  label: string
  sections: DetailSection[]
}

/** Regroupe les sections détaillées en sous-étapes : Avant / Pendant / Après / Pour finir */
function getSubsteps(sections: DetailSection[]): SubstepGroup[] {
  const hasAvant = sections.some(s => s.titre === 'Avant la consultation')

  if (!hasAvant) {
    // Catégories spécifiques : une seule sous-étape
    return [{ label: 'Questions détaillées', sections }]
  }

  const avant = sections.filter(s => s.titre === 'Avant la consultation')
  const pendant = sections.filter(s => s.titre.startsWith('Pendant la consultation'))
  const apres = sections.filter(
    s => s.titre === 'Après la consultation' || s.titre === 'Arrêt de travail et facturation'
  )
  const reste = sections.filter(
    s =>
      s.titre !== 'Avant la consultation' &&
      !s.titre.startsWith('Pendant la consultation') &&
      s.titre !== 'Après la consultation' &&
      s.titre !== 'Arrêt de travail et facturation'
  )

  return [
    { label: 'Avant la consultation', sections: avant },
    { label: 'Pendant la consultation', sections: pendant },
    { label: 'Après la consultation', sections: apres },
    { label: 'Pour finir', sections: reste },
  ].filter(g => g.sections.length > 0)
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
    <div className="flex flex-wrap items-center gap-2">
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
              className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
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
        <span className="text-xs font-medium text-gray-400 whitespace-nowrap">Non concerné</span>
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
          <AcronymText as="h3" className="text-sm font-semibold text-navy" text={section.titre} />
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
                <AcronymText as="p" className="text-xs text-gray-600 mb-2" text={q.question} />
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

function StepIndicator({
  currentStep,
  substepLabels,
  canNavigate,
  onStepClick,
}: {
  currentStep: number
  substepLabels: string[]
  canNavigate: boolean
  onStepClick: (stepNum: number) => void
}) {
  const allSteps = [
    { label: 'Évaluation générale', optional: false },
    ...substepLabels.map(l => ({ label: l, optional: true })),
  ]

  return (
    <div className="flex flex-col mb-6">
      {allSteps.map((step, i) => {
        const stepNum = i + 1
        const isActive = currentStep === stepNum
        const isDone = currentStep > stepNum
        const isLast = i === allSteps.length - 1
        // Étape 1 toujours cliquable ; étapes suivantes si step 1 validé
        const isClickable = stepNum === 1 || canNavigate
        return (
          <div key={i} className="flex items-stretch gap-3">
            {/* Colonne gauche : cercle + trait vertical */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(stepNum)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                  isActive
                    ? 'bg-accent-blue text-white'
                    : isDone
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : isClickable
                        ? 'bg-gray-400 text-white hover:bg-gray-500'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                {isDone ? '✓' : stepNum}
              </button>
              {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>
            {/* Label */}
            <div className={`flex items-center ${isLast ? '' : 'pb-3'}`}>
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(stepNum)}
                className={`text-xs font-medium text-left transition-colors ${
                  isActive
                    ? 'text-navy'
                    : isDone && isClickable
                      ? 'text-gray-600 hover:text-navy'
                      : isClickable
                        ? 'text-gray-600 hover:text-navy'
                        : 'text-gray-500 cursor-not-allowed'
                }`}
              >
                {step.label}
                {step.optional && <span className="font-normal"> (opt.)</span>}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function NoterPage(props: PageProps) {
  const params = use(props.params);
  const [categorieSlug, solutionSlug] = params.slug
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [solution, setSolution] = useState<any>(null)
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [detailScores, setDetailScores] = useState<Record<string, number | null>>({})
  const [commentaire, setCommentaire] = useState('')
  const [dateDebut, setDateDebut] = useState<string>('')
  const [dateFin, setDateFin] = useState<string>('')
  const [plusUtilise, setPlusUtilise] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [emailAnonyme, setEmailAnonyme] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [sectionsDB, setSectionsDB] = useState<DetailSection[]>([])
  const [questionnaireLoaded, setQuestionnaireLoaded] = useState(false)
  const saveDraftRef = useRef<() => void>(() => {})

  // Charger les sections depuis la DB
  useEffect(() => {
    fetch(`/api/questionnaire/${categorieSlug}`)
      .then((r) => r.json())
      .then((data) => {
        setSectionsDB(data.map((s: any) => ({
          titre: s.titre,
          introduction: s.introduction ?? undefined,
          questions: s.questions.map((q: any) => ({
            key: q.key,
            question: q.question,
            critereMajeur: q.critere_majeur,
          })),
        })))
      })
      .catch(() => {})
      .finally(() => setQuestionnaireLoaded(true))
  }, [categorieSlug])

  useEffect(() => {
    if (authLoading) return

    const supabase = createClient()

    // Charger la solution (accessible sans auth)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any
    s
      .from('solutions')
      .select('id, nom, slug, logo_url, categorie:categories(id, slug, label_fonctionnalites)')
      .eq('slug', solutionSlug)
      .single()
      .then(({ data: sol }: { data: any }) => {
        if (!sol) {
          setLoading(false)
          return
        }
        setSolution(sol)

        if (!user) {
          setLoading(false)
          return
        }

        // Charger évaluation existante (uniquement si connecté)
        s
          .from('evaluations')
          .select('scores')
          .eq('solution_id', sol.id)
          .eq('user_id', user.id)
          .limit(1)
          .then(({ data: evalData }: { data: any }) => {
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

              // Restaurer les scores détaillés depuis toutes les clés inconnues des CRITERES
              const critereKeys = new Set(CRITERES.map((c) => c.key))
              const metaKeys = new Set(['commentaire', 'date_debut', 'date_fin'])
              for (const [key, value] of Object.entries(existing)) {
                if (critereKeys.has(key) || metaKeys.has(key)) continue
                if (value === null) {
                  restoredDetailScores[key] = null
                } else if (typeof value === 'number') {
                  restoredDetailScores[key] = value
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
              if (typeof existing.date_fin === 'string' && existing.date_fin) {
                setDateFin(existing.date_fin)
                setPlusUtilise(true)
              }
            }
            setLoading(false)
          })
      })
  }, [user, authLoading, solutionSlug])

  // Un critère est "répondu" s'il a une note (> 0) OU s'il est marqué NC (null)
  const allRated = CRITERES.every((c) => scores[c.key] === null || (typeof scores[c.key] === 'number' && scores[c.key]! > 0))

  const sectionsDetail = sectionsDB
  const substeps = getSubsteps(sectionsDetail)
  // Pour les anonymes, une étape email est ajoutée en fin de parcours
  const totalSteps = 1 + substeps.length + (!user ? 1 : 0)
  const isEmailStep = !user && currentStep === totalSteps

  const substepIndex = Math.max(0, currentStep - 2)
  const currentSubstepGroup = currentStep >= 2 && !isEmailStep ? substeps[substepIndex] : null
  const isLastStep = currentStep === totalSteps

  const currentSubstepQuestions = currentSubstepGroup?.sections.flatMap(s => s.questions) ?? []
  const currentSubstepRated = currentSubstepQuestions.filter(
    q => q.key in detailScores && (detailScores[q.key] === null || detailScores[q.key]! > 0)
  ).length

  // Pour chaque critère majeur, si une majorité de ses sous-questions est répondue
  // (note > 0 ou NC/null comptent comme répondues), on remplace la note initiale
  // par la moyenne des réponses numériques. Sinon on garde la note de l'étape 1.
  const buildRefinedCritereScores = (): Record<string, number> => {
    const allDetailQuestions = sectionsDetail.flatMap((s) => s.questions)
    const refined: Record<string, number> = {}

    for (const critere of CRITERES) {
      const questionsForCritere = allDetailQuestions.filter((q) => q.critereMajeur === critere.key)
      const originalScore = typeof scores[critere.key] === 'number' ? (scores[critere.key] as number) : 0

      if (questionsForCritere.length === 0) {
        refined[critere.key] = originalScore
        continue
      }

      const answered = questionsForCritere.filter((q) => q.key in detailScores)
      const majorityReached = answered.length > questionsForCritere.length / 2

      if (majorityReached) {
        const numericAnswers = answered
          .map((q) => detailScores[q.key])
          .filter((v): v is number => typeof v === 'number' && v > 0)
        refined[critere.key] = numericAnswers.length > 0
          ? numericAnswers.reduce((sum, v) => sum + v, 0) / numericAnswers.length
          : originalScore
      } else {
        refined[critere.key] = originalScore
      }
    }

    return refined
  }

  const buildFinalScores = () => {
    const refinedScores = buildRefinedCritereScores()
    const finalScores: Record<string, number | string | null> = { ...scores, ...detailScores, ...refinedScores }
    if (commentaire.trim()) finalScores.commentaire = commentaire.trim()
    if (dateDebut) finalScores.date_debut = dateDebut
    if (plusUtilise && dateFin) finalScores.date_fin = dateFin
    return finalScores
  }

  const buildMoyenne = () => {
    const refinedScores = buildRefinedCritereScores()
    const numericValues = CRITERES
      .map((c) => refinedScores[c.key])
      .filter((v): v is number => typeof v === 'number' && v > 0)
    return numericValues.length > 0
      ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length
      : 0
  }

  // Sauvegarde silencieuse du brouillon
  // overrideScores / overrideDetailScores permettent de passer le nouvel état
  // immédiatement après un setState (avant le re-render React)
  const saveDraft = (
    overrideScores?: Record<string, number | null>,
    overrideDetailScores?: Record<string, number | null>
  ) => {
    if (!user || !solution) return
    const s = overrideScores ?? scores
    const d = overrideDetailScores ?? detailScores
    const refined: Record<string, number> = {}
    const allDetailQuestions = sectionsDetail.flatMap((sec) => sec.questions)
    for (const critere of CRITERES) {
      const questionsForCritere = allDetailQuestions.filter((q) => q.critereMajeur === critere.key)
      const originalScore = typeof s[critere.key] === 'number' ? (s[critere.key] as number) : 0
      if (questionsForCritere.length === 0) { refined[critere.key] = originalScore; continue }
      const answered = questionsForCritere.filter((q) => q.key in d)
      const majorityReached = answered.length > questionsForCritere.length / 2
      if (majorityReached) {
        const numericAnswers = answered.map((q) => d[q.key]).filter((v): v is number => typeof v === 'number' && v > 0)
        refined[critere.key] = numericAnswers.length > 0 ? numericAnswers.reduce((sum, v) => sum + v, 0) / numericAnswers.length : originalScore
      } else {
        refined[critere.key] = originalScore
      }
    }
    const finalScores: Record<string, number | string | null> = { ...s, ...d, ...refined }
    if (commentaire.trim()) finalScores.commentaire = commentaire.trim()
    if (dateDebut) finalScores.date_debut = dateDebut
    if (plusUtilise && dateFin) finalScores.date_fin = dateFin
    saveDraftEvaluation(solution.id, finalScores).catch(() => {})
  }

  // Maintenir la ref à jour pour pouvoir sauvegarder depuis beforeunload
  saveDraftRef.current = saveDraft

  // Sauvegarder quand l'utilisateur quitte la page (ferme l'onglet, recharge, etc.)
  useEffect(() => {
    const handleBeforeUnload = () => { saveDraftRef.current() }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Scroll vers #commentaire après chargement si l'ancre est dans l'URL
  useEffect(() => {
    if (!loading && window.location.hash === '#commentaire') {
      const el = document.getElementById('commentaire')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading])


  // Sauvegarde + avance à l'étape suivante
  const handleNext = () => {
    saveDraft()
    setCurrentStep(prev => prev + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Sauvegarde + recule à l'étape précédente
  const handleBack = () => {
    saveDraft()
    setCurrentStep(prev => prev - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!solution || !allRated) return

    // Utilisateur anonyme : aller à l'étape email
    if (!user) {
      setCurrentStep(totalSteps)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await submitEvaluation(
        solution.id,
        buildFinalScores(),
        buildMoyenne(),
        dateDebut || null,
        plusUtilise ? (dateFin || null) : null
      )
    } catch (err) {
      console.error('Erreur soumission:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
      setSubmitting(false)
      return
    }

    // Succès : on arrête le spinner immédiatement (feedback instantané) AVANT la navigation,
    // pour ne pas dépendre uniquement du router.push — la route /mon-compte est protégée et
    // rendue côté serveur, donc peut tarder. La confirmation = l'arrivée sur « Mes évaluations ».
    setSubmitting(false)
    router.push('/mon-compte/mes-evaluations')
  }

  const handleSubmitAnonyme = async () => {
    if (!solution) return
    setEmailError(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailAnonyme.trim() || !emailRegex.test(emailAnonyme.trim())) {
      setEmailError('Veuillez saisir une adresse email valide.')
      return
    }

    setSubmitting(true)
    try {
      await submitEvaluationAnonyme(
        solution.id,
        buildFinalScores(),
        buildMoyenne(),
        emailAnonyme.trim(),
        dateDebut || null,
        plusUtilise ? (dateFin || null) : null
      )
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Erreur soumission anonyme:', err)
      setEmailError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || authLoading || !questionnaireLoaded) {
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

  if (sectionsDB.length === 0) {
    return (
      <>
        <Navbar />
        <main className="pt-[72px] min-h-screen bg-surface-light flex items-center justify-center">
          <div className="max-w-md mx-auto px-6 text-center py-16">
            <h1 className="text-lg font-bold text-navy mb-2">Questionnaire en cours d&apos;élaboration</h1>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Le questionnaire d&apos;évaluation pour cette catégorie n&apos;est pas encore disponible.
              Il sera publié prochainement — revenez bientôt.
            </p>
            <button
              onClick={() => router.push(`/solutions/${categorieSlug}/${solutionSlug}`)}
              className="text-sm text-accent-blue hover:underline"
            >
              Retour à la fiche solution
            </button>
          </div>
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
            <StepIndicator
              currentStep={currentStep}
              substepLabels={substeps.map(s => s.label)}
              canNavigate={allRated}
              onStepClick={(stepNum) => {
                setCurrentStep(stepNum)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
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
                    Depuis combien d&apos;années utilisez-vous ce logiciel ?
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Indiquez approximativement depuis combien de temps vous utilisez cette solution.
                  </p>
                  <select
                    value={dateDebut ? String(new Date().getFullYear() - parseInt(dateDebut.substring(0, 4))) : ''}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '') { setDateDebut(''); return }
                      const year = new Date().getFullYear() - parseInt(val)
                      setDateDebut(`${year}-01-01`)
                    }}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                  >
                    <option value="">Sélectionnez une durée</option>
                    <option value="0">Moins d&apos;1 an</option>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} an{n > 1 ? 's' : ''}</option>
                    ))}
                    <option value="21">Plus de 20 ans</option>
                  </select>

                  {/* Case à cocher : plus utilisé */}
                  <label className="flex items-center gap-2 mt-3 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={plusUtilise}
                      onChange={(e) => {
                        setPlusUtilise(e.target.checked)
                        if (e.target.checked) {
                          setDateFin(`${new Date().getFullYear()}-01-01`)
                        } else {
                          setDateFin('')
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 accent-accent-blue cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">Je n&apos;utilise plus ce logiciel</span>
                  </label>

                  {/* Sélecteur d'année de fin (si coché) */}
                  {plusUtilise && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">Depuis quelle année ne l&apos;utilisez-vous plus ?</p>
                      <select
                        value={dateFin ? dateFin.substring(0, 4) : new Date().getFullYear().toString()}
                        onChange={(e) => {
                          const val = e.target.value
                          setDateFin(val ? `${val}-01-01` : '')
                        }}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                      >
                        {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Résumé de la durée */}
                  {dateDebut && (
                    <p className="text-xs text-gray-400 mt-2">
                      {(() => {
                        const debutYear = parseInt(dateDebut.substring(0, 4))
                        const refYear = plusUtilise && dateFin
                          ? parseInt(dateFin.substring(0, 4))
                          : new Date().getFullYear()
                        const diff = refYear - debutYear
                        const duree = diff < 1 ? 'Moins d\'un an' : `${diff} an${diff > 1 ? 's' : ''}`
                        return plusUtilise
                          ? `${duree} d'utilisation (logiciel abandonné)`
                          : `${duree} d'utilisation`
                      })()}
                    </p>
                  )}
                </div>

                {CRITERES.map((critere) => (
                  <div key={critere.key} className="bg-white rounded-card shadow-card p-5">
                    <AcronymText
                      as="h3"
                      className="text-sm font-semibold text-navy mb-1"
                      text={getCritereLabel(critere.key, solution?.categorie?.label_fonctionnalites)}
                    />
                    <AcronymText as="p" className="text-xs text-gray-500 mb-3" text={critere.question} />
                    <StarSelector
                      value={critere.key in scores ? scores[critere.key] : 0}
                      onChange={(v) => {
                        const next = { ...scores, [critere.key]: v }
                        setScores(next)
                        saveDraft(next, detailScores)
                      }}
                    />
                  </div>
                ))}

                {/* Commentaire */}
                <div id="commentaire" className="bg-white rounded-card shadow-card p-5">
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-y"
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

          {/* ─── Écran de confirmation (après soumission anonyme) ─── */}
          {submitted && (
            <div className="bg-white rounded-card shadow-card p-8 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-14 h-14 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-navy mb-2">
                Votre évaluation a bien été enregistrée !
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Un email de vérification a été envoyé à <strong>{emailAnonyme}</strong>.
              </p>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 text-left mb-6">
                <p className="font-semibold mb-1">Prochaine étape :</p>
                <p>Cliquez sur le lien dans l&apos;email pour vous connecter via <strong>Pro Santé Connect</strong> et confirmer que vous êtes médecin en exercice.</p>
                <p className="mt-2">Votre avis sera publié automatiquement après validation.</p>
              </div>
              <button
                onClick={() => router.push(`/solutions/${categorieSlug}/${solutionSlug}`)}
                className="text-sm text-accent-blue hover:underline"
              >
                Retour à la fiche solution
              </button>
            </div>
          )}

          {/* ─── Étape email (anonyme uniquement, dernière étape) ─── */}
          {isEmailStep && !submitted && (
            <>
              <div className="mb-6">
                <h2 className="text-base font-semibold text-navy mb-1">
                  Dernière étape — Vérification de votre identité
                </h2>
                <p className="text-sm text-gray-500">
                  Pour garantir que les avis publiés proviennent de médecins en exercice, nous devons vérifier votre identité via Pro Santé Connect.
                </p>
              </div>

              <div className="bg-white rounded-card shadow-card p-6 space-y-4">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Mail className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
                  <p>
                    Saisissez votre adresse email. Nous vous enverrons un lien pour vous connecter une seule fois via <strong>Pro Santé Connect</strong>. Votre avis sera publié automatiquement après validation.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-navy mb-1.5">
                    Votre adresse email
                  </label>
                  <input
                    type="email"
                    value={emailAnonyme}
                    onChange={(e) => {
                      setEmailAnonyme(e.target.value)
                      setEmailError(null)
                    }}
                    placeholder="prenom.nom@exemple.fr"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitAnonyme() }}
                  />
                  {emailError && (
                    <p className="text-xs text-red-500 mt-1">{emailError}</p>
                  )}
                </div>

                <div className="bg-surface-light rounded-xl p-3 text-xs text-gray-500">
                  Votre email ne sera pas affiché publiquement. Il est uniquement utilisé pour envoyer le lien de vérification.
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <Button
                  variant="primary"
                  onClick={handleSubmitAnonyme}
                  className={`w-full sm:w-auto sm:order-2 ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {submitting ? 'Envoi en cours...' : 'Recevoir mon lien de vérification'}
                  </span>
                </Button>
                <button
                  onClick={handleBack}
                  className="sm:order-1 text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
              </div>
            </>
          )}

          {/* ─── Étapes 2+ : Sous-étapes détaillées (optionnelles) ── */}
          {currentStep >= 2 && currentSubstepGroup && (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-navy mb-1">
                  {currentSubstepGroup.label}
                </h2>
                <p className="text-xs text-gray-400">
                  {currentSubstepRated}/{currentSubstepQuestions.length} questions répondues
                </p>
                <div className="mt-3 h-1.5 bg-gray-200 rounded-full">
                  <div
                    className="h-1.5 bg-accent-blue rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        currentSubstepQuestions.length > 0
                          ? (currentSubstepRated / currentSubstepQuestions.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Intro narrative */}
              <div className="bg-blue-50 rounded-card p-4 mb-3">
                <p className="text-xs text-blue-800 leading-relaxed">
                  Cette section est facultative, mais nous aide à mieux comprendre votre expérience au quotidien.
                </p>
              </div>

              {/* Raccourci « passer et soumettre » visible sans scroller (miroir du bouton du bas) */}
              {!isLastStep && (
                <div className="flex justify-end mb-6">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="text-sm font-medium text-accent-blue hover:text-accent-blue/80 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <SkipForward className="w-4 h-4" />
                    Passer et soumettre
                  </button>
                </div>
              )}

              {/* Sections de la sous-étape courante (accordéons) */}
              <div className="space-y-3">
                {currentSubstepGroup.sections.map((section, idx) => (
                  <SectionCollapsible
                    key={section.titre}
                    section={section}
                    scores={detailScores}
                    onScoreChange={(key, value) => {
                      const next = { ...detailScores, [key]: value }
                      setDetailScores(next)
                      saveDraft(scores, next)
                    }}
                    defaultOpen={true}
                  />
                ))}
              </div>

              {/* Erreur */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mt-4">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                {/* Bouton principal — pleine largeur sur mobile */}
                {isLastStep ? (
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    className={`w-full sm:w-auto sm:order-2 ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {submitting ? 'Envoi en cours...' : 'Soumettre mon évaluation'}
                    </span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    className="w-full sm:w-auto sm:order-2"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Suivant
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                )}
                {/* Actions secondaires */}
                <div className="flex items-center justify-between sm:order-1 sm:gap-4">
                  <button
                    onClick={handleBack}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                  </button>
                  {!isLastStep && (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <SkipForward className="w-4 h-4" />
                      Passer et soumettre
                    </button>
                  )}
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
