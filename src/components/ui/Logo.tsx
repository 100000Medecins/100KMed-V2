import Image from 'next/image'

type LogoVariant = 'principal' | 'secondaire'
type LogoColor = 'couleur' | 'nb'

interface LogoProps {
  variant?: LogoVariant
  color?: LogoColor
  height?: number
  className?: string
  alt?: string
}

export default function Logo({
  variant = 'principal',
  color = 'couleur',
  height = 48,
  className = '',
  alt = '100 000 Médecins',
}: LogoProps) {
  const src = `/logos/logo-${variant}-${color}.svg`

  // Aspect ratios measured from actual PNG files
  // principal: 501x349 → width/height = 1.436
  // secondaire: 501x118 → width/height = 4.246
  const aspectRatio = variant === 'principal' ? 1.436 : 4.246
  const width = Math.round(height * aspectRatio)

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
      unoptimized
    />
  )
}
