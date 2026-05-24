/**
 * Bouton primitif partagé.
 *
 * Variantes :
 *   - primary   : bg-navy / text-white         — action principale (formulaires, CTA)
 *   - secondary : bg-accent-blue / text-white  — action secondaire, lien fort
 *   - outline   : border-navy / text-navy      — contour sans fond
 *   - ghost     : transparent / text-navy      — action tertiaire (toolbars, etc.)
 *   - danger    : bg-red-500 / text-white      — action destructive (supprimer, refuser)
 *   - white     : border-white / text-white    — pour les fonds sombres (hero)
 *   - cta       : bg-accent-yellow / text-navy — bouton mis en avant (landing)
 *
 * Tailles :
 *   - sm : px-3 py-1.5  text-xs
 *   - md : px-5 py-2.5  text-sm
 *   - lg : px-7 py-3.5  text-sm  (défaut — taille historique du composant)
 *
 * Comportement :
 *   - `loading` affiche un spinner et désactive le bouton
 *   - `disabled` est forwardé (avec opacity-50 + cursor-not-allowed)
 *   - `leftIcon` / `rightIcon` : icônes libres (Lucide ou autre)
 *   - `showArrow` (rétro-compat) : raccourci pour rightIcon = <ArrowRight>
 *   - `href` (rétro-compat) : rend un <a> au lieu d'un <button>
 *   - `fullWidth` : prend toute la largeur disponible
 *   - Tout attribut HTML standard est forwardé (`aria-*`, `name`, `form`, etc.)
 *   - **`type` par défaut = 'submit'** (héritage : utilisé dans plusieurs forms
 *     publics qui en dépendent — connexion, reset mdp, inscription). Pour un
 *     bouton hors form ou action explicite, passer `type="button"`.
 *
 * Exemples :
 *   <Button>Enregistrer</Button>                                    // primary, lg
 *   <Button variant="danger" size="sm" loading={pending}>Supprimer</Button>
 *   <Button variant="ghost" leftIcon={<ChevronLeft className="w-4 h-4" />}>Retour</Button>
 *   <Button href="/inscription" showArrow>S'inscrire</Button>      // rétro-compat
 */

import { ArrowRight, Loader2 } from 'lucide-react'
import { forwardRef } from 'react'
import type { ButtonVariant } from '@/types'

type Size = 'sm' | 'md' | 'lg'

type CommonProps = {
  variant?: ButtonVariant
  size?: Size
  loading?: boolean
  showArrow?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  className?: string
  children?: React.ReactNode
}

type AsAnchor = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string
  }

type AsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined
  }

export type ButtonProps = AsAnchor | AsButton

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'bg-navy text-white hover:bg-navy-dark shadow-soft hover:shadow-card',
  secondary: 'bg-accent-blue text-white hover:bg-accent-blue/90',
  outline:   'border-2 border-navy text-navy hover:bg-navy hover:text-white',
  ghost:     'text-navy hover:bg-surface-light',
  danger:    'bg-red-500 text-white hover:bg-red-600',
  white:     'border-2 border-white text-white hover:bg-white hover:text-navy',
  cta:       'bg-accent-yellow border-2 border-accent-yellow text-navy font-bold hover:brightness-110 shadow-md',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-sm',
}

const SPINNER_SIZE: Record<Size, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-4 h-4',
}

function buildClasses(variant: ButtonVariant, size: Size, fullWidth: boolean, extra: string): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-button font-semibold transition-all duration-300',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40 focus-visible:ring-offset-1',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? 'w-full' : '',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  props,
  ref,
) {
  const {
    variant = 'primary',
    size = 'lg',
    loading = false,
    showArrow = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    children,
    ...rest
  } = props

  const classes = buildClasses(variant, size, fullWidth, className)
  const spinner = loading ? <Loader2 className={`${SPINNER_SIZE[size]} animate-spin`} /> : null
  const trailing = showArrow ? <ArrowRight className="w-4 h-4" /> : rightIcon

  const content = (
    <>
      {spinner ?? leftIcon}
      {children}
      {!loading && trailing}
    </>
  )

  // Mode <a> (rétro-compatibilité avec l'ancien `href`)
  if ('href' in rest && rest.href) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={classes}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    )
  }

  // Mode <button>
  // Note : `type` défaut = 'submit' (cohérent avec l'historique du composant, utilisé
  // par les formulaires connexion/reset/inscription qui en dépendent). Pour un bouton
  // hors form, passer explicitement type="button".
  const btnProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>
  const isDisabled = btnProps.disabled || loading

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={btnProps.type ?? 'submit'}
      disabled={isDisabled}
      className={classes}
      {...btnProps}
    >
      {content}
    </button>
  )
})

export default Button
