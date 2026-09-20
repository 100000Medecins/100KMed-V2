'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Sparkles, RefreshCw, X, PenLine, ExternalLink } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Textarea from '@/components/ui/Textarea'
import {
  redigerMaintenant,
  ecarterProposition,
  regenererPropositions,
} from '@/lib/actions/propositions-articles'
import type { PropositionArticle } from '@/lib/propositions-articles'

const LONGUEUR_LABELS: Record<string, string> = {
  breve: 'Brève',
  article: 'Article',
  dossier: 'Dossier',
}

interface Props {
  propositions: PropositionArticle[]
}

export default function PropositionsArticlesPanel({ propositions }: Props) {
  const [isPending, startTransition] = useTransition()
  const [actionEnCours, setActionEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [cadrageOuvert, setCadrageOuvert] = useState(false)
  const [cadrage, setCadrage] = useState('')

  function lancer(cle: string, action: () => Promise<{ error?: string } | void>) {
    setErreur(null)
    setActionEnCours(cle)
    startTransition(async () => {
      const res = await action()
      if (res?.error) setErreur(res.error)
      setActionEnCours(null)
    })
  }

  function handleRegenerer() {
    lancer('regenerer', async () => {
      const res = await regenererPropositions(cadrage.trim() || null)
      if (!res?.error) {
        setCadrage('')
        setCadrageOuvert(false)
      }
      return res
    })
  }

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-blue" />
            Sujets proposés
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {propositions.length > 0
              ? `${propositions.length} sujet${propositions.length > 1 ? 's' : ''} en attente d'arbitrage`
              : 'Aucun sujet en attente — le prochain lot arrive lundi matin.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={() => setCadrageOuvert((v) => !v)}
          disabled={isPending}
        >
          Regénérer
        </Button>
      </div>

      {cadrageOuvert && (
        <div className="mt-5 p-4 bg-surface-light rounded-card">
          <label htmlFor="cadrage-propositions" className="block text-sm font-medium text-navy mb-1.5">
            Cadrage (optionnel)
          </label>
          <Textarea
            id="cadrage-propositions"
            size="sm"
            rows={2}
            value={cadrage}
            onChange={(e) => setCadrage(e.target.value)}
            placeholder="Ex. : plutôt côté téléconsultation, ou en évitant la réglementation ce mois-ci"
            disabled={isPending}
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Laisser vide pour un tirage libre. Les sujets en attente seront remplacés.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              type="button"
              size="sm"
              onClick={handleRegenerer}
              loading={isPending && actionEnCours === 'regenerer'}
              disabled={isPending}
            >
              Proposer 3 nouveaux sujets
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCadrageOuvert(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {erreur && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-button px-4 py-2.5">{erreur}</p>
      )}

      {propositions.length > 0 && (
        <div className="mt-5 space-y-4">
          {propositions.map((p) => (
            <div key={p.id} className="border border-gray-100 rounded-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={p.type === 'actu' ? 'warning' : 'neutral'} size="sm">
                  {p.type === 'actu' ? 'Actualité' : 'Dossier'}
                </Badge>
                <Badge variant="neutral" size="sm">
                  {LONGUEUR_LABELS[p.longueur] ?? p.longueur}
                </Badge>
                {p.cadrage && (
                  <Badge variant="info" size="sm" title={p.cadrage}>
                    Cadré
                  </Badge>
                )}
              </div>

              <h3 className="font-semibold text-navy">{p.titre}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mt-1.5">{p.angle}</p>

              {p.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {p.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {s.titre}
                    </a>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Button
                  type="button"
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => lancer(p.id, () => redigerMaintenant(p.id))}
                  loading={isPending && actionEnCours === p.id}
                  disabled={isPending}
                >
                  Rédiger maintenant
                </Button>
                <Link href={`/admin/blog/nouveau?proposition=${p.id}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<PenLine className="w-3.5 h-3.5" />}
                    disabled={isPending}
                  >
                    Ouvrir le formulaire
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<X className="w-3.5 h-3.5" />}
                  onClick={() => lancer(`ecarter-${p.id}`, () => ecarterProposition(p.id))}
                  loading={isPending && actionEnCours === `ecarter-${p.id}`}
                  disabled={isPending}
                >
                  Écarter
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
