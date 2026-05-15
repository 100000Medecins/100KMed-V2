'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, X, Building2, AlertCircle, Plus } from 'lucide-react'
import { approuverEditeurClaim, rejeterEditeurClaim } from '@/lib/actions/admin'

export type ClaimRow = {
  id: string
  created_at: string
  libre_texte: string | null
  statut: string
  note_admin: string | null
  user: { nom: string | null; prenom: string | null; contact_email: string | null } | null
  editeur: { id: string; nom: string | null; nom_commercial: string | null } | null
  solution: { id: string; nom: string | null } | null
}

export type EditeurOption = {
  id: string
  nom: string
}

export default function AdminEditeurClaims({
  claims,
  editeurs,
}: {
  claims: ClaimRow[]
  editeurs: EditeurOption[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [selectedEditeur, setSelectedEditeur] = useState<Record<string, string>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const autoApproveDone = useRef(false)

  // Au retour depuis « + Créer un nouvel éditeur » → auto-approbation
  useEffect(() => {
    if (autoApproveDone.current) return
    const approveClaim = searchParams.get('approveClaim')
    const withEditeur = searchParams.get('withEditeur')
    if (!approveClaim || !withEditeur) return
    autoApproveDone.current = true

    setPending((p) => ({ ...p, [approveClaim]: true }))
    approuverEditeurClaim(approveClaim, withEditeur)
      .then(() => {
        setFlash('Nouvel éditeur créé et demande approuvée.')
        setTimeout(() => setFlash(null), 4000)
      })
      .catch(() => {
        setFlash("Éditeur créé mais erreur à l'approbation — approuvez manuellement.")
      })
      .finally(() => {
        setPending((p) => ({ ...p, [approveClaim]: false }))
        // Nettoyer l'URL pour éviter une nouvelle exécution si on revient en arrière
        router.replace('/admin/editeurs?tab=demandes')
      })
  }, [searchParams, router])

  const handleApprouver = async (claim: ClaimRow) => {
    const editeurId = claim.editeur?.id || selectedEditeur[claim.id]
    if (!editeurId) return
    setPending((p) => ({ ...p, [claim.id]: true }))
    await approuverEditeurClaim(claim.id, editeurId)
    setPending((p) => ({ ...p, [claim.id]: false }))
  }

  const handleRejeter = async (claimId: string) => {
    setPending((p) => ({ ...p, [claimId]: true }))
    await rejeterEditeurClaim(claimId)
    setPending((p) => ({ ...p, [claimId]: false }))
  }

  const enAttente = claims.filter((c) => c.statut === 'en_attente')
  const traitees = claims.filter((c) => c.statut !== 'en_attente')

  const buildCreateUrl = (claim: ClaimRow) => {
    const prefill = claim.libre_texte || claim.solution?.nom || ''
    const params = new URLSearchParams({ fromClaim: claim.id })
    if (prefill) params.set('prefillNom', prefill)
    return `/admin/editeurs/nouveau?${params.toString()}`
  }

  return (
    <div className="space-y-8">

      {flash && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          {flash}
        </div>
      )}

      {enAttente.length === 0 ? (
        <div className="bg-white rounded-card shadow-card px-6 py-16 text-center text-gray-400 text-sm">
          Aucune demande en attente.
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-card divide-y divide-gray-50">
          {enAttente.map((claim) => {
            const userName = [claim.user?.prenom, claim.user?.nom].filter(Boolean).join(' ') || '—'
            const hasDirectEditeur = !!claim.editeur
            const needsEditeurSelection = !hasDirectEditeur
            const canApprove = hasDirectEditeur || !!selectedEditeur[claim.id]

            return (
              <div key={claim.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-navy">{userName}</p>
                    <p className="text-xs text-gray-400">{claim.user?.contact_email || '—'}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(claim.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={!canApprove || pending[claim.id]}
                      onClick={() => handleApprouver(claim)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approuver
                    </button>
                    <button
                      disabled={pending[claim.id]}
                      onClick={() => handleRejeter(claim.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rejeter
                    </button>
                  </div>
                </div>

                {/* Contenu de la demande */}
                <div className="bg-surface-light rounded-xl p-3 text-sm space-y-1">
                  {claim.editeur && (
                    <p className="flex items-center gap-2 text-navy">
                      <Building2 className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                      <span className="font-medium">Éditeur existant :</span>
                      <Link href={`/admin/editeurs/${claim.editeur.id}/modifier`} className="text-accent-blue hover:underline">
                        {claim.editeur.nom_commercial || claim.editeur.nom}
                      </Link>
                    </p>
                  )}
                  {claim.solution && (
                    <p className="flex items-center gap-2 text-navy">
                      <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium">Solution sans éditeur :</span>
                      {claim.solution.nom}
                    </p>
                  )}
                  {claim.libre_texte && (
                    <p className="flex items-center gap-2 text-navy">
                      <AlertCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-medium">Texte libre :</span>
                      {claim.libre_texte}
                    </p>
                  )}
                </div>

                {/* Sélection d'éditeur si pas d'éditeur direct */}
                {needsEditeurSelection && (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                      Associez à un éditeur existant, ou créez-en un nouveau pré-rempli avec cette demande.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedEditeur[claim.id] || ''}
                        onChange={(e) => setSelectedEditeur((s) => ({ ...s, [claim.id]: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                      >
                        <option value="">Choisir un éditeur existant...</option>
                        {editeurs.map((ed) => (
                          <option key={ed.id} value={ed.id}>{ed.nom}</option>
                        ))}
                      </select>
                      <Link
                        href={buildCreateUrl(claim)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-navy text-white rounded-xl hover:bg-navy/90 transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Créer un nouvel éditeur
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Demandes traitées */}
      {traitees.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Traitées</h3>
          <div className="bg-white rounded-card shadow-card divide-y divide-gray-50">
            {traitees.map((claim) => {
              const userName = [claim.user?.prenom, claim.user?.nom].filter(Boolean).join(' ') || '—'
              return (
                <div key={claim.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-navy font-medium">{userName}</p>
                    <p className="text-xs text-gray-400">{claim.user?.contact_email}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    claim.statut === 'approuve'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {claim.statut === 'approuve' ? 'Approuvée' : 'Rejetée'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
