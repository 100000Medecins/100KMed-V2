'use client'

import { useState, useTransition } from 'react'
import { Check, X, Building2, ExternalLink } from 'lucide-react'
import {
  approveEditeurReferencement,
  rejectEditeurReferencement,
} from '@/lib/actions/admin'

export type DemandeRefRow = {
  id: string
  nom_editeur: string
  nom_solution: string | null
  email_contact: string
  site_web: string | null
  message: string | null
  created_at: string
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function AdminEditeurDemandesRef({
  demandes,
}: {
  demandes: DemandeRefRow[]
}) {
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [, startTransition] = useTransition()
  const [flash, setFlash] = useState<string | null>(null)

  function handleApprove(d: DemandeRefRow) {
    if (!confirm(`Créer une fiche éditeur pour "${d.nom_editeur}" ?`)) return
    setPending((p) => ({ ...p, [d.id]: true }))
    startTransition(async () => {
      const res = await approveEditeurReferencement(d.id, {
        nom: d.nom_editeur,
        nom_commercial: null,
        website: d.site_web,
      })
      if (res?.error) {
        setFlash(`Erreur : ${res.error}`)
        setTimeout(() => setFlash(null), 5000)
      } else {
        setFlash(
          `Fiche éditeur créée. Complétez-la depuis l'admin Éditeurs avant de l'activer.`
        )
        setTimeout(() => setFlash(null), 5000)
      }
      setPending((p) => ({ ...p, [d.id]: false }))
    })
  }

  function handleReject(d: DemandeRefRow) {
    if (!confirm(`Rejeter la demande de "${d.nom_editeur}" ?`)) return
    setPending((p) => ({ ...p, [d.id]: true }))
    startTransition(async () => {
      await rejectEditeurReferencement(d.id)
      setPending((p) => ({ ...p, [d.id]: false }))
    })
  }

  if (demandes.length === 0) {
    return (
      <div className="bg-white rounded-card shadow-card p-8 text-center text-sm text-gray-400">
        Aucune demande de référencement en attente.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {flash && (
        <div className="bg-accent-blue/10 text-accent-blue text-sm rounded-xl px-4 py-2.5">
          {flash}
        </div>
      )}
      <ul className="space-y-3">
        {demandes.map((d) => {
          const isPending = !!pending[d.id]
          return (
            <li
              key={d.id}
              className="bg-white rounded-card shadow-card p-5 border border-transparent hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-navy">
                        {d.nom_editeur}
                        {d.nom_solution && (
                          <span className="text-gray-400 font-normal text-sm">
                            {' '}
                            — {d.nom_solution}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(d.created_at)} ·{' '}
                        <a
                          href={`mailto:${d.email_contact}`}
                          className="text-accent-blue hover:underline"
                        >
                          {d.email_contact}
                        </a>
                        {d.site_web && (
                          <>
                            {' · '}
                            <a
                              href={d.site_web}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-blue hover:underline inline-flex items-center gap-0.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {(() => {
                                try {
                                  return new URL(d.site_web!).hostname
                                } catch {
                                  return d.site_web
                                }
                              })()}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleApprove(d)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent-blue rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approuver
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleReject(d)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rejeter
                      </button>
                    </div>
                  </div>
                  {d.message && (
                    <div className="mt-3 text-sm text-gray-600 bg-surface-light rounded-xl px-3 py-2.5 whitespace-pre-wrap">
                      {d.message}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
