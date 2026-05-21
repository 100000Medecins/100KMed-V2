const ALLOWED_TAGS = ['br', 'u', 'b', 'strong', 'em', 'i', 'p', 'ul', 'ol', 'li']

const ALLOWED_RE = new RegExp(
  `<\\/?(${ALLOWED_TAGS.join('|')})(\\s*\\/?)>`,
  'gi',
)

/** Échappe les caractères spéciaux HTML dans du texte. */
function escapeHtmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Échappe une valeur d'attribut (guillemets inclus). */
function escapeAttr(s: string): string {
  return escapeHtmlText(s).replace(/"/g, '&quot;')
}

/**
 * Sanitize une chaîne HTML en ne conservant que :
 * - la mise en forme inline : br, u, b, strong, em, i
 * - les paragraphes : p
 * - les listes : ul, ol, li
 * - les liens `<a href>` dont le href est en http(s):// ou mailto: (target/rel forcés)
 *
 * Toute autre balise (script, img, iframe, style, table, h1…) est supprimée.
 *
 * Si le contenu ne comporte aucune balise HTML (texte brut saisi « à plat »),
 * les caractères spéciaux sont échappés et les retours à la ligne convertis
 * en <br> — filet pour les contenus legacy non saisis via l'éditeur riche.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''

  // Contenu sans aucune balise → texte brut : échapper + retours ligne en <br>
  if (!/<[a-z!/][^>]*>/i.test(html)) {
    return escapeHtmlText(html).replace(/\r?\n/g, '<br>')
  }

  const placeholders: string[] = []
  const keep = (tag: string): string => `__SAFE_${placeholders.push(tag) - 1}__`

  // 1. Liens : conservés seulement si le href est en http(s):// ou mailto:
  let work = html.replace(/<a\b[^>]*>/gi, (match) => {
    const href = match.match(/href\s*=\s*["']([^"']*)["']/i)?.[1]?.trim() ?? ''
    if (!/^(https?:\/\/|mailto:)/i.test(href)) return ''
    return keep(`<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">`)
  })
  work = work.replace(/<\/a>/gi, () => keep('</a>'))

  // 2. Balises de mise en forme autorisées (sans attribut)
  work = work.replace(ALLOWED_RE, (match) => keep(match))

  // 3. Supprimer toute autre balise
  work = work.replace(/<[^>]*>/g, '')

  // 4. Restaurer les balises conservées
  return work.replace(/__SAFE_(\d+)__/g, (_, idx) => placeholders[Number(idx)])
}
