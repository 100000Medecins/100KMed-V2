/**
 * Barrel export pour la couche d'accès données.
 *
 * Utilisation dans les Server Components :
 *   import { getSolutionById, getCategories } from '@/lib/db'
 */

// Solutions
export {
  getSolutions,
  getSolutionById,
  getSolutionsByTags,
  getSolutionsByCategorieAndType,
  getAllSolutionIds,
} from './solutions'

// Catégories
export {
  getCategories,
  getCategorieById,
  getCategorieDefaut,
  getAllCategorieIds,
} from './categories'

// Éditeurs
export {
  getEditeurs,
  getEditeurById,
  getEditeurWithSolutions,
  getAllEditeurIds,
} from './editeurs'

// Critères
export {
  getCriteresByType,
  getCritereById,
  getCriteresHierarchie,
} from './criteres'

// Résultats
export {
  getResultatsByType,
  getResultatByTypeCritere,
  getResultatByIdCritere,
  getResultatsComparaison,
  getAllResultats,
} from './resultats'

// Évaluations
export {
  getEvaluation,
  getAvisUtilisateurs,
  getLastAvisUtilisateurs,
  getDureeUtilisationSolution,
} from './evaluations'

// Utilisateurs
export {
  getCurrentUser,
  getUserById,
  getUserPreferences,
  getAllPreferences,
  getSolutionsUtilisees,
  getSolutionUtilisee,
  getSolutionsFavorites,
  isSolutionFavorite,
  getTrancheAge,
} from './users'

// Admin
export {
  getAllSolutionsAdmin,
  getSolutionByIdAdmin,
} from './admin-solutions'

// Pages statiques
export {
  getPagesStatiques,
  getPageBySlug,
} from './pages'

// Divers
export {
  getAvatars,
  getVideos,
  getActualites,
  getTags,
  getTagsPrincipauxForSolution,
  getDocuments,
} from './misc'
