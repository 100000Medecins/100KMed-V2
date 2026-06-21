/**
 * Mode preview (dev / Vercel Preview uniquement) : affiche les catégories ET
 * solutions encore `actif=false` pour pouvoir tester le parcours complet avant
 * publication, alors que la base est partagée entre dev et prod.
 *
 * Activé par la variable d'environnement `PREVIEW_CATEGORIES_INACTIVES=true`.
 * ⚠️ NE JAMAIS la définir en Production (Vercel) : sinon les catégories non
 * publiées deviendraient visibles sur www. À mettre uniquement dans `.env.local`
 * et dans l'environnement « Preview » de Vercel.
 *
 * N'affecte PAS le sitemap (qui filtre toujours `actif`) → zéro risque d'indexation.
 */
export const previewInactive = (): boolean =>
  process.env.PREVIEW_CATEGORIES_INACTIVES === 'true'
