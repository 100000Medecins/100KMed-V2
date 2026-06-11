// Pattern unique du <title> SEO des fiches solutions.
// Si nom_seo est rempli, il est utilisé à la place du nom complet pour tenir
// dans les 60 caractères (ex. HelloDoc au lieu de HelloDoc Assistant).

export function buildSolutionSeoTitle(sol: { nom: string; nom_seo: string | null }): {
  title: string
  overflow: boolean
} {
  const nom = sol.nom_seo?.trim() || sol.nom
  const title = `Les avis de vos confrères sur ${nom} - 100 000 Médecins`
  return { title, overflow: title.length > 60 }
}
