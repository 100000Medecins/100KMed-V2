import { create } from 'zustand'

interface AppState {
  // Catégorie courante sélectionnée
  selectedCategorieId: string | null
  setSelectedCategorieId: (id: string | null) => void

  // UI states
  isMobileMenuOpen: boolean
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Catégorie
  selectedCategorieId: null,
  setSelectedCategorieId: (id) => set({ selectedCategorieId: id }),

  // Mobile menu
  isMobileMenuOpen: false,
  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
}))
