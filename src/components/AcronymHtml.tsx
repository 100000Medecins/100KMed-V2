'use client'

import { useEffect, useState } from 'react'
import { type Acronyme, fetchAcronymes, getCache, injectAcronymsInHtml } from '@/lib/acronymesCache'

export default function AcronymHtml({
  html,
  className,
  as: Tag = 'div',
}: {
  html: string
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}) {
  const [acronymes, setAcronymes] = useState<Acronyme[]>(getCache() ?? [])

  useEffect(() => {
    if (!getCache()) fetchAcronymes().then(setAcronymes)
  }, [])

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: injectAcronymsInHtml(html, acronymes) }}
    />
  )
}
