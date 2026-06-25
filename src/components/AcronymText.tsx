'use client'

import { useEffect, useState } from 'react'
import { type Acronyme, fetchAcronymes, getCache, buildRegex } from '@/lib/acronymesCache'

/** Construit le texte du tooltip : une seule définition si une seule entrée,
 *  sinon liste numérotée des définitions (ex. "1) Délégation du Numérique en Santé • 2) Délégué…"). */
function buildTooltip(matches: Acronyme[]): string {
  if (matches.length === 1) return matches[0].definition
  return matches.map((m, i) => `${i + 1}) ${m.definition}`).join(' • ')
}

function highlight(text: string, acronymes: Acronyme[]): React.ReactNode {
  if (!acronymes.length) return text
  const regex = buildRegex(acronymes)
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const matchedSigle = match[1]
    const all = acronymes.filter(a => a.sigle === matchedSigle)
    parts.push(
      <abbr
        key={match.index}
        data-acronym=""
        title={buildTooltip(all)}
        style={{ textDecoration: 'underline dotted #9ca3af', cursor: 'help' }}
      >
        {matchedSigle}
      </abbr>
    )
    last = match.index + matchedSigle.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>
}

export default function AcronymText({
  text,
  className,
  as: Tag = 'span',
}: {
  text: string
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}) {
  const [acronymes, setAcronymes] = useState<Acronyme[]>(getCache() ?? [])

  useEffect(() => {
    if (!getCache()) fetchAcronymes().then(setAcronymes)
  }, [])

  return <Tag className={className}>{highlight(text, acronymes)}</Tag>
}
