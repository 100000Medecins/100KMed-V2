'use client'

import { useTransition } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import type { Annonce } from '@/lib/db/annonces'

interface AnnonceFormProps {
  annonce?: Annonce | null
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'
const dateInputClass =
  'w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-3 py-2'

/** ISO (UTC stocké) → valeur locale `YYYY-MM-DDTHH:mm` attendue par <input datetime-local>. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export default function AnnonceForm({ annonce, action }: AnnonceFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await action(formData)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-card shadow-card p-6 md:p-8 space-y-5">
        <div>
          <label className={labelClass}>
            Titre <span className="text-red-400">*</span>
          </label>
          <Input
            type="text"
            name="titre"
            required
            defaultValue={annonce?.titre ?? ''}
            placeholder="🎉 Résultats du jeu concours !"
          />
        </div>

        <div>
          <label className={labelClass}>Contenu (optionnel)</label>
          <Textarea
            name="contenu"
            defaultValue={annonce?.contenu ?? ''}
            rows={3}
            placeholder="Texte court sous le titre. Balises simples autorisées (b, em, br, a…)."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Libellé du bouton (CTA)</label>
            <Input type="text" name="cta_label" defaultValue={annonce?.cta_label ?? ''} placeholder="Voir les gagnants" />
          </div>
          <div>
            <label className={labelClass}>Lien du bouton</label>
            <Input type="text" name="cta_url" defaultValue={annonce?.cta_url ?? ''} placeholder="/jeu-concours" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Début d'affichage <span className="text-red-400">*</span>
            </label>
            <input type="datetime-local" name="date_debut" required defaultValue={toLocalInput(annonce?.date_debut)} className={dateInputClass} />
          </div>
          <div>
            <label className={labelClass}>
              Fin d'affichage <span className="text-red-400">*</span>
            </label>
            <input type="datetime-local" name="date_fin" required defaultValue={toLocalInput(annonce?.date_fin)} className={dateInputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Style</label>
            <Select name="variante" defaultValue={annonce?.variante ?? 'info'}>
              <option value="info">Info (bleu)</option>
              <option value="success">Succès (vert)</option>
              <option value="warning">Attention (orange)</option>
            </Select>
          </div>
          <div>
            <label className={labelClass}>Ordre d'affichage</label>
            <Input type="number" name="ordre" defaultValue={annonce?.ordre ?? 0} placeholder="0" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="actif"
            name="actif"
            value="true"
            defaultChecked={annonce?.actif ?? true}
            className="w-4 h-4 rounded border-gray-300 text-accent-blue focus:ring-accent-blue"
          />
          <label htmlFor="actif" className="text-sm font-medium text-gray-700">
            Active (affichée sur l'accueil pendant sa fenêtre de dates)
          </label>
        </div>
      </div>

      <Button loading={isPending}>{isPending ? 'Enregistrement…' : annonce ? 'Mettre à jour' : "Créer l'annonce"}</Button>
    </form>
  )
}
