/**
 * Card primitif partagé.
 *
 * Wrapper sémantique pour les nombreuses cartes du site :
 * `bg-white rounded-card shadow-card` avec padding configurable.
 *
 * Paddings :
 *   - none : pas de padding (utile quand la card contient une image full-width
 *            ou un layout custom qui gère son propre padding)
 *   - sm   : p-5
 *   - md   : p-6              (défaut)
 *   - lg   : p-6 md:p-8       (responsive — typique des formulaires admin)
 *   - xl   : p-8              (cards d'état vide, gros call-to-action)
 *
 * Comportement :
 *   - `hoverable` : ajoute `hover:shadow-card-hover` + transition (cards cliquables)
 *   - `overflow` : 'hidden' (défaut) ou 'visible' (si tu as un dropdown qui doit
 *     dépasser, par exemple)
 *
 * Usage :
 *   <Card>{children}</Card>                           // padding md
 *   <Card padding="lg">{form}</Card>                  // formulaire admin
 *   <Card padding="none">                             // card avec image full-width
 *     <img className="w-full" />
 *     <div className="p-5">{contenu}</div>
 *   </Card>
 *   <Card hoverable onClick={...}>{children}</Card>   // card cliquable
 *
 * Note : `<Card>` rend un <div>. Pour un layout sémantique (article, section,
 * etc.), passe `as="article"` ou utilise simplement les classes Tailwind
 * directement sur ton élément sémantique.
 */

import { forwardRef } from 'react'

type Padding = 'none' | 'sm' | 'md' | 'lg' | 'xl'
type Overflow = 'hidden' | 'visible'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: Padding
  hoverable?: boolean
  overflow?: Overflow
}

const PADDING_CLASSES: Record<Padding, string> = {
  none: '',
  sm:   'p-5',
  md:   'p-6',
  lg:   'p-6 md:p-8',
  xl:   'p-8',
}

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'md', hoverable = false, overflow = 'hidden', className = '', children, ...rest },
  ref,
) {
  const classes = [
    'bg-white rounded-card shadow-card',
    overflow === 'hidden' ? 'overflow-hidden' : 'overflow-visible',
    PADDING_CLASSES[padding],
    hoverable ? 'transition-shadow hover:shadow-card-hover cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  )
})

export default Card
