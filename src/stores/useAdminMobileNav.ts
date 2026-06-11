/**
 * État du drawer de navigation admin sur mobile.
 *
 * Dédié à l'admin (séparé de `useAppStore.isMobileMenuOpen` qui contrôle
 * le menu du site public) pour éviter qu'un toggle public ouvre l'admin
 * ou inversement.
 *
 * AdminHeader appelle `toggle()` au clic sur le burger.
 * AdminSidebar lit `isOpen` pour afficher le drawer + appelle `close()`
 * au clic sur un lien (auto-fermeture à la navigation).
 */
import { create } from 'zustand'

interface AdminMobileNavState {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

export const useAdminMobileNav = create<AdminMobileNavState>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  close: () => set({ isOpen: false }),
}))
