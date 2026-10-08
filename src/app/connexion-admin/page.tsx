import type { Metadata } from 'next'
import AdminLoginForm from '@/components/admin/AdminLoginForm'

export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false },
}

/**
 * Connexion à l'admin, hors de l'arborescence /admin : le proxy sert cette page à la place de
 * toute page /admin/* demandée sans jeton admin valide. Le layout de l'admin ne suffit pas :
 * Next calcule la page en parallèle du layout et en envoie les données même quand le layout
 * affiche le formulaire de connexion.
 */
export default function ConnexionAdminPage() {
  return (
    <div className="min-h-screen bg-surface-light flex items-center justify-center">
      <AdminLoginForm />
    </div>
  )
}
