const ALLOWED_TAGS = ['br', 'u', 'b', 'strong', 'em', 'i', 'p']

const ALLOWED_RE = new RegExp(
  `<\\/?(${ALLOWED_TAGS.join('|')})(\\s*\\/?)>`,
  'gi',
)

/**
 * Sanitize une chaîne HTML en ne gardant que les balises autorisées.
 * Toutes les autres balises sont supprimées.
 */
export function sanitizeHtml(html: string): string {
  // Extraire les balises autorisées en les remplaçant temporairement
  const placeholders: string[] = []
  const withPlaceholders = html.replace(ALLOWED_RE, (match) => {
    placeholders.push(match)
    return `__SAFE_${placeholders.length - 1}__`
  })

  // Supprimer toutes les balises restantes
  const stripped = withPlaceholders.replace(/<[^>]*>/g, '')

  // Restaurer les balises autorisées
  return stripped.replace(/__SAFE_(\d+)__/g, (_, idx) => placeholders[Number(idx)])
}
