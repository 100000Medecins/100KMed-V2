/**
 * Badge / chip primitif partagé.
 *
 * Variantes :
 *   - info    : fond accent-blue clair (chips, tags, mentions neutres)
 *   - warning : fond amber clair (statuts d'attente, attention)
 *   - success : fond green clair (validations, OK)
 *   - danger  : fond red clair (erreurs, alertes)
 *   - neutral : fond gray clair (statuts mineurs, désactivés)
 *   - dark    : fond gray foncé + texte blanc (badges en fort contraste)
 *
 * Tailles :
 *   - sm : px-2 py-0.5 text-[10px]
 *   - md : px-2.5 py-1 text-xs  (défaut)
 *
 * Props :
 *   - leftIcon / rightIcon : optionnels
 *   - dot : affiche un petit point coloré à gauche (style status indicator)
 *   - onClick : si fourni, rend un <button> avec hover/focus
 *
 * Usage :
 *   <Badge variant="info">Cardiologie</Badge>
 *   <Badge variant="warning" size="sm">En attente</Badge>
 *   <Badge variant="dark">Hors spécialité</Badge>
 *   <Badge variant="info" dot>Connecté</Badge>
 */

type BadgeVariant = 'info' | 'warning' | 'success' | 'danger' | 'neutral' | 'dark'
type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  dot?: boolean
  onClick?: () => void
  title?: string
  className?: string
  children: React.ReactNode
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  info:    'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  danger:  'bg-red-50 text-red-600 border border-red-200',
  neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
  dark:    'bg-gray-700 text-white border border-gray-700',
}

const DOT_CLASSES: Record<BadgeVariant, string> = {
  info:    'bg-accent-blue',
  warning: 'bg-amber-500',
  success: 'bg-green-500',
  danger:  'bg-red-500',
  neutral: 'bg-gray-400',
  dark:    'bg-white',
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
}

export default function Badge({
  variant = 'info',
  size = 'md',
  leftIcon,
  rightIcon,
  dot = false,
  onClick,
  title,
  className = '',
  children,
}: BadgeProps) {
  const classes = [
    'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    onClick ? 'cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASSES[variant]}`} aria-hidden />}
      {leftIcon}
      {children}
      {rightIcon}
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={classes}>
        {content}
      </button>
    )
  }

  return (
    <span title={title} className={classes}>
      {content}
    </span>
  )
}
