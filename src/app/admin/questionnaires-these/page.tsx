import { getAllQuestionnairesAdmin } from '@/lib/actions/questionnaires-these'
import { getEtudesCliniquesSuperAdmin } from '@/lib/actions/etudes-cliniques'
import AdminEtudesThesesClient from '@/components/admin/AdminEtudesThesesClient'

export default async function AdminQuestionnairesThesePage() {
  const [questionnaires, etudes] = await Promise.all([
    getAllQuestionnairesAdmin(),
    getEtudesCliniquesSuperAdmin(),
  ])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Études & Thèses</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez les questionnaires de thèse et les études cliniques.
        </p>
      </div>
      <AdminEtudesThesesClient questionnaires={questionnaires} etudes={etudes} />
    </div>
  )
}
