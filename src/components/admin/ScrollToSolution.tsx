'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ScrollToSolution() {
  const searchParams = useSearchParams()
  const scrollId = searchParams.get('scroll')

  useEffect(() => {
    if (!scrollId) return
    const el = document.getElementById(`solution-${scrollId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bg-accent-blue/5')
      setTimeout(() => el.classList.remove('bg-accent-blue/5'), 2000)
    }
  }, [scrollId])

  return null
}
