/**
 * Select primitif partagé.
 *
 * Forward tous les attrs HTML standards (`name`, `value`, `onChange`, `required`,
 * `disabled`, `aria-*`, etc.).
 *
 * Tailles : identiques à <Input> (sm/md, défaut md).
 *
 * `fullWidth={false}` : largeur naturelle au lieu de `w-full`, pour les selects de
 * barre d'outils (tri, filtre) qui vivent dans une ligne en flex.
 *
 * Note : on garde un <select> natif (pas de combobox custom). Avantage :
 * accessibilité, mobile, recherche au clavier, zéro JS. Inconvénient : style
 * de la liste déroulante non personnalisable. Pour un combobox riche, voir
 * les sélecteurs custom (ex: SolutionsLieesSelector dans VideoForm).
 *
 * Usage :
 *   <Select name="categorie" value={...} onChange={...}>
 *     <option value="">— Aucune —</option>
 *     <option value="agendas">Agendas</option>
 *   </Select>
 */

import { forwardRef } from 'react'
import { buildInputClasses } from './Input'

type Size = 'sm' | 'md'

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: Size
  error?: boolean
  fullWidth?: boolean
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', error = false, fullWidth = true, className = '', children, ...rest },
  ref,
) {
  // appearance-none = enlève le style natif du select pour homogénéiser
  // avec l'<input>. Le triangle est rendu via background-image SVG pour
  // rester accessible.
  const classes = buildInputClasses(
    size,
    error,
    `appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:0.65em] pr-9 ${className}`.trim(),
    fullWidth,
  )
  return (
    <select
      ref={ref}
      className={classes}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
      }}
      {...rest}
    >
      {children}
    </select>
  )
})

export default Select
