'use client'

import React, { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Check, GripVertical, Plus, X } from 'lucide-react'
import { updateSiteConfig } from '@/lib/actions/admin'
import PartenairesList from '@/components/admin/PartenairesList'
import RichTextEditor from '@/components/admin/RichTextEditor'

interface Props {
  config: Record<string, string>
  pages: { id: string; slug: string; titre: string }[]
  partenaires: any[]
}

function Accordeon({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-light transition-colors"
      >
        <span className="font-semibold text-navy">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-gray-50">{children}</div>}
    </div>
  )
}

function InlineField({ cle, initialValue, label, multiline = false }: { cle: string; initialValue: string; label: string; multiline?: boolean }) {
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateSiteConfig(cle, value)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-navy mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={3}
          className="w-full rounded-2xl bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-4 py-3 resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full rounded-button bg-white border border-gray-200 text-sm text-gray-700 focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 focus:outline-none px-4 py-3"
        />
      )}
      <button
        type="button"
        onClick={save}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy/80 transition-colors"
      >
        {saved ? <><Check className="w-3.5 h-3.5" /> Enregistré</> : 'Enregistrer'}
      </button>
    </div>
  )
}

function HeroImageField({ initialValue }: { initialValue: string }) {
  const [url, setUrl] = useState(initialValue)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const json = await res.json()
    if (res.ok) {
      setUrl(json.url)
      startTransition(async () => {
        await updateSiteConfig('hero_image', json.url)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      })
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove() {
    setUrl('')
    startTransition(async () => {
      await updateSiteConfig('hero_image', '')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-navy mb-1.5">
        Illustration à droite
        <span className="ml-2 text-xs font-normal text-gray-400">Si vide, l'illustration par défaut s'affiche</span>
      </label>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <div className="flex items-center gap-4">
        {url && (
          <img src={url} alt="Hero" className="h-24 w-40 object-cover rounded-xl border border-gray-200" />
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? 'Upload...' : url ? 'Changer l\'image' : 'Uploader une image'}
          </button>
          {url && (
            <button
              type="button"
              onClick={remove}
              className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50"
            >
              Supprimer (revenir à l'illustration)
            </button>
          )}
        </div>
        {saved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Enregistré</span>}
      </div>
    </div>
  )
}

function RichField({ cle, initialValue, label, minHeight = 80 }: { cle: string; initialValue: string; label: string; minHeight?: number }) {
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateSiteConfig(cle, value)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-navy mb-1.5">{label}</label>
      <RichTextEditor initialContent={value} onChange={setValue} minHeight={minHeight} />
      <button
        type="button"
        onClick={save}
        className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy/80 transition-colors"
      >
        {saved ? <><Check className="w-3.5 h-3.5" /> Enregistré</> : 'Enregistrer'}
      </button>
    </div>
  )
}


function ArticlesOrder({ pages, initialSlugs }: { pages: Props['pages']; initialSlugs: string }) {
  const [selected, setSelected] = useState<string[]>(
    initialSlugs.split(',').map(s => s.trim()).filter(Boolean)
  )
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()

  function addSlug(slug: string) {
    if (!slug || selected.includes(slug)) return
    setSelected(prev => [...prev, slug])
  }

  function removeSlug(slug: string) {
    setSelected(prev => prev.filter(s => s !== slug))
  }

  function moveUp(index: number) {
    if (index === 0) return
    const next = [...selected]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setSelected(next)
  }

  function moveDown(index: number) {
    if (index === selected.length - 1) return
    const next = [...selected]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setSelected(next)
  }

  function save() {
    startTransition(async () => {
      await updateSiteConfig('section_articles_slugs', selected.join(','))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const availableToAdd = pages.filter(p => !selected.includes(p.slug))

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Choisissez et ordonnez les pages affichées dans la section articles de l'accueil (max 3 recommandé).</p>

      {/* Liste ordonnée */}
      <div className="space-y-2 mb-4">
        {selected.map((slug, i) => {
          const page = pages.find(p => p.slug === slug)
          return (
            <div key={slug} className="flex items-center gap-2 bg-surface-light rounded-xl px-3 py-2">
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
              <span className="flex-1 text-sm text-navy">{page?.titre ?? slug}</span>
              <span className="text-xs text-gray-400 font-mono">{slug}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="text-gray-400 hover:text-navy disabled:opacity-30 p-0.5">▲</button>
                <button type="button" onClick={() => moveDown(i)} disabled={i === selected.length - 1} className="text-gray-400 hover:text-navy disabled:opacity-30 p-0.5">▼</button>
                <button type="button" onClick={() => removeSlug(slug)} className="text-gray-400 hover:text-red-500 p-0.5 ml-1"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )
        })}
        {selected.length === 0 && (
          <p className="text-sm text-gray-400 italic">Aucune page sélectionnée.</p>
        )}
      </div>

      {/* Ajouter une page */}
      {availableToAdd.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <select
            className="flex-1 rounded-button border border-gray-200 text-sm text-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
            defaultValue=""
            onChange={e => { addSlug(e.target.value); e.target.value = '' }}
          >
            <option value="" disabled>Ajouter une page…</option>
            {availableToAdd.map(p => (
              <option key={p.slug} value={p.slug}>{p.titre} ({p.slug})</option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={save}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy/80 transition-colors"
      >
        {saved ? <><Check className="w-3.5 h-3.5" /> Enregistré</> : 'Enregistrer l\'ordre'}
      </button>
    </div>
  )
}

export default function AdminIndexEditor({ config, pages, partenaires }: Props) {
  return (
    <div>
      {/* Accordéon 1 : Hero */}
      <Accordeon title="Section Hero (titre + sous-titre)" defaultOpen>
        <HeroImageField initialValue={config['hero_image'] ?? ''} />
        <RichField
          cle="hero_titre"
          initialValue={config['hero_titre'] ?? '<p>Mieux exercer,<br>avec les bons outils.</p>'}
          label="Titre principal"
        />
        <RichField
          cle="hero_sous_titre"
          initialValue={config['hero_sous_titre'] ?? '<p>Grâce aux avis de vos confrères, trouvez les logiciels les plus adaptés à votre pratique au quotidien.</p>'}
          label="Sous-titre"
        />
      </Accordeon>

      {/* Accordéon 2 : Partenaires */}
      <Accordeon title="Section Partenaires">
        <div className="mb-4">
          <InlineField
            cle="label_partenaires"
            initialValue={config['label_partenaires'] ?? 'Le premier mouvement intersyndical autour de la e-santé'}
            label="Texte au-dessus des logos"
          />
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-navy">Logos partenaires <span className="text-gray-400 font-normal text-xs">— glissez pour réordonner</span></p>
          <a
            href="/admin/partenaires/nouveau"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </a>
        </div>
        <PartenairesList initialPartenaires={partenaires} />
      </Accordeon>

      {/* Accordéon 3 : Articles */}
      <Accordeon title="Section Articles (ordre des pages)">
        <RichField
          cle="section_articles_titre"
          initialValue={config['section_articles_titre'] ?? '<p><span class="text-accent-blue">10000médecins.org</span>,<br>pour vous accompagner dans l\'ère numérique.</p>'}
          label="Titre de la section"
        />
        <div className="mt-4">
          <label className="block text-sm font-medium text-navy mb-2">Pages affichées</label>
          <ArticlesOrder
            pages={pages}
            initialSlugs={config['section_articles_slugs'] ?? 'tous-ensemble,difficile-de-changer,lancement-100k'}
          />
        </div>
      </Accordeon>
    </div>
  )
}
