'use client'

import { useEffect, useState } from 'react'
import { type Acronyme, fetchAcronymes, getCache, buildRegex } from '@/lib/acronymesCache'

function highlight(text: string, acronymes: Acronyme[]): React.ReactNode {
  if (!acronymes.length) return text
  const regex = buildRegex(acronymes)
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const acro = acronymes.find(a => a.sigle === match![1])!
    parts.push(
      <abbr
        key={match.index}
        title={acro.definition}
        style={{ textDecoration: 'underline dotted #9ca3af', cursor: 'help' }}
      >
        {match[1]}
      </abbr>
    )
    last = match.index + match[1].length
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
