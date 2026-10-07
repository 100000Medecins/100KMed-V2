'use client'

import { useState, useTransition } from 'react'
import { Euro, Loader2, Briefcase, BookUser } from 'lucide-react'
import { setDisplayPrixFront, setDisplayContactsCommerciaux, setAnnuaireActif } from '@/lib/actions/admin'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface ParametresClientProps {
  initialDisplayPrixFront: boolean
  initialDisplayContactsCommerciaux: boolean
  initialAnnuaireActif: boolean
  annuaireForceIci: boolean
}

function useReglage(initial: boolean, enregistrer: (value: boolean) => Promise<{ error?: string } | undefined>) {
  const [actif, setActif] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function basculer() {
    const next = !actif
    setError(null)
    setActif(next) // optimistic
    startTransition(async () => {
      const res = await enregistrer(next)
      if (res?.error) {
        setError(res.error)
        setActif(!next)
      }
    })
  }

  return { actif, basculer, pending, error }
}

interface ReglageInterrupteurProps {
  icone: React.ReactNode
  couleurIcone: string
  titre: string
  description: React.ReactNode
  ariaLabel: string
  libelleActif: string
  libelleInactif: string
  reglage: ReturnType<typeof useReglage>
  note?: React.ReactNode
}

function ReglageInterrupteur({
  icone,
  couleurIcone,
  titre,
  description,
  ariaLabel,
  libelleActif,
  libelleInactif,
  reglage,
  note,
}: ReglageInterrupteurProps) {
  const { actif, basculer, pending, error } = reglage
  return (
    <Card padding="lg">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${couleurIcone}`}>
          {icone}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-navy">{titre}</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-xl">{description}</p>
            </div>

            <button
              type="button"
              onClick={basculer}
              disabled={pending}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                actif ? 'bg-accent-blue' : 'bg-gray-300'
              } disabled:opacity-60`}
              role="switch"
              aria-checked={actif}
              aria-label={ariaLabel}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  actif ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs flex-wrap">
            <Badge variant={actif ? 'success' : 'neutral'} dot>
              {actif ? libelleActif : libelleInactif}
            </Badge>
            {pending && (
              <span className="inline-flex items-center gap-1 text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Enregistrement…
              </span>
            )}
          </div>

          {note && <p className="mt-3 text-xs text-amber-700">{note}</p>}

          {error && (
            <div className="mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function ParametresClient({
  initialDisplayPrixFront,
  initialDisplayContactsCommerciaux,
  initialAnnuaireActif,
  annuaireForceIci,
}: ParametresClientProps) {
  const prix = useReglage(initialDisplayPrixFront, setDisplayPrixFront)
  const contacts = useReglage(initialDisplayContactsCommerciaux, setDisplayContactsCommerciaux)
  const annuaire = useReglage(initialAnnuaireActif, setAnnuaireActif)

  return (
    <div className="space-y-6">
      <ReglageInterrupteur
        icone={<Euro className="w-5 h-5" />}
        couleurIcone="bg-amber-50 text-amber-600"
        titre="Afficher les prix sur le site public"
        description={
          <>
            Quand ce réglage est activé, les prix renseignés par les éditeurs apparaissent sur les fiches solutions
            (« À partir de … €/mois TTC ») et l&apos;indicateur €/€€/€€€/€€€€ s&apos;affiche sur les cartes du comparatif.
            Laisser sur OFF tant qu&apos;une masse critique de prix n&apos;est pas renseignée — un affichage partiel
            pourrait donner l&apos;impression que les solutions sans prix sont louches.
          </>
        }
        ariaLabel="Afficher les prix sur le front"
        libelleActif="Activé — prix visibles sur le site"
        libelleInactif="Désactivé — prix masqués"
        reglage={prix}
      />

      <ReglageInterrupteur
        icone={<Briefcase className="w-5 h-5" />}
        couleurIcone="bg-accent-blue/10 text-accent-blue"
        titre="Afficher les contacts commerciaux des éditeurs"
        description={
          <>
            Affiche sur chaque fiche solution le bloc « Contacts commerciaux » (email et téléphone pour demande de démo/devis) si l&apos;éditeur les a renseignés.
            Masqué par défaut : beaucoup de coordonnées en BDD sont incorrectes ou inappropriées. Le bloc « Contacts support » (SAV) reste toujours affiché s&apos;il est renseigné.
          </>
        }
        ariaLabel="Afficher les contacts commerciaux"
        libelleActif="Activé — contacts commerciaux visibles"
        libelleInactif="Désactivé — contacts commerciaux masqués"
        reglage={contacts}
      />

      <ReglageInterrupteur
        icone={<BookUser className="w-5 h-5" />}
        couleurIcone="bg-green-50 text-green-600"
        titre="Ouvrir l'annuaire mutualisé"
        description={
          <>
            Fait apparaître « Ma fiche annuaire » dans Mon compte et enregistre la preuve de connexion Pro Santé Connect
            des médecins. Laisser sur OFF jusqu&apos;à la sortie de l&apos;application mobile et la mise en ligne des CGU
            et de la charte de l&apos;annuaire (voir la TODO).
          </>
        }
        ariaLabel="Ouvrir l'annuaire mutualisé"
        libelleActif="Activé — annuaire ouvert aux médecins"
        libelleInactif="Désactivé — annuaire invisible"
        reglage={annuaire}
        note={
          annuaireForceIci
            ? "Dans cet environnement, l'annuaire est allumé quoi qu'il arrive (variable ANNUAIRE_FORCER_ACTIF) : ce réglage ne pilote que la production."
            : undefined
        }
      />
    </div>
  )
}
