/**
 * Input primitif partagé.
 *
 * Forward tous les attrs HTML standards (`type`, `name`, `value`, `onChange`,
 * `placeholder`, `required`, `disabled`, `autoFocus`, `aria-*`, etc.).
 *
 * Tailles :
 *   - sm : px-3 py-2     text-sm (forms publics, champs serrés)
 *   - md : px-5 py-3     text-sm (forms admin, champs confortables — défaut)
 *
 * États :
 *   - `error` : bordure rouge + ring rouge (à utiliser avec <Field error="...">)
 *
 * Usage :
 *   <Input type="email" name="email" value={...} onChange={...} required />
 *   <Input size="sm" placeholder="Recherche…" />
 *   <Input error={hasError} />
 *
 * Pour un input avec label + hint + message d'erreur, voir <Field>.
 */

import { forwardRef } from 'react'

type Size = 'sm' | 'md'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: Size
  error?: boolean
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-2',
  md: 'px-5 py-3',
}

export function buildInputClasses(size: Size, error: boolean, extra: string): string {
  return [
    'w-full rounded-button bg-white border text-sm text-gray-700',
    'focus:ring-2 focus:outline-none',
    error
      ? 'border-red-300 focus:ring-red-300/40 focus:border-red-400'
      : 'border-gray-200 focus:ring-accent-blue/30 focus:border-accent-blue/50',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    SIZE_CLASSES[size],
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', error = false, className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={buildInputClasses(size, error, className)} {...rest} />
})

export default Input
