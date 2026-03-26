import { create } from 'zustand'

interface AppState {
  // Catégorie courante sélectionnée
  selectedCategorieId: string | null
  setSelectedCategorieId: (id: string | null) => void

  // UI states
  isMobileMenuOpen: boolean
  toggleMobileMenu: () => void
  closeMobileMenu: () => void

  // Modal de comparaison
  comparaisonSolutionIds: string[]
  addToComparaison: (solutionId: string) => void
  removeFromComparaison: (solutionId: string) => void
  clearComparaison: () => void
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

  // Comparaison (max 3 solutions)
  comparaisonSolutionIds: [],
  addToComparaison: (solutionId) =>
    set((state) => {
      if (state.comparaisonSolutionIds.length >= 3) return state
      if (state.comparaisonSolutionIds.includes(solutionId)) return state
      return {
        comparaisonSolutionIds: [...state.comparaisonSolutionIds, solutionId],
      }
    }),
  removeFromComparaison: (solutionId) =>
    set((state) => ({
      comparaisonSolutionIds: state.comparaisonSolutionIds.filter(
        (id) => id !== solutionId
      ),
    })),
  clearComparaison: () => set({ comparaisonSolutionIds: [] }),
}))
