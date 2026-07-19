'use client'

import { useMemo, useState, useEffect } from 'react'
import { saveEmailTemplate } from '@/lib/actions/emailTemplates'
import { saveSyndicatOverride, clearSyndicatOverride } from '@/lib/actions/syndicatOverride'
import { Eye, Check, AlertCircle, Download, Copy, Users, Sparkles, RotateCcw } from 'lucide-react'

const STORAGE = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images'

export interface SyndicatLancement {
  id: string
  nom: string
  nom_complet?: string | null
  /** Article défini avec espace final ("la ", "le ", "" — ou "" si déjà inclus dans le nom). */
  article?: string
  citation: string
  presidents: string
  titre: string
  /** Override HTML par syndicat (optionnel). Si présent → remplace le template général
   *  POUR CE SYNDICAT UNIQUEMENT. Les placeholders {{...}} y restent interpolés. */
  contenu_html_override?: string | null
  /** Hauteur du logo dans l'en-tête email (par défaut 48px). */
  logo_height?: number | null
  /** Couleur de fond du cartouche logo (ex : '#ffffff') — null = pas de cartouche. */
  logo_bg?: string | null
}

interface Props {
  /** Template `lancement_syndicat` depuis email_templates (null si absent en base). */
  template: { sujet: string; contenu_html: string; updated_at: string | null } | null
  /** Syndicats émetteurs (mots des présidents depuis la page « Qui sommes-nous »). */
  syndicats: SyndicatLancement[]
}

function esc(t: string | null | undefined): string {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** "Le mot du Président" / "de la Présidente" / "des Présidents" selon le titre. */
function motDuPresident(titre: string): string {
  const t = String(titre || '').toLowerCase()
  if (t.startsWith('présidente')) return 'Le mot de la Présidente'
  if (t.startsWith('présidents')) return 'Le mot des Présidents'
  if (t.startsWith('ex-président')) return 'Le mot de l’ex-Président'
  return 'Le mot du Président'
}

/** Construit la cellule HTML du logo syndicat (en-tête email).
 *  Si logo_bg est défini → cartouche coloré avec coins arrondis + padding.
 *  Logique identique à scripts/generate-lancement-syndicats.mjs. */
function buildLogoCell(s: SyndicatLancement, linkHome: string): string {
  const height = s.logo_height ?? 48
  const src = `${STORAGE}/syndicats/${s.id}.png?v=2`
  const alt = esc(s.nom)
  const img = `<img src="${src}" alt="${alt}" height="${height}" style="display:block;height:${height}px;width:auto;border:0;" />`
  const link = `<a href="${linkHome}" style="text-decoration:none;display:block;line-height:0;">${img}</a>`
  if (s.logo_bg) {
    // Padding proportionnel à la hauteur pour que le cartouche suive le logo
    const padY = Math.max(6, Math.round(height * 0.17))
    const padX = Math.max(8, Math.round(height * 0.25))
    return `<table cellpadding="0" cellspacing="0" role="presentation"><tr><td style="background:${s.logo_bg};border-radius:8px;padding:${padY}px ${padX}px;line-height:0;">${link}</td></tr></table>`
  }
  return link
}

const SITE = 'https://www.100000medecins.org'

/** Remplit les placeholders {{…}} du HTML donné pour un syndicat donné.
 *  Logique identique à scripts/generate-lancement-syndicats.mjs. */
function composeFor(html: string, s: SyndicatLancement): string {
  const linkHome = `${SITE}/?utm_source=${encodeURIComponent(s.id)}&utm_medium=email&utm_campaign=lancement-2026`
  const vars: Record<string, string> = {
    nom_syndicat: esc(s.nom),
    article_syndicat: esc(s.article ?? ''),
    logo_syndicat: `${STORAGE}/syndicats/${s.id}.png?v=2`,
    logo_syndicat_cell: buildLogoCell(s, linkHome),
    citation: esc(s.citation),
    president_nom: esc(s.presidents),
    president_fonction: esc(s.titre),
    mot_president_label: motDuPresident(s.titre),
    utm_source: encodeURIComponent(s.id),
  }
  return html.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`))
}

const VARIABLES = [
  '{{nom_syndicat}}', '{{article_syndicat}}', '{{logo_syndicat}}', '{{logo_syndicat_cell}}',
  '{{citation}}', '{{president_nom}}', '{{president_fonction}}',
  '{{mot_president_label}}', '{{utm_source}}',
]

export default function LancementSyndicatsManager({ template, syndicats }: Props) {
  const [sujet, setSujet] = useState(template?.sujet ?? '')
  const [html, setHtml] = useState(template?.contenu_html ?? '')
  const [selectedId, setSelectedId] = useState(syndicats[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Overrides : map { syndicatId → HTML actuel } pour ceux qui en ont un.
  // Initialisé depuis les props, puis maintenu localement en cours d'édition.
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const s of syndicats) {
      if (typeof s.contenu_html_override === 'string' && s.contenu_html_override.length > 0) {
        init[s.id] = s.contenu_html_override
      }
    }
    return init
  })
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const selected = useMemo(
    () => syndicats.find((s) => s.id === selectedId) ?? syndicats[0],
    [syndicats, selectedId]
  )

  // HTML effectivement utilisé pour ce syndicat (override prioritaire, sinon template général)
  const effectiveHtml = selected && overrides[selected.id] ? overrides[selected.id] : html
  const hasOverride = !!(selected && overrides[selected.id])

  // Reset du statut "enregistré" override quand on change de syndicat
  useEffect(() => { setOverrideStatus('idle') }, [selectedId])

  if (!template) {
    return (
      <div className="bg-white rounded-card shadow-card p-6">
        <p className="text-sm text-red-600">
          Template <code className="bg-gray-100 px-1 rounded">lancement_syndicat</code> introuvable en base.
          Lancer <code className="bg-gray-100 px-1 rounded">node scripts/save-lancement-syndicat-template.mjs</code>.
        </p>
      </div>
    )
  }

  if (syndicats.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-6">
        <p className="text-sm text-red-600">Aucun syndicat trouvé dans la page « Qui sommes-nous ».</p>
      </div>
    )
  }

  async function handleSave() {
    setSaving(true)
    setSaveStatus('idle')
    try {
      await saveEmailTemplate('lancement_syndicat', sujet, html)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  function handleStartOverride() {
    if (!selected) return
    // On part du template général (ou de ce qui était déjà l'override, peu probable ici)
    setOverrides((prev) => ({ ...prev, [selected.id]: prev[selected.id] ?? html }))
    setOverrideStatus('idle')
  }

  function handleOverrideChange(v: string) {
    if (!selected) return
    setOverrides((prev) => ({ ...prev, [selected.id]: v }))
    setOverrideStatus('idle')
  }

  async function handleSaveOverride() {
    if (!selected) return
    const v = overrides[selected.id]
    if (typeof v !== 'string') return
    setOverrideSaving(true)
    setOverrideStatus('idle')
    try {
      await saveSyndicatOverride(selected.id, v)
      setOverrideStatus('success')
      setTimeout(() => setOverrideStatus('idle'), 3000)
    } catch {
      setOverrideStatus('error')
    } finally {
      setOverrideSaving(false)
    }
  }

  async function handleClearOverride() {
    if (!selected) return
    if (!confirm(`Réinitialiser ${selected.nom} sur le template général ? La version personnalisée sera perdue.`)) return
    setOverrideSaving(true)
    setOverrideStatus('idle')
    try {
      await clearSyndicatOverride(selected.id)
      setOverrides((prev) => {
        const next = { ...prev }
        delete next[selected.id]
        return next
      })
      setOverrideStatus('success')
      setTimeout(() => setOverrideStatus('idle'), 3000)
    } catch {
      setOverrideStatus('error')
    } finally {
      setOverrideSaving(false)
    }
  }

  function handleDownload(s: SyndicatLancement) {
    const baseHtml = overrides[s.id] ?? html
    const blob = new Blob([composeFor(baseHtml, s)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lancement-${s.id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadAll() {
    for (const s of syndicats) {
      handleDownload(s)
      await new Promise((r) => setTimeout(r, 150))
    }
  }

  async function handleCopy(s: SyndicatLancement) {
    const baseHtml = overrides[s.id] ?? html
    await navigator.clipboard.writeText(composeFor(baseHtml, s))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-card shadow-card p-6 space-y-5">
      <div>
        <p className="text-sm text-gray-500">
          Email de lancement envoyé par chaque syndicat membre à sa propre base. Un fichier HTML « clé en main » par syndicat,
          que le syndicat envoie depuis son outil d&apos;emailing. Le <strong>mot du président</strong> est repris de la page
          « Qui sommes-nous » ; le wording commun s&apos;édite ci-dessous.
        </p>
      </div>

      {/* Sélecteur de syndicat */}
      <div>
        <label className="block text-xs font-medium text-navy mb-1.5">Syndicat émetteur</label>
        <div className="flex flex-wrap gap-1.5">
          {syndicats.map((s) => {
            const isActive = s.id === selectedId
            const isOverridden = !!overrides[s.id]
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-navy'
                }`}
              >
                {s.nom}
                {isOverridden && (
                  <span
                    title="Version personnalisée"
                    className={`ml-1.5 inline-flex items-center align-middle ${isActive ? 'text-amber-300' : 'text-amber-500'}`}
                  >
                    <Sparkles className="w-3 h-3" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {selected && (
          <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 bg-surface-light rounded-lg px-3 py-2">
            <Users className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
            <span>
              Mot injecté : <strong className="text-navy">{selected.presidents}</strong> ({selected.titre}) ·{' '}
              <span className="italic">«&nbsp;{selected.citation.slice(0, 90)}{selected.citation.length > 90 ? '…' : ''}&nbsp;»</span>
            </span>
          </div>
        )}
      </div>

      {/* Sujet */}
      <div>
        <label className="block text-xs font-medium text-navy mb-1.5">Objet de l&apos;email</label>
        <input
          type="text"
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
        />
      </div>

      {/* Contenu HTML */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-navy">Contenu HTML du template</label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-xs text-gray-500">Variables :</span>
          {VARIABLES.map((v) => (
            <code key={v} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-600">{v}</code>
          ))}
        </div>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          style={{ minHeight: 420 }}
          className="w-full font-mono text-xs text-gray-700 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-y"
          spellCheck={false}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => selected && setPreviewHtml(composeFor(effectiveHtml, selected))}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy transition-colors"
          >
            <Eye className="w-4 h-4" />
            Aperçu — {selected?.nom}
            {hasOverride && <span className="text-amber-600 text-xs">(personnalisé)</span>}
          </button>
          {template.updated_at && (
            <span className="text-xs text-gray-400">
              Màj : {new Date(template.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-sm text-green-600"><Check className="w-4 h-4" />Enregistré</span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm text-red-500"><AlertCircle className="w-4 h-4" />Erreur</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le wording'}
          </button>
        </div>
      </div>

      {/* ── Personnalisation par syndicat ── */}
      <div className="border border-amber-200/70 bg-amber-50/50 rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-navy">
              Personnalisation pour {selected?.nom}
              {hasOverride && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                  Version personnalisée active
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {hasOverride
                ? `Ce syndicat utilise une version HTML qui lui est propre. Les autres syndicats restent sur le template général ci-dessus.`
                : `Si ${selected?.nom} demande une modification spécifique (un mot, un paragraphe…), tu peux créer une version dédiée pour ce syndicat uniquement, sans toucher au template général.`}
            </p>
          </div>
        </div>

        {!hasOverride ? (
          <div>
            <button
              type="button"
              onClick={handleStartOverride}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Personnaliser pour {selected?.nom}
            </button>
          </div>
        ) : (
          <>
            <textarea
              value={overrides[selected!.id]}
              onChange={(e) => handleOverrideChange(e.target.value)}
              style={{ minHeight: 320 }}
              className="w-full font-mono text-xs text-gray-700 border border-amber-200 bg-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-y"
              spellCheck={false}
            />
            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClearOverride}
                disabled={overrideSaving}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser sur le template général
              </button>
              <div className="flex items-center gap-3">
                {overrideStatus === 'success' && (
                  <span className="flex items-center gap-1 text-sm text-green-600"><Check className="w-4 h-4" />Enregistré</span>
                )}
                {overrideStatus === 'error' && (
                  <span className="flex items-center gap-1 text-sm text-red-500"><AlertCircle className="w-4 h-4" />Erreur</span>
                )}
                <button
                  onClick={handleSaveOverride}
                  disabled={overrideSaving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {overrideSaving ? 'Enregistrement…' : `Enregistrer pour ${selected?.nom}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Téléchargement / copie */}
      <div className="border-t border-gray-100 pt-4 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-gray-500">
          Fichier prêt à transmettre au syndicat (à envoyer depuis son propre outil d&apos;emailing).
        </p>
        <div className="flex items-center gap-2">
          {copied && <span className="text-xs text-green-600">Copié ✓</span>}
          <button
            type="button"
            onClick={() => selected && handleCopy(selected)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:border-gray-400 hover:text-navy transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copier le HTML
          </button>
          <button
            type="button"
            onClick={() => selected && handleDownload(selected)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger — {selected?.nom}
          </button>
          <button
            type="button"
            onClick={handleDownloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger les {syndicats.length}
          </button>
        </div>
      </div>

      {/* Modal aperçu */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-xl w-full max-w-3xl flex flex-col" style={{ height: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-xs text-gray-500">
                  Aperçu — {selected?.nom}
                  {hasOverride && <span className="ml-2 text-amber-600">(version personnalisée)</span>}
                </p>
                <p className="text-sm font-semibold text-navy">{sujet}</p>
              </div>
              <button onClick={() => setPreviewHtml(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="w-full flex-1 border-0 rounded-b-card"
              title="Aperçu email lancement syndicat"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
