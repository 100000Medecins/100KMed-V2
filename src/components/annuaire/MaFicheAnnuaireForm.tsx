'use client'

import { useMemo, useState, useTransition } from 'react'
import { CheckCircle, Plus, Search, ShieldCheck, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Field from '@/components/ui/Field'
import Badge from '@/components/ui/Badge'
import { connectWithPsc } from '@/lib/auth/psc'
import { enregistrerMaFiche, proposerCompetence } from '@/lib/actions/annuaire'
import type { MaFicheAnnuaire, IntituleCatalogue } from '@/lib/actions/annuaire'
import {
  MAX_COMPETENCES,
  MOYENS_CONTACT,
  RUBRIQUES_PAR_SPECIALITE,
  TEXTE_ACCORD_PORTABLE,
  TEXTE_ACCORD_PUBLICATION,
} from '@/lib/constants/annuaire'
import { normaliserRecherche } from '@/lib/annuaire/normaliser'

const MAX_RESULTATS = 12

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function EnTete({ enregistre = false }: { enregistre?: boolean }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-navy">Ma fiche annuaire</h1>
        {enregistre && (
          <div className="flex items-center gap-1.5 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            Fiche enregistrée
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-1">
        Comment vos confrères médecins peuvent vous joindre, et pour quoi vous adresser un patient.
      </p>
    </div>
  )
}

function VerificationPsc({ userId }: { userId: string }) {
  return (
    <div>
      <EnTete />
      <Card padding="lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-navy">Vérifiez votre identité avec Pro Santé Connect</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              L&apos;annuaire est réservé aux médecins dont l&apos;identité est attestée par Pro Santé Connect.
              Connectez-vous une fois avec votre e-CPS, puis revenez sur cette page pour remplir votre fiche.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="mt-4"
              leftIcon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => connectWithPsc({ userId })}
            >
              Se connecter avec Pro Santé Connect
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

type Message = { type: 'ok' | 'info' | 'erreur'; texte: string }

const COULEUR_MESSAGE: Record<Message['type'], string> = {
  ok: 'text-green-700',
  info: 'text-navy',
  erreur: 'text-red-600',
}

function Formulaire({ initial }: { initial: MaFicheAnnuaire }) {
  const [moyenContact, setMoyenContact] = useState<string | null>(initial.moyenContact)
  const [portable, setPortable] = useState(initial.portable)
  const [portableVisible, setPortableVisible] = useState(initial.portableVisible)
  const [publiee, setPubliee] = useState(initial.publiee)
  const [publieeLe, setPublieeLe] = useState(initial.publieeLe)
  const [miseAJour, setMiseAJour] = useState(initial.miseAJour)
  const [selection, setSelection] = useState<string[]>(initial.competences)
  const [catalogue, setCatalogue] = useState<IntituleCatalogue[]>(initial.catalogue)
  const [recherche, setRecherche] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enregistre, setEnregistre] = useState(false)
  const [enregistrement, startEnregistrement] = useTransition()
  const [proposition, startProposition] = useTransition()

  function modifie() {
    setEnregistre(false)
    setErreur(null)
  }

  const parId = useMemo(() => new Map(catalogue.map((i) => [i.id, i])), [catalogue])

  // Intitulé qui reprend la spécialité RPPS du médecin : inutile, on ne le propose pas.
  const masques = useMemo(
    () => new Set(catalogue.filter((i) => i.specialites_sm.some((c) => initial.codesSm.includes(c))).map((i) => i.id)),
    [catalogue, initial.codesSm],
  )

  const index = useMemo(
    () =>
      catalogue.map((i) => ({
        intitule: i,
        libelle: normaliserRecherche(i.libelle),
        synonymes: i.synonymes.map(normaliserRecherche),
        texte: normaliserRecherche([i.libelle, ...i.synonymes].join(' ')),
      })),
    [catalogue],
  )

  const q = normaliserRecherche(recherche)

  const resultats = useMemo(() => {
    if (!q) return []
    const mots = q.split(' ')
    const choisies = new Set(selection)
    return index
      .filter((x) => !choisies.has(x.intitule.id) && !masques.has(x.intitule.id) && mots.every((m) => x.texte.includes(m)))
      .sort(
        (a, b) =>
          Number(b.libelle.startsWith(q)) - Number(a.libelle.startsWith(q)) ||
          a.intitule.libelle.localeCompare(b.intitule.libelle, 'fr'),
      )
      .slice(0, MAX_RESULTATS)
      .map((x) => x.intitule)
  }, [q, index, masques, selection])

  const correspondanceExacte = q !== '' && index.some((x) => x.libelle === q || x.synonymes.includes(q))

  const suggestions = useMemo(() => {
    const rubriques = new Set(initial.codesSm.flatMap((c) => RUBRIQUES_PAR_SPECIALITE[c] ?? []))
    return catalogue
      .filter((i) => i.groupe && rubriques.has(i.groupe) && !selection.includes(i.id) && !masques.has(i.id))
      .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))
  }, [catalogue, initial.codesSm, selection, masques])

  const selectionnees = selection
    .map((id) => parId.get(id))
    .filter((i): i is IntituleCatalogue => !!i)
    .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))

  function ajouter(id: string) {
    if (selection.includes(id)) return
    if (selection.length >= MAX_COMPETENCES) {
      setMessage({ type: 'erreur', texte: `Une fiche compte au plus ${MAX_COMPETENCES} compétences.` })
      return
    }
    modifie()
    setMessage(null)
    setSelection((s) => [...s, id])
    setRecherche('')
  }

  function retirer(id: string) {
    modifie()
    setMessage(null)
    setSelection((s) => s.filter((x) => x !== id))
  }

  function proposer() {
    const saisie = recherche.trim()
    setMessage(null)
    startProposition(async () => {
      const res = await proposerCompetence(saisie)
      if ('error' in res) {
        setMessage({ type: 'erreur', texte: res.error })
      } else if ('existant' in res) {
        if (masques.has(res.existant.id)) {
          setMessage({ type: 'info', texte: `« ${res.existant.libelle} » correspond à votre spécialité, qui figure déjà sur votre fiche.` })
        } else {
          if (!parId.has(res.existant.id)) setCatalogue((c) => [...c, res.existant])
          ajouter(res.existant.id)
          setMessage({ type: 'info', texte: `« ${res.existant.libelle} » existe déjà : ajoutée à vos compétences.` })
        }
      } else {
        setCatalogue((c) => [...c, res.intitule])
        setSelection((s) => [...s, res.intitule.id])
        setRecherche('')
        setMessage({
          type: 'ok',
          texte: `Proposition envoyée : « ${res.intitule.libelle} » reste marquée « en attente » jusqu'à sa validation par l'association.`,
        })
      }
    })
  }

  function enregistrer() {
    setErreur(null)
    startEnregistrement(async () => {
      const res = await enregistrerMaFiche({ moyenContact, portable, portableVisible, publiee, competences: selection })
      if ('error' in res) {
        setErreur(res.error)
        return
      }
      setPublieeLe(res.publieeLe)
      setMiseAJour(res.miseAJour)
      setPortable(res.portable)
      setEnregistre(true)
    })
  }

  const choixContact: { valeur: string | null; libelle: string }[] = [
    ...MOYENS_CONTACT,
    { valeur: null, libelle: 'Pas de préférence' },
  ]

  return (
    <div>
      <EnTete enregistre={enregistre} />

      <div className="mb-6 rounded-card border border-accent-blue/20 bg-accent-blue/5 p-4 text-sm text-navy">
        L&apos;annuaire n&apos;est pas encore ouvert : pour l&apos;instant, votre fiche n&apos;est visible de personne.
      </div>

      <div className="space-y-6">
        <Card padding="lg">
          <fieldset>
            <legend className="text-base font-bold text-navy">Moyen de contact préféré</legend>
            <p className="text-sm text-gray-500 mt-1">Comment préférez-vous qu&apos;un confrère vous contacte ?</p>
            <div className="mt-4 space-y-2">
              {choixContact.map((m) => (
                <label key={m.valeur ?? 'aucun'} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="moyen_contact"
                    checked={moyenContact === m.valeur}
                    onChange={() => {
                      modifie()
                      setMoyenContact(m.valeur)
                    }}
                    className="w-4 h-4 accent-accent-blue"
                  />
                  {m.libelle}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card padding="lg">
          <h2 className="text-base font-bold text-navy">Téléphone portable</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Masqué par défaut. S&apos;il est visible, il ne figure jamais dans une liste ni dans un fichier : un confrère
            doit ouvrir votre fiche et demander à l&apos;afficher, dans la limite d&apos;un nombre de consultations par
            jour, et chaque affichage est enregistré.
          </p>
          <Field label="Numéro de portable" hint="Exemple : 06 12 34 56 78" htmlFor="annuaire-portable" className="mt-4 max-w-xs">
            <Input
              id="annuaire-portable"
              type="tel"
              autoComplete="tel"
              value={portable}
              placeholder="06 12 34 56 78"
              onChange={(e) => {
                modifie()
                setPortable(e.target.value)
                if (!e.target.value.trim()) setPortableVisible(false)
              }}
            />
          </Field>
          <label className={`mt-4 flex items-start gap-3 text-sm ${portable.trim() ? 'text-gray-700 cursor-pointer' : 'text-gray-400'}`}>
            <input
              type="checkbox"
              checked={portableVisible}
              disabled={!portable.trim()}
              onChange={(e) => {
                modifie()
                setPortableVisible(e.target.checked)
              }}
              className="mt-0.5 w-4 h-4 accent-accent-blue"
            />
            <span>{TEXTE_ACCORD_PORTABLE}</span>
          </label>
        </Card>

        <Card padding="lg" overflow="visible">
          <h2 className="text-base font-bold text-navy">
            Compétences{' '}
            <span className="text-sm font-normal text-gray-400">
              {selection.length}/{MAX_COMPETENCES}
            </span>
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Ce pour quoi un confrère peut vous adresser un patient : techniques, domaines, pathologies.
            Inutile de reprendre votre spécialité{initial.specialite ? ` (${initial.specialite})` : ''}, elle figure déjà sur votre fiche.
          </p>

          {selectionnees.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectionnees.map((i) => (
                <Badge
                  key={i.id}
                  variant="info"
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => retirer(i.id)}
                      aria-label={`Retirer ${i.libelle}`}
                      className="-mr-1 rounded-full p-0.5 hover:bg-accent-blue/20"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  }
                >
                  {i.libelle}
                  {i.statut === 'propose' && (
                    <Badge variant="warning" size="sm">
                      en attente
                    </Badge>
                  )}
                </Badge>
              ))}
            </div>
          )}

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              size="sm"
              className="pl-9"
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value)
                setMessage(null)
              }}
              placeholder="Rechercher : échographie, endométriose, sommeil…"
              aria-label="Rechercher une compétence"
            />
          </div>

          {q && (
            <ul className="mt-2 divide-y divide-gray-100 rounded-button border border-gray-200">
              {resultats.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => ajouter(i.id)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-surface-light flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      {i.libelle}
                      {i.statut === 'propose' && (
                        <Badge variant="warning" size="sm">
                          en attente
                        </Badge>
                      )}
                    </span>
                    {i.groupe && <span className="text-xs text-gray-400 text-right">{i.groupe}</span>}
                  </button>
                </li>
              ))}
              {resultats.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400">Aucune compétence ne correspond.</li>
              )}
            </ul>
          )}

          {q && !correspondanceExacte && recherche.trim().length >= 2 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              leftIcon={<Plus className="w-4 h-4" />}
              loading={proposition}
              onClick={proposer}
            >
              Proposer « {recherche.trim()} »
            </Button>
          )}

          {!q && suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Suggestions pour votre spécialité</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((i) => (
                  <Badge key={i.id} variant="neutral" onClick={() => ajouter(i.id)} leftIcon={<Plus className="w-3 h-3" />}>
                    {i.libelle}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {message && <p className={`mt-3 text-sm ${COULEUR_MESSAGE[message.type]}`}>{message.texte}</p>}

          <p className="mt-4 text-xs text-gray-400 max-w-xl">
            Compétences déclarées par vous, non vérifiées par l&apos;association : ni un titre, ni une qualification
            reconnue par l&apos;Ordre. Un intitulé manquant peut être proposé ; l&apos;association l&apos;accepte, le
            reformule ou le refuse.
          </p>
        </Card>

        <Card padding="lg">
          <h2 className="text-base font-bold text-navy">Publication</h2>
          <label className="mt-3 flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={publiee}
              onChange={(e) => {
                modifie()
                setPubliee(e.target.checked)
              }}
              className="mt-0.5 w-4 h-4 accent-accent-blue"
            />
            <span>{TEXTE_ACCORD_PUBLICATION}</span>
          </label>
          <p className="mt-2 text-xs text-gray-400">
            {publiee && publieeLe ? `Accord donné le ${formaterDate(publieeLe)}. ` : ''}
            Vous pouvez retirer votre fiche à tout moment en décochant cette case.
          </p>
        </Card>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button type="button" variant="primary" size="md" loading={enregistrement} onClick={enregistrer}>
            Enregistrer ma fiche
          </Button>
          {miseAJour && <span className="text-xs text-gray-400">Dernière mise à jour : {formaterDate(miseAJour)}</span>}
        </div>
        {erreur && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{erreur}</div>}
      </div>
    </div>
  )
}

export default function MaFicheAnnuaireForm({ initial }: { initial: MaFicheAnnuaire }) {
  if (!initial.verifie) return <VerificationPsc userId={initial.userId} />
  return <Formulaire initial={initial} />
}
