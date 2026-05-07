import { getSectionsForSlug, getAllSlugs } from '@/lib/actions/questionnaires'
import QuestionnaireEditor from '@/components/admin/QuestionnaireEditor'

export default async function QuestionnairesAdminPage({
  searchParams,
}: {
  searchParams: { slug?: string }
}) {
  const allSlugs = await getAllSlugs()
  const activeSlug = searchParams.slug || allSlugs[0] || 'default'
  const sections = await getSectionsForSlug(activeSlug)

  const slugLabels: Record<string, string> = {
    default: 'Logiciels métier (défaut)',
    'agendas-medicaux': 'Agenda médical',
    'intelligence-artificielle-medecine': 'IA Scribes',
    'ia-documentaires': 'IA Documentaires',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Questionnaires d'évaluation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les questions détaillées du formulaire d'évaluation par catégorie.
        </p>
      </div>

      {/* Onglets par catégorie */}
      <div className="flex flex-wrap gap-2">
        {allSlugs.map((slug) => (
          <a
            key={slug}
            href={`/admin/questionnaires?slug=${slug}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activeSlug === slug
                ? 'bg-navy text-white border-navy'
                : 'bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy'
            }`}
          >
            {slugLabels[slug] || slug}
          </a>
        ))}
      </div>

      <QuestionnaireEditor
        categorieSlug={activeSlug}
        initialSections={sections}
        slugLabel={slugLabels[activeSlug] || activeSlug}
      />
    </div>
  )
}
