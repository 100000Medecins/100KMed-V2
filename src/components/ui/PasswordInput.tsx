'use client'

import { useState, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string
}

const PasswordInput = forwardRef<HTMLInputElement, Props>(
  ({ className = '', wrapperClassName = '', ...props }, ref) => {
    const [show, setShow] = useState(false)

    return (
      <div className={`relative ${wrapperClassName}`}>
        <input
          {...props}
          ref={ref}
          type={show ? 'text' : 'password'}
          className={`pr-10 ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput
