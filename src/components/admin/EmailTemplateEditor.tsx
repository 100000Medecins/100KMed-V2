'use client'

import { useState } from 'react'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { saveEmailTemplate } from '@/lib/actions/emailTemplates'
import { Eye, Check, AlertCircle, Code } from 'lucide-react'

// Version allégée pour l'aperçu (URL relative, évite d'importer le fichier base64 9KB)
function withPreviewLogo(html: string): string {
  const LOGO_ROW = `<tr><td style="padding:16px 0 8px;text-align:left;"><a href="/" style="display:block;text-decoration:none;line-height:0;"><img src="/logos/logo-secondaire-couleur-500.png" alt="100 000 Médecins" width="340" height="80" style="display:block;height:80px;width:auto;" /></a></td></tr>`
  const anchor = 'style="max-width:580px;width:100%;">'
  const idx = html.indexOf(anchor)
  if (idx !== -1) return html.slice(0, idx + anchor.length) + LOGO_ROW + html.slice(idx + anchor.length)
  return LOGO_ROW + html
}

interface Props {
  templateId: string
  initialSujet: string
  initialHtml: string
  updatedAt: string | null
}

export default function EmailTemplateEditor({ templateId, initialSujet, initialHtml, updatedAt }: Props) {
  const [sujet, setSujet] = useState(initialSujet)
  const [contenuHtml, setContenuHtml] = useState(initialHtml)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [rawMode, setRawMode] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')
    try {
      await saveEmailTemplate(templateId, sujet, contenuHtml)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    const sampleValues: Record<string, string> = {
      nom: 'Dr. DUPONT',
      prenom: 'Dr. DUPONT',
      solution_nom: 'MonLogiciel Pro',
      lien_1clic: '#',
      lien_reevaluation: '#',
      lien_desabonnement: '#',
      psc_link: '#',
      lien_desabonnement_etude: '#',
      lien_questionnaire: '#',
    }
    const rendered = contenuHtml.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleValues[key] ?? `{{${key}}}`)
    setPreviewHtml(withPreviewLogo(rendered))
  }

  return (
    <div className="space-y-5">
      {/* Sujet */}
      <div>
        <label className="block text-xs font-medium text-navy mb-1.5">
          Sujet de l&apos;email
        </label>
        <input
          type="text"
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
        />
      </div>

      {/* Contenu */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-navy">
            Contenu de l&apos;email
          </label>
          <button
            type="button"
            onClick={() => setRawMode(m => !m)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              rawMode
                ? 'bg-navy text-white border-navy'
                : 'text-gray-500 border-gray-200 hover:border-gray-400 hover:text-navy'
            }`}
          >
            <Code className="w-3 h-3" />
            {rawMode ? 'Mode HTML brut (actif)' : 'Passer en HTML brut'}
          </button>
        </div>

        {rawMode ? (
          <textarea
            value={contenuHtml}
            onChange={(e) => setContenuHtml(e.target.value)}
            style={{ minHeight: 400 }}
            className="w-full font-mono text-xs text-gray-700 border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue resize-y"
            spellCheck={false}
            placeholder="Collez ici le HTML complet de l'email…"
          />
        ) : (
          <RichTextEditor
            initialContent={initialHtml}
            onChange={setContenuHtml}
            minHeight={300}
          />
        )}

        <p className="text-xs text-gray-400 mt-1">
          {rawMode
            ? 'Mode HTML brut : le HTML est enregistré tel quel, sans modification. Idéal pour les templates avec mise en page avancée.'
            : <>Astuce : tapez <code className="bg-gray-100 px-1 rounded font-mono">{'{{psc_link}}'}</code> à l&apos;endroit où vous souhaitez insérer le bouton de connexion PSC.</>
          }
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy transition-colors"
          >
            <Eye className="w-4 h-4" />
            Aperçu
          </button>
          {updatedAt && (
            <span className="text-xs text-gray-400">
              Dernière mise à jour : {new Date(updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" />
              Enregistré
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm text-red-500">
              <AlertCircle className="w-4 h-4" />
              Erreur
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Aperçu modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-xl w-full max-w-3xl flex flex-col" style={{ height: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-xs text-gray-500">Sujet :</p>
                <p className="text-sm font-semibold text-navy">{sujet}</p>
              </div>
              <button
                onClick={() => setPreviewHtml(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="w-full flex-1 border-0 rounded-b-card"
              title="Aperçu email"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
