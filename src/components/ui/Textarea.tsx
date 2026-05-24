/**
 * Textarea primitif partagé.
 *
 * Forward tous les attrs HTML standards (`name`, `value`, `onChange`, `rows`,
 * `placeholder`, `required`, `disabled`, `aria-*`, etc.).
 *
 * Tailles : identiques à <Input> (sm/md, défaut md).
 *
 * Usage :
 *   <Textarea name="description" rows={4} value={...} onChange={...} />
 *   <Textarea size="sm" rows={2} />
 */

import { forwardRef } from 'react'
import { buildInputClasses } from './Input'

type Size = 'sm' | 'md'

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: Size
  error?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { size = 'md', error = false, className = '', ...rest },
  ref,
) {
  const classes = buildInputClasses(size, error, `resize-y ${className}`.trim())
  return <textarea ref={ref} className={classes} {...rest} />
})

export default Textarea
