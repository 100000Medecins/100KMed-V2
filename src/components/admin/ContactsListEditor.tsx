'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { ContactLigne } from '@/types/models'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface ContactsListEditorProps {
  value: ContactLigne[]
  onChange: (contacts: ContactLigne[]) => void
  /** Libellé du bouton d'ajout. Défaut : « Ajouter un contact ». */
  addLabel?: string
  /** Placeholder de l'email (ex. "contact@…" / "support@…"). */
  emailPlaceholder?: string
  size?: 'sm' | 'md'
}

const EMPTY: ContactLigne = { libelle: null, email: null, telephone: null }

/**
 * Éditeur de liste de contacts (commercial ou support) — lignes nommées :
 * libellé optionnel + email + téléphone, avec ajout/suppression de lignes.
 * Composant contrôlé, réutilisé par l'admin (SolutionForm) et l'espace éditeur.
 */
export default function ContactsListEditor({
  value,
  onChange,
  addLabel = 'Ajouter un contact',
  emailPlaceholder = 'contact@…',
  size = 'md',
}: ContactsListEditorProps) {
  const update = (i: number, patch: Partial<ContactLigne>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const add = () => onChange([...value, { ...EMPTY }])
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      {value.map((c, i) => (
        <div
          key={i}
          className="relative rounded-2xl border border-gray-200 bg-surface-light p-4 space-y-3"
        >
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors"
            title="Supprimer ce contact"
            aria-label="Supprimer ce contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="pr-8">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Libellé <span className="font-normal text-gray-400">(optionnel, ex. « Commercial Île-de-France »)</span>
            </label>
            <Input
              size={size}
              type="text"
              value={c.libelle ?? ''}
              onChange={(e) => update(i, { libelle: e.target.value })}
              placeholder="Nom / rôle du contact"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <Input
                size={size}
                type="email"
                value={c.email ?? ''}
                onChange={(e) => update(i, { email: e.target.value })}
                placeholder={emailPlaceholder}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
              <Input
                size={size}
                type="tel"
                value={c.telephone ?? ''}
                onChange={(e) => update(i, { telephone: e.target.value })}
                placeholder="+33 …"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        leftIcon={<Plus className="w-4 h-4" />}
      >
        {addLabel}
      </Button>
    </div>
  )
}
