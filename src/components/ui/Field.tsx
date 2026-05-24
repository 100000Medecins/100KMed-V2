/**
 * Field — wrapper standardisé pour un champ de formulaire (label + control + hint + error).
 *
 * Pas obligatoire : on peut utiliser <Input>, <Textarea>, <Select> seuls. <Field>
 * vient quand on veut le pattern complet « label au-dessus, hint sous le champ,
 * message d'erreur quand applicable ».
 *
 * Usage :
 *   <Field label="Email" required>
 *     <Input type="email" name="email" />
 *   </Field>
 *
 *   <Field label="Slug" hint="Sans espaces ni accents" error={errors.slug}>
 *     <Input name="slug" />
 *   </Field>
 *
 *   <Field>
 *     <label className="flex items-center gap-2">...mon label custom...</label>
 *     <Input ... />
 *   </Field>
 */

import { useId } from 'react'

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

export default function Field({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  className = '',
  children,
}: FieldProps) {
  const autoId = useId()
  const id = htmlFor ?? autoId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-navy">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-400">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
