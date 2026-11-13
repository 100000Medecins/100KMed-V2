import type { Metadata } from 'next'
import EspaceMonCompte from '@/components/layout/EspaceMonCompte'

// Annuaire entre médecins : privé (connexion + preuve PSC), jamais indexé. Fait partie de l'espace
// « Mon compte » (même menu), à sa propre adresse.
export const metadata: Metadata = {
  title: 'Annuaire MSSanté',
  robots: { index: false, follow: false },
}

export default function AnnuaireLayout({ children }: { children: React.ReactNode }) {
  return <EspaceMonCompte>{children}</EspaceMonCompte>
}
