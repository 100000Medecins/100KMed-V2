// Pattern du <title> SEO des fiches solutions.
//
// Accroche adaptative (pour tenir dans ~60 caractères affichés par Google sans
// champ manuel à remplir) :
//   1. « Les avis de vos confrères sur <nom> - 100 000 Médecins »  (accroche longue)
//   2. si trop long → « Les avis sur <nom> - 100 000 Médecins »     (accroche courte)
//   3. si le nom complet déborde MÊME en accroche courte → on retombe sur nom_seo
//      (override optionnel, utile seulement pour une poignée de noms très longs).
//
// On privilégie toujours le nom COMPLET (meilleur SEO + lisibilité) : nom_seo n'est
// consulté que lorsque le nom ne tient pas, même raccourci. Pour la quasi-totalité
// des fiches, aucun nom_seo n'est nécessaire.

const SUFFIX = ' - 100 000 Médecins'
const LEAD_LONG = 'Les avis de vos confrères sur '
const LEAD_SHORT = 'Les avis sur '
const MAX_LEN = 60

function compose(lead: string, name: string): string {
  return `${lead}${name}${SUFFIX}`
}

// Meilleur title pour un nom donné : accroche longue si elle tient, sinon courte.
// `overflow` = true si même l'accroche courte déborde des 60 caractères.
function bestForName(name: string): { title: string; overflow: boolean } {
  const long = compose(LEAD_LONG, name)
  if (long.length <= MAX_LEN) return { title: long, overflow: false }
  const short = compose(LEAD_SHORT, name)
  return { title: short, overflow: short.length > MAX_LEN }
}

export function buildSolutionSeoTitle(sol: { nom: string; nom_seo: string | null }): {
  title: string
  overflow: boolean
} {
  // 1 + 2 : nom complet d'abord (accroche longue, sinon courte).
  const full = bestForName(sol.nom)
  if (!full.overflow) return full

  // 3 : le nom complet déborde même en accroche courte → override nom_seo si fourni.
  const short = sol.nom_seo?.trim()
  if (short) return bestForName(short)

  // Pas d'override disponible : on renvoie la version courte du nom complet, en overflow.
  return full
}
