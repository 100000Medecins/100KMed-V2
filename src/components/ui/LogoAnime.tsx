'use client'

import { LOGO_ANIME_SVG } from './logoAnimeSvg'

/**
 * Logo « 100 000 Médecins » animé au survol (effet frappe au clavier).
 *
 * Le SVG est *inliné* dans le DOM (pas via <img>/<object>) pour deux raisons :
 *  - un <img> ne reçoit pas le `:hover`, donc l'animation (scopée `svg:hover`
 *    dans le SVG) ne se déclencherait pas ;
 *  - un <object> intercepterait le clic, cassant le lien cliquable de la navbar.
 * Inliné dans le <a>, le clic remonte au lien et le survol anime le logo.
 *
 * Au repos : logo complet identique à la marque. Au survol : la frappe rejoue
 * une fois. Le SVG embarqué est régénéré depuis public/logos/logo-anime-hero.svg
 * (cf. logoAnimeSvg.ts).
 */
interface LogoAnimeProps {
  className?: string
  style?: React.CSSProperties
}

export default function LogoAnime({ className = '', style }: LogoAnimeProps) {
  return (
    <span
      className={className}
      style={style}
      role="img"
      aria-label="100 000 Médecins"
      dangerouslySetInnerHTML={{ __html: LOGO_ANIME_SVG }}
    />
  )
}
