import QuestionnaireTheseForm from '@/components/mon-compte/QuestionnaireTheseForm'

export const dynamic = 'force-dynamic'

export default function ProposerQuestionnaireThesePage() {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        Vous menez une thèse en lien avec l&apos;e-santé ? Déposez votre questionnaire ici pour qu&apos;il soit relayé auprès des médecins inscrits.
      </p>
      <QuestionnaireTheseForm redirectOnSuccess="/mon-compte/mes-questionnaires-these" />
    </div>
  )
}
