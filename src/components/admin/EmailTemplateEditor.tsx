'use client'

import { useState } from 'react'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { saveEmailTemplate } from '@/lib/actions/emailTemplates'
import { Eye, Check, AlertCircle } from 'lucide-react'

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
    const pscLink = '#lien-psc-exemple'
    setPreviewHtml(contenuHtml.replace('{{psc_link}}', pscLink))
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

      {/* Contenu WYSIWYG */}
      <div>
        <label className="block text-xs font-medium text-navy mb-1.5">
          Contenu de l&apos;email
        </label>
        <RichTextEditor
          initialContent={initialHtml}
          onChange={setContenuHtml}
          minHeight={300}
        />
        <p className="text-xs text-gray-400 mt-1">
          Astuce : tapez <code className="bg-gray-100 px-1 rounded font-mono">{'{{psc_link}}'}</code> à l&apos;endroit où vous souhaitez insérer le bouton de connexion PSC.
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
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
            <div
              className="p-6 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
