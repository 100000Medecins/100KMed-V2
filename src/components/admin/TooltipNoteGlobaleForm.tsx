'use client'

import { useState, useTransition } from 'react'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

interface ParsedContenu {
  tooltip_court_legacy?: string
  tooltip_court_standard?: string
  tooltip_long_titre?: string
  tooltip_long_corps?: string
}

interface Props {
  initialContenu: string | null
  /** Server action liée à l'id de la page (par .bind(null, id)). */
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

function safeParse(raw: string | null): ParsedContenu {
  if (!raw) return {}
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object') return obj as ParsedContenu
  } catch {
    /* on retombe sur objet vide */
  }
  return {}
}

export default function TooltipNoteGlobaleForm({ initialContenu, action }: Props) {
  const parsed = safeParse(initialContenu)

  const [legacy, setLegacy] = useState(parsed.tooltip_court_legacy ?? '')
  const [standard, setStandard] = useState(parsed.tooltip_court_standard ?? '')
  const [titre, setTitre] = useState(parsed.tooltip_long_titre ?? '')
  const [corps, setCorps] = useState(parsed.tooltip_long_corps ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await action(formData)
      if (result && 'error' in result && result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <div className="rounded-card border border-accent-blue/30 bg-accent-blue/5 p-4 text-sm text-gray-700">
        <p className="font-medium text-navy mb-1">À propos de cette tooltip</p>
        <p>
          Elle apparaît à côté de la note globale sur chaque fiche solution. Le <strong>texte court</strong> s&apos;affiche
          au survol de l&apos;icône <span className="font-mono">ⓘ</span> ; le clic ouvre une modale avec le
          <strong> titre + corps détaillé</strong>. Deux variantes de texte court existent selon que la solution est
          héritée de Firebase (calcul incrémental sur ancrage historique) ou non (moyenne arithmétique standard).
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-bold text-navy">Texte court (au survol de l&apos;icône)</h2>

        <Field
          label="Variante « solution historique » (is_firebase_legacy = true)"
          hint={`${legacy.length} / 300 caractères. Affichée sur les fiches dont la note est ancrée sur l'historique Firebase.`}
        >
          <Textarea
            name="tooltip_court_legacy"
            value={legacy}
            onChange={(e) => setLegacy(e.target.value)}
            rows={3}
            maxLength={300}
            required
          />
        </Field>

        <Field
          label="Variante « solution standard »"
          hint={`${standard.length} / 300 caractères. Affichée sur les fiches dont la note est une moyenne directe des avis.`}
        >
          <Textarea
            name="tooltip_court_standard"
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
            rows={3}
            maxLength={300}
            required
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-bold text-navy">Modale détaillée (au clic)</h2>

        <Field label="Titre de la modale">
          <Input
            name="tooltip_long_titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Corps de la modale (HTML autorisé)"
          hint="Balises supportées : <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>. Le HTML est sanitizé à l'affichage."
        >
          <Textarea
            name="tooltip_long_corps"
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
            rows={12}
            required
          />
        </Field>
      </section>

      {error && (
        <div className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" variant="primary" loading={pending}>
          Enregistrer la tooltip
        </Button>
      </div>
    </form>
  )
}
