'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Field from '@/components/ui/Field'
import Badge from '@/components/ui/Badge'
import { accepterIntitule, fusionnerIntitule, refuserIntitule } from '@/lib/actions/admin-intitules'

export interface PropositionIntitule {
  id: string
  libelle: string
  synonymes: string[]
  groupe: string | null
  /** Prénom, nom (spécialité) de l'auteur ; effacé à la décision. */
  auteur: string | null
  creeLe: string
  nbFiches: number
}

export interface IntituleValide {
  id: string
  libelle: string
  groupe: string | null
}

const SANS_RUBRIQUE = 'Sans rubrique'

function CarteProposition({
  proposition,
  groupes,
  validesParGroupe,
}: {
  proposition: PropositionIntitule
  groupes: string[]
  validesParGroupe: [string, IntituleValide[]][]
}) {
  const router = useRouter()
  const [libelle, setLibelle] = useState(proposition.libelle)
  const [synonymes, setSynonymes] = useState(proposition.synonymes.join(', '))
  const [groupe, setGroupe] = useState(proposition.groupe ?? '')
  const [cible, setCible] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [traitee, setTraitee] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const reformulee = libelle.trim() !== proposition.libelle

  function agir(action: () => Promise<{ ok: true } | { error: string }>, message: string) {
    setErreur(null)
    startTransition(async () => {
      const res = await action()
      if ('error' in res) {
        setErreur(res.error)
        return
      }
      setTraitee(message)
      router.refresh()
    })
  }

  if (traitee) {
    return (
      <Card padding="md">
        <p className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          {traitee}
        </p>
      </Card>
    )
  }

  const libelleCible = validesParGroupe.flatMap(([, liste]) => liste).find((v) => v.id === cible)?.libelle

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <Badge variant="warning" size="sm">
          Proposée
        </Badge>
        <span>le {new Date(proposition.creeLe).toLocaleDateString('fr-FR')}</span>
        <span>· par {proposition.auteur ?? 'un médecin (compte supprimé)'}</span>
        <span>
          · cochée sur {proposition.nbFiches} fiche{proposition.nbFiches !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Libellé" htmlFor={`libelle-${proposition.id}`}>
          <Input id={`libelle-${proposition.id}`} size="sm" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        </Field>
        <Field label="Rubrique" htmlFor={`groupe-${proposition.id}`}>
          <Select id={`groupe-${proposition.id}`} size="sm" value={groupe} onChange={(e) => setGroupe(e.target.value)}>
            <option value="">— Aucune rubrique —</option>
            {groupes.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Synonymes"
          hint="Séparés par des virgules ; servent à la recherche (enregistrés en minuscules, sans accents)."
          htmlFor={`synonymes-${proposition.id}`}
          className="md:col-span-2"
        >
          <Input
            id={`synonymes-${proposition.id}`}
            size="sm"
            value={synonymes}
            placeholder="ex. echo, echographie"
            onChange={(e) => setSynonymes(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={pending}
          onClick={() =>
            agir(
              () => accepterIntitule(proposition.id, { libelle, synonymes: synonymes.split(','), groupe: groupe || null }),
              `« ${libelle.trim()} » accepté${reformulee ? ' (reformulé)' : ''} : il rejoint le catalogue.`,
            )
          }
        >
          {reformulee ? 'Accepter la reformulation' : 'Accepter'}
        </Button>

        <div className="flex items-center gap-2">
          <Select
            size="sm"
            fullWidth={false}
            value={cible}
            onChange={(e) => setCible(e.target.value)}
            aria-label="Compétence existante avec laquelle fusionner"
            className="max-w-[16rem]"
          >
            <option value="">Fusionner avec…</option>
            {validesParGroupe.map(([g, liste]) => (
              <optgroup key={g} label={g}>
                {liste.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.libelle}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!cible || pending}
            onClick={() =>
              agir(
                () => fusionnerIntitule(proposition.id, cible),
                `« ${proposition.libelle} » fusionné dans « ${libelleCible} » (ajouté à ses synonymes).`,
              )
            }
          >
            Fusionner
          </Button>
        </div>

        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Refuser « ${proposition.libelle} » ? La proposition disparaîtra des fiches qui l'avaient cochée.`)) return
            agir(() => refuserIntitule(proposition.id), `« ${proposition.libelle} » refusé.`)
          }}
        >
          Refuser
        </Button>
      </div>

      {erreur && <div className="mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{erreur}</div>}
    </Card>
  )
}

export default function IntitulesAdminClient({
  propositions,
  valides,
}: {
  propositions: PropositionIntitule[]
  valides: IntituleValide[]
}) {
  const validesParGroupe = useMemo(() => {
    const parGroupe = new Map<string, IntituleValide[]>()
    for (const v of valides) {
      const g = v.groupe ?? SANS_RUBRIQUE
      parGroupe.set(g, [...(parGroupe.get(g) ?? []), v])
    }
    return Array.from(parGroupe.entries()).sort(([a], [b]) => a.localeCompare(b, 'fr'))
  }, [valides])

  const groupes = useMemo(
    () => validesParGroupe.map(([g]) => g).filter((g) => g !== SANS_RUBRIQUE),
    [validesParGroupe],
  )

  if (propositions.length === 0) {
    return (
      <Card padding="xl" className="text-center text-sm text-gray-500">
        Aucune proposition en attente.
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {propositions.map((p) => (
        <CarteProposition key={p.id} proposition={p} groupes={groupes} validesParGroupe={validesParGroupe} />
      ))}
    </div>
  )
}
