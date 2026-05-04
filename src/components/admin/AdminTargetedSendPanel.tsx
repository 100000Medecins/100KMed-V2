'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle, AlertCircle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import RichTextEditor from '@/components/admin/RichTextEditor'
import SpecialitesSelector from '@/components/admin/SpecialitesSelector'

interface Props {
  apiRoute: string
  optedInEmails: string[]
  labelLien: string
  labelTextePromoteur: string
}

type SendState = 'idle' | 'confirming' | 'sending' | 'done' | 'error'

export default function AdminTargetedSendPanel({ apiRoute, optedInEmails, labelLien, labelTextePromoteur }: Props) {
  const [lienEtude, setLienEtude] = useState('')
  const [textePromoteur, setTextePromoteur] = useState('')
  const [specialitesCibles, setSpecialitesCibles] = useState<string[]>([])
  const [sendState, setSendState] = useState<SendState>('idle')
  const [sendResult, setSendResult] = useState<{ sent: number; total: number } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showEmails, setShowEmails] = useState(false)

  async function handleSend() {
    setSendState('sending')
    setSendError(null)
    try {
      const res = await fetch(apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lien_etude: lienEtude, texte_promoteur: textePromoteur, specialites_cibles: specialitesCibles }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSendError(json.error ?? 'Erreur inconnue')
        setSendState('error')
        return
      }
      setSendResult({ sent: json.sent, total: json.total })
      setSendState('done')
    } catch (e) {
      setSendError(String(e))
      setSendState('error')
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(optedInEmails.join(', '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-6 pt-5 border-t border-gray-100 space-y-5">

      {/* Inscrits */}
      <div className="bg-surface-light rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-navy">
              {optedInEmails.length} destinataire{optedInEmails.length !== 1 ? 's' : ''} inscrit{optedInEmails.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Utilisateurs ayant activé cette préférence dans leur compte</p>
          </div>
          <div className="flex items-center gap-2">
            {optedInEmails.length > 0 && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-navy bg-white border border-gray-200 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier les emails'}
              </button>
            )}
            {optedInEmails.length > 0 && (
              <button
                type="button"
                onClick={() => setShowEmails(!showEmails)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                {showEmails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showEmails ? 'Masquer' : 'Voir la liste'}
              </button>
            )}
          </div>
        </div>

        {showEmails && optedInEmails.length > 0 && (
          <div className="mt-3 max-h-36 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2">
            {optedInEmails.map((email) => (
              <p key={email} className="text-xs text-gray-600 py-0.5 font-mono">{email}</p>
            ))}
          </div>
        )}

        {optedInEmails.length === 0 && (
          <p className="text-xs text-gray-400 mt-2 italic">Aucun utilisateur inscrit pour le moment.</p>
        )}
      </div>

      {/* Ciblage spécialité */}
      <SpecialitesSelector
        value={specialitesCibles}
        onChange={setSpecialitesCibles}
      />

      {/* Champ lien */}
      <div>
        <label className="block text-xs font-medium text-navy mb-1.5">{labelLien}</label>
        <input
          type="url"
          value={lienEtude}
          onChange={(e) => setLienEtude(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
        />
        <p className="text-xs text-gray-400 mt-1">Inséré dans le template via <code className="bg-gray-100 px-1 rounded font-mono">{'{{lien_etude}}'}</code></p>
      </div>

      {/* Texte promoteur */}
      <div>
        <label className="block text-xs font-medium text-navy mb-1.5">{labelTextePromoteur}</label>
        <RichTextEditor
          initialContent=""
          onChange={setTextePromoteur}
          minHeight={150}
        />
        <p className="text-xs text-gray-400 mt-1">Inséré dans le template via <code className="bg-gray-100 px-1 rounded font-mono">{'{{texte_promoteur}}'}</code></p>
      </div>

      {/* Bouton envoi */}
      <div>
        {sendState === 'idle' && (
          <button
            type="button"
            disabled={optedInEmails.length === 0}
            onClick={() => setSendState('confirming')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-semibold bg-navy text-white hover:bg-navy-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Envoyer aux {optedInEmails.length} inscrits
          </button>
        )}

        {sendState === 'confirming' && (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              Confirmer l&apos;envoi à {optedInEmails.length} destinataire{optedInEmails.length !== 1 ? 's' : ''} ?
            </p>
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-button text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Oui, envoyer
            </button>
            <button onClick={() => setSendState('idle')} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
              Annuler
            </button>
          </div>
        )}

        {sendState === 'sending' && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi en cours…
          </div>
        )}

        {sendState === 'done' && sendResult && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {sendResult.sent} email{sendResult.sent !== 1 ? 's' : ''} envoyé{sendResult.sent !== 1 ? 's' : ''} sur {sendResult.total} destinataires.
          </div>
        )}

        {sendState === 'error' && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {sendError}
          </div>
        )}
      </div>
    </div>
  )
}
