'use client'

import { useState } from 'react'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { saveEmailTemplate } from '@/lib/actions/emailTemplates'
import { Eye, Check, AlertCircle, Code, Send } from 'lucide-react'

const DEFAULT_TEST_EMAIL = 'david.azerad@100000medecins.org'

const SAMPLE_VARS: Record<string, string> = {
  nom: 'Dr. DUPONT',
  prenom: 'Dr. DUPONT',
  solution_nom: 'MonLogiciel Pro',
  lien_1clic: '#',
  lien_reevaluation: '#',
  lien_desabonnement: '#',
  lien_reinitialisation: '#',
  lien_reprise: '#',
  psc_link: '#',
  lien_etude: '#',
  lien_questionnaire: '#',
  texte_promoteur: 'Texte fourni par le promoteur de l\'étude.',
  contenu: '<p style="font-family:sans-serif;color:#333;padding:16px;">Contenu de l\'email ici — remplacé par chaque template.</p>',
}

interface Props {
  templateId: string
  initialSujet: string
  initialHtml: string
  updatedAt: string | null
  masterLayoutHtml?: string
}

export default function EmailTemplateEditor({ templateId, initialSujet, initialHtml, updatedAt, masterLayoutHtml }: Props) {
  const [sujet, setSujet] = useState(initialSujet)
  const [contenuHtml, setContenuHtml] = useState(initialHtml)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [rawMode, setRawMode] = useState(false)
  const [testEmail, setTestEmail] = useState(DEFAULT_TEST_EMAIL)
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ ok?: boolean; sentTo?: string; error?: string } | null>(null)

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
    const origin = window.location.origin
    const isFullDocument = contenuHtml.trim().toLowerCase().startsWith('<!doctype')
    let rendered = contenuHtml

    // Injecter dans le layout seulement si le template n'est pas déjà un document HTML complet
    if (!isFullDocument && masterLayoutHtml?.includes('{{contenu}}')) {
      rendered = masterLayoutHtml.replace(/\{\{contenu\}\}/g, contenuHtml)
    }

    rendered = rendered
      .replace(/https?:\/\/(?:www\.)?100000medecins\.org/g, origin)
      .replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VARS[key] ?? `{{${key}}}`)

    setPreviewHtml(rendered)
  }

  const handleTestSend = async () => {
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, testEmail: testEmail.trim() || DEFAULT_TEST_EMAIL }),
      })
      const json = await res.json()
      setTestResult(json.ok ? { ok: true, sentTo: json.sentTo } : { error: json.error ?? 'Erreur inconnue' })
    } catch (e) {
      setTestResult({ error: String(e) })
    } finally {
      setTestSending(false)
    }
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
            {templateId === 'master_layout' ? 'Layout HTML (contient {{contenu}})' : 'Contenu de l\'email'}
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
            placeholder={templateId === 'master_layout'
              ? 'HTML complet du layout. Placer {{contenu}} à l\'endroit où chaque email injecte son corps.'
              : 'Collez ici le HTML du contenu de l\'email…'
            }
          />
        ) : (
          <RichTextEditor
            initialContent={contenuHtml}
            onChange={setContenuHtml}
            minHeight={300}
          />
        )}

        {templateId === 'master_layout' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
            Ce layout encapsule tous les emails SendGrid du site. Placer <code className="font-mono bg-amber-100 px-1 rounded">{'{{contenu}}'}</code> à l&apos;endroit où chaque email injecte son corps. Modifier ce layout change l&apos;apparence de tous les emails.
          </p>
        )}
      </div>

      {/* Actions — Aperçu + Sauvegarde */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy transition-colors"
          >
            <Eye className="w-4 h-4" />
            Aperçu{masterLayoutHtml?.includes('{{contenu}}') && templateId !== 'master_layout' ? ' (rendu final)' : ''}
          </button>
          {updatedAt && (
            <span className="text-xs text-gray-400">
              Màj : {new Date(updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

      {/* Envoi de test */}
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500">Envoyer un test</p>
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder={DEFAULT_TEST_EMAIL}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <button
            onClick={handleTestSend}
            disabled={testSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/80 transition-colors disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            {testSending ? 'Envoi…' : 'Tester'}
          </button>
        </div>
        {testResult && (
          <p className={`text-xs rounded-lg px-3 py-2 ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.ok ? `✅ Envoyé à ${testResult.sentTo}` : `Erreur : ${testResult.error}`}
          </p>
        )}
      </div>

      {/* Modal aperçu */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card shadow-xl w-full max-w-3xl flex flex-col" style={{ height: '90vh' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div>
                <p className="text-xs text-gray-500">
                  {masterLayoutHtml?.includes('{{contenu}}') && templateId !== 'master_layout'
                    ? 'Aperçu rendu final (layout + contenu) — données fictives'
                    : 'Aperçu — données fictives'}
                </p>
                <p className="text-sm font-semibold text-navy">
                  {sujet.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VARS[key] ?? `{{${key}}}`)}
                </p>
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
