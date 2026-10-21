'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { ExternalLink } from 'lucide-react'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import type { TextesPortabilite } from '@/lib/data/portabilite'

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false })

interface Props {
  textes: TextesPortabilite
  /** Server action liée à l'id de la page (par .bind(null, id)). */
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-bold text-navy">{titre}</h2>
      {children}
    </section>
  )
}

/** Formulaire des textes libres de la page /portabilite (Admin → Pages, ligne `portabilite`). */
export default function PortabiliteTextesForm({ textes, action }: Props) {
  const [chapeau, setChapeau] = useState(textes.chapeau)
  const [pourquoiTexte, setPourquoiTexte] = useState(textes.pourquoiTexte)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await action(formData)
      if (result && 'error' in result && result.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      <div className="rounded-card border border-accent-blue/30 bg-accent-blue/5 p-4 text-sm text-gray-700 space-y-2">
        <p>
          Ces textes s&apos;affichent sur la page <strong>Portabilité des données</strong>{' '}
          dès l&apos;enregistrement.
          La liste des éditeurs et des logiciels, les trois engagements, la frise et les communiqués restent dans le
          code du site : demandez à Claude pour les changer.
        </p>
        <a
          href="/portabilite"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-accent-blue hover:underline"
        >
          Voir la page <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <Section titre="En-tête">
        <Field label="Pastille" hint="Petite étiquette au-dessus du titre. Laisser vide pour la masquer." htmlFor="pastille">
          <Input id="pastille" name="pastille" defaultValue={textes.pastille} maxLength={40} />
        </Field>
        <Field label="Titre de la page" required htmlFor="titre">
          <Input id="titre" name="titre" defaultValue={textes.titre} maxLength={150} required />
        </Field>
        <Field label="Texte d'introduction" required>
          <RichTextEditor initialContent={textes.chapeau} onChange={setChapeau} minimal minHeight={140} />
          <input type="hidden" name="chapeau" value={chapeau} />
        </Field>
        <Field label="Phrase en gras sous l'introduction" hint="Laisser vide pour la masquer." htmlFor="remerciement">
          <Input id="remerciement" name="remerciement" defaultValue={textes.remerciement} maxLength={200} />
        </Field>
      </Section>

      <Section titre="Pourquoi c'est important">
        <Field label="Titre" required htmlFor="pourquoi_titre">
          <Input id="pourquoi_titre" name="pourquoi_titre" defaultValue={textes.pourquoiTitre} maxLength={100} required />
        </Field>
        <Field label="Texte" required hint="Affiché à gauche de la frise.">
          <RichTextEditor initialContent={textes.pourquoiTexte} onChange={setPourquoiTexte} minimal minHeight={180} />
          <input type="hidden" name="pourquoi_texte" value={pourquoiTexte} />
        </Field>
      </Section>

      <Section titre="Encadré « Vous êtes éditeur ? »">
        <Field label="Titre" required htmlFor="encadre_titre">
          <Input id="encadre_titre" name="encadre_titre" defaultValue={textes.encadreTitre} maxLength={100} required />
        </Field>
        <Field label="Texte" required htmlFor="encadre_texte">
          <Textarea id="encadre_texte" name="encadre_texte" defaultValue={textes.encadreTexte} rows={3} maxLength={600} required />
        </Field>
        <Field label="Libellé du bouton" required hint="Le bouton ouvre un e-mail vers contact@100000medecins.org." htmlFor="encadre_bouton">
          <Input id="encadre_bouton" name="encadre_bouton" defaultValue={textes.encadreBouton} maxLength={40} required />
        </Field>
      </Section>

      <Section titre="Référencement">
        <Field
          label="Description pour Google"
          hint="Texte sous le lien dans les résultats de recherche et lors d'un partage. Laisser vide pour le texte par défaut."
          htmlFor="meta_description"
        >
          <Textarea id="meta_description" name="meta_description" defaultValue={textes.metaDescription} rows={2} maxLength={300} />
        </Field>
      </Section>

      {error && (
        <div role="alert" className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="submit" variant="primary" loading={pending}>
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
