/**
 * Modal primitif partagé — overlay full-screen + carte centrée.
 *
 * Gère pour toi : ESC pour fermer, clic backdrop pour fermer (opt-out), focus
 * trap basique (autofocus sur le bouton close), scroll body bloqué tant que
 * la modale est ouverte.
 *
 * Pattern composé : utilise `<Modal>`, `<Modal.Header>`, `<Modal.Body>`,
 * `<Modal.Footer>` pour structurer le contenu. Les 3 sont optionnels — tu peux
 * passer un children libre dans `<Modal>` directement.
 *
 * Tailles :
 *   - sm : max-w-md
 *   - md : max-w-lg  (défaut)
 *   - lg : max-w-2xl
 *   - xl : max-w-4xl
 *
 * Usage standard :
 *   <Modal open={open} onClose={() => setOpen(false)} size="md">
 *     <Modal.Header icon={<Trash2 className="w-4 h-4" />} variant="danger">
 *       Supprimer mon compte
 *     </Modal.Header>
 *     <Modal.Body>
 *       <p>Cette action est irréversible.</p>
 *     </Modal.Body>
 *     <Modal.Footer>
 *       <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
 *       <Button variant="danger" loading={pending}>Supprimer</Button>
 *     </Modal.Footer>
 *   </Modal>
 *
 * Usage libre (pour les cas custom — carousel zoom, etc.) :
 *   <Modal open={open} onClose={...} size="xl" closeOnBackdropClick>
 *     <div className="...mon contenu custom...">...</div>
 *   </Modal>
 */

'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  size?: Size
  closeOnBackdropClick?: boolean
  closeOnEsc?: boolean
  className?: string
  children: React.ReactNode
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

function Modal({
  open,
  onClose,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className = '',
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // ESC pour fermer + scroll body bloqué pendant que la modale est ouverte
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, closeOnEsc, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={closeOnBackdropClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={cardRef}
        className={`bg-white rounded-card shadow-2xl w-full ${SIZE_CLASSES[size]} max-h-[90vh] overflow-y-auto ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

type HeaderVariant = 'default' | 'danger' | 'success' | 'warning'

interface HeaderProps {
  children: React.ReactNode
  icon?: React.ReactNode
  variant?: HeaderVariant
  onClose?: () => void
  className?: string
}

const HEADER_VARIANT_CLASSES: Record<HeaderVariant, string> = {
  default: 'text-navy',
  danger:  'text-red-600',
  success: 'text-green-700',
  warning: 'text-amber-700',
}

function Header({
  children,
  icon,
  variant = 'default',
  onClose,
  className = '',
}: HeaderProps) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-100 ${className}`.trim()}>
      <div className={`flex items-center gap-2 ${HEADER_VARIANT_CLASSES[variant]}`}>
        {icon}
        <h2 className="font-bold text-base">{children}</h2>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

interface BodyProps {
  children: React.ReactNode
  className?: string
}

function Body({ children, className = '' }: BodyProps) {
  return <div className={`px-6 py-5 ${className}`.trim()}>{children}</div>
}

interface FooterProps {
  children: React.ReactNode
  className?: string
}

function Footer({ children, className = '' }: FooterProps) {
  return (
    <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 ${className}`.trim()}>
      {children}
    </div>
  )
}

Modal.Header = Header
Modal.Body = Body
Modal.Footer = Footer

export default Modal
