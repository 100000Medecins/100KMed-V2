'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Field from '@/components/ui/Field'
import Badge from '@/components/ui/Badge'
import { ajouterIntitule, modifierIntitule, supprimerIntitule } from '@/lib/actions/admin-intitules'
import { normaliserRecherche } from '@/lib/annuaire/normaliser'

export interface CompetenceCatalogue {
  id: string
  libelle: string
  synonymes: string[]
  groupe: string | null
  specialites_sm: string[]
  nbFiches: number
}

const SANS_RUBRIQUE = '__sans__'
const LISTE_RUBRIQUES = 'annuaire-rubriques'

const enListe = (texte: string) => texte.split(',').map((s) => s.trim()).filter(Boolean)

function LigneCompetence({ competence }: { competence: CompetenceCatalogue }) {
  const router = useRouter()
  const [edition, setEdition] = useState(false)
  const [libelle, setLibelle] = useState(competence.libelle)
  const [groupe, setGroupe] = useState(competence.groupe ?? '')
  const [synonymes, setSynonymes] = useState(competence.synonymes.join(', '))
  const [codesSm, setCodesSm] = useState(competence.specialites_sm.join(', '))
  const [erreur, setErreur] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function ouvrir() {
    setLibelle(competence.libelle)
    setGroupe(competence.groupe ?? '')
    setSynonymes(competence.synonymes.join(', '))
    setCodesSm(competence.specialites_sm.join(', '))
    setErreur(null)
    setEdition(true)
  }

  function executer(action: () => Promise<{ ok: true } | { error: string }>) {
    setErreur(null)
    startTransition(async () => {
      const res = await action()
      if ('error' in res) {
        setErreur(res.error)
        return
      }
      setEdition(false)
      router.refresh()
    })
  }

  if (!edition) {
    return (
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy">{competence.libelle}</p>
          <p className="text-xs text-gray-400 truncate">
            {competence.groupe ?? 'Sans rubrique'}
            {competence.synonymes.length > 0 && ` · ${competence.synonymes.join(', ')}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {competence.specialites_sm.length > 0 && (
            <Badge variant="neutral" size="sm" title="Masquée pour les médecins de ces spécialités RPPS">
              masquée : {competence.specialites_sm.join(', ')}
            </Badge>
          )}
          <Badge variant={competence.nbFiches > 0 ? 'info' : 'neutral'} size="sm">
            {competence.nbFiches} fiche{competence.nbFiches !== 1 ? 's' : ''}
          </Badge>
          <Button type="button" variant="ghost" size="sm" onClick={ouvrir}>
            Modifier
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-4 bg-surface-light">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Libellé" htmlFor={`lib-${competence.id}`}>
          <Input id={`lib-${competence.id}`} size="sm" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        </Field>
        <Field label="Rubrique" hint="Une rubrique existante ou une nouvelle." htmlFor={`grp-${competence.id}`}>
          <Input id={`grp-${competence.id}`} size="sm" list={LISTE_RUBRIQUES} value={groupe} onChange={(e) => setGroupe(e.target.value)} />
        </Field>
        <Field label="Synonymes" hint="Séparés par des virgules ; enregistrés en minuscules, sans accents." htmlFor={`syn-${competence.id}`}>
          <Input id={`syn-${competence.id}`} size="sm" value={synonymes} onChange={(e) => setSynonymes(e.target.value)} />
        </Field>
        <Field
          label="Masquée pour les spécialités"
          hint="Codes SM des spécialités RPPS qui la reprennent déjà (ex. SM57 pour l'allergologie)."
          htmlFor={`sm-${competence.id}`}
        >
          <Input id={`sm-${competence.id}`} size="sm" value={codesSm} placeholder="SM57, SM62" onChange={(e) => setCodesSm(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={pending}
          onClick={() =>
            executer(() =>
              modifierIntitule(competence.id, {
                libelle,
                synonymes: enListe(synonymes),
                groupe: groupe || null,
                specialitesSm: enListe(codesSm),
              }),
            )
          }
        >
          Enregistrer
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setEdition(false)}>
          Annuler
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="ml-auto"
          disabled={pending}
          onClick={() => {
            const effet = competence.nbFiches > 0
              ? ` Elle disparaîtra des ${competence.nbFiches} fiche(s) qui l'ont cochée.`
              : ''
            if (!window.confirm(`Supprimer « ${competence.libelle} » du catalogue ?${effet}`)) return
            executer(() => supprimerIntitule(competence.id))
          }}
        >
          Supprimer
        </Button>
      </div>
      {erreur && <div className="mt-3 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{erreur}</div>}
    </div>
  )
}

function AjoutCompetence() {
  const router = useRouter()
  const [libelle, setLibelle] = useState('')
  const [groupe, setGroupe] = useState('')
  const [synonymes, setSynonymes] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function ajouter() {
    setMessage(null)
    const nom = libelle.trim()
    startTransition(async () => {
      const res = await ajouterIntitule({ libelle: nom, synonymes: enListe(synonymes), groupe: groupe || null })
      if ('error' in res) {
        setMessage({ ok: false, texte: res.error })
        return
      }
      setMessage({ ok: true, texte: `« ${nom} » ajoutée au catalogue.` })
      setLibelle('')
      setSynonymes('')
      router.refresh()
    })
  }

  return (
    <Card padding="lg">
      <h2 className="text-base font-bold text-navy">Ajouter une compétence</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Libellé" htmlFor="ajout-libelle">
          <Input id="ajout-libelle" size="sm" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        </Field>
        <Field label="Rubrique" htmlFor="ajout-groupe">
          <Input id="ajout-groupe" size="sm" list={LISTE_RUBRIQUES} value={groupe} onChange={(e) => setGroupe(e.target.value)} />
        </Field>
        <Field label="Synonymes" hint="Séparés par des virgules." htmlFor="ajout-synonymes">
          <Input id="ajout-synonymes" size="sm" value={synonymes} onChange={(e) => setSynonymes(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={pending}
          disabled={libelle.trim().length < 2}
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={ajouter}
        >
          Ajouter
        </Button>
        {message && <span className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.texte}</span>}
      </div>
    </Card>
  )
}

export default function CatalogueAdminClient({ competences }: { competences: CompetenceCatalogue[] }) {
  const [recherche, setRecherche] = useState('')
  const [rubrique, setRubrique] = useState('')

  const rubriques = useMemo(
    () => Array.from(new Set(competences.map((c) => c.groupe).filter((g): g is string => !!g))).sort((a, b) => a.localeCompare(b, 'fr')),
    [competences],
  )

  const visibles = useMemo(() => {
    const mots = normaliserRecherche(recherche).split(' ').filter(Boolean)
    return competences
      .filter((c) => {
        if (rubrique === SANS_RUBRIQUE && c.groupe) return false
        if (rubrique && rubrique !== SANS_RUBRIQUE && c.groupe !== rubrique) return false
        if (mots.length === 0) return true
        const texte = normaliserRecherche([c.libelle, ...c.synonymes].join(' '))
        return mots.every((m) => texte.includes(m))
      })
      .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))
  }, [competences, recherche, rubrique])

  return (
    <div className="space-y-6">
      <datalist id={LISTE_RUBRIQUES}>
        {rubriques.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <AjoutCompetence />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            size="sm"
            className="pl-9"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans les libellés et les synonymes…"
            aria-label="Rechercher une compétence"
          />
        </div>
        <Select size="sm" fullWidth={false} value={rubrique} onChange={(e) => setRubrique(e.target.value)} aria-label="Filtrer par rubrique">
          <option value="">Toutes les rubriques</option>
          {rubriques.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
          <option value={SANS_RUBRIQUE}>Sans rubrique</option>
        </Select>
      </div>

      <Card padding="none">
        <p className="px-5 py-3 text-xs text-gray-500 border-b border-gray-100">
          {visibles.length} compétence{visibles.length !== 1 ? 's' : ''} affichée{visibles.length !== 1 ? 's' : ''} sur {competences.length}
        </p>
        <div className="divide-y divide-gray-100">
          {visibles.map((c) => (
            <LigneCompetence key={`${c.id}-${c.libelle}-${c.groupe}-${c.synonymes.join()}-${c.specialites_sm.join()}`} competence={c} />
          ))}
          {visibles.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucune compétence ne correspond.</p>}
        </div>
      </Card>
    </div>
  )
}
