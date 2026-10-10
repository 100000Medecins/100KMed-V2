'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { List, Map as IconeCarte, Navigation, Search, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Field from '@/components/ui/Field'
import Badge from '@/components/ui/Badge'
import ChoixCommune from '@/components/annuaire/ChoixCommune'
import { createClient } from '@/lib/supabase/client'
import { arrondirPosition, type Commune } from '@/lib/annuaire/geocodage'
import { normaliserRecherche } from '@/lib/annuaire/normaliser'
import { SM_SPECIALITES } from '@/lib/constants/profil'
import { MOYENS_CONTACT, RAYONS_KM, RAYON_PAR_DEFAUT_KM } from '@/lib/constants/annuaire'
import type { IntituleCatalogue } from '@/lib/actions/annuaire'
import type { Database } from '@/types/database'

export type ResultatAnnuaire = Database['public']['Functions']['annuaire_rechercher']['Returns'][number]
type Point = { lat: number; lon: number }

const CarteAnnuaire = dynamic(() => import('@/components/annuaire/CarteAnnuaire'), {
  ssr: false,
  loading: () => <div className="h-[520px] rounded-card bg-white shadow-card animate-pulse" />,
})

const PAR_PAGE = 50
/** La carte montre tout le rayon d'un coup, jusqu'à ce plafond (celui de la fonction de la base). */
const MAX_CARTE = 2000
const LIBELLES_CONTACT = new Map<string, string>(MOYENS_CONTACT.map((m) => [m.valeur, m.libelle]))

type Criteres = {
  texte: string
  specialite: string
  competence: IntituleCatalogue | null
  commune: Commune | null
  position: Point | null
  rayon: number | null
}

type Memoire = {
  lecteur: string
  criteres: Criteres
  actifs: Criteres
  resultats: ResultatAnnuaire[]
  peutPlus: boolean
  total: number | null
  carte: { cle: string; lignes: ResultatAnnuaire[] } | null
  vue: 'liste' | 'carte'
  defilement: number
}

/**
 * Dernière recherche, gardée en mémoire le temps de la visite pour la retrouver au retour d'une
 * fiche. Jamais enregistrée (ni base, ni stockage du navigateur) : perdue au rechargement.
 * Écrite seulement côté navigateur (effets, clics), jamais pendant le rendu serveur.
 */
let memoire: Memoire | null = null

function afficherDistance(km: number | null): string | null {
  if (km == null) return null
  return km < 1 ? 'moins d’1 km' : `${Math.round(km)} km`
}

/** Libellé de spécialité affiché : celui du site si le code est connu, sinon celui de l'ANS. */
function libelleSpecialite(r: { specialite: string | null; specialite_code: string | null }): string | null {
  return (r.specialite_code && SM_SPECIALITES[r.specialite_code]) || r.specialite
}

function pointDe(c: Criteres): Point | null {
  return c.commune ? { lat: c.commune.lat, lon: c.commune.lon } : c.position
}

function messageErreur(code: string | undefined): string {
  return code === '42501'
    ? 'Votre session ne permet pas de consulter l’annuaire : reconnectez-vous avec Pro Santé Connect.'
    : 'La recherche a échoué. Réessayez.'
}

export default function AnnuaireRecherche({
  lecteur,
  catalogue,
  specialites,
  communeLecteur,
  resultatsInitiaux,
  totalInitial,
  sourceVersion,
}: {
  lecteur: string
  catalogue: IntituleCatalogue[]
  specialites: { libelle: string; codes: string[] }[]
  communeLecteur: Commune | null
  resultatsInitiaux: ResultatAnnuaire[]
  totalInitial: number | null
  sourceVersion: string | null
}) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  // Au retour d'une fiche : la dernière recherche de ce lecteur ; sinon les premiers résultats,
  // calculés par le serveur autour de la commune de sa fiche.
  const [depart] = useState(() => (memoire?.lecteur === lecteur ? memoire : null))
  const criteresInitiaux: Criteres = {
    texte: '',
    specialite: '',
    competence: null,
    commune: communeLecteur,
    position: null,
    rayon: RAYON_PAR_DEFAUT_KM,
  }

  // `criteres` : le formulaire ; `actifs` : les critères des résultats affichés
  const [criteres, setCriteres] = useState<Criteres>(depart?.criteres ?? criteresInitiaux)
  const [actifs, setActifs] = useState<Criteres>(depart?.actifs ?? criteresInitiaux)
  const [saisieCompetence, setSaisieCompetence] = useState('')
  const [vue, setVue] = useState<'liste' | 'carte'>(depart?.vue ?? 'liste')

  const [resultats, setResultats] = useState<ResultatAnnuaire[]>(depart?.resultats ?? resultatsInitiaux)
  const [peutPlus, setPeutPlus] = useState(depart?.peutPlus ?? resultatsInitiaux.length === PAR_PAGE)
  const [total, setTotal] = useState<number | null>(depart ? depart.total : totalInitial)
  const [carte, setCarte] = useState<{ cle: string; lignes: ResultatAnnuaire[] } | null>(depart?.carte ?? null)
  const [chargement, setChargement] = useState(false)
  const [geolocalisation, setGeolocalisation] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Seule la réponse de la dernière recherche lancée est affichée
  const requete = useRef(0)
  const requeteCarte = useRef(0)

  const point = pointDe(criteres)
  const pointActif = pointDe(actifs)

  const parametres = useCallback(
    (c: Criteres) => {
      const p = pointDe(c)
      const equivalentes = c.competence?.specialites_sm ?? []
      return {
        p_texte: c.texte.trim() || undefined,
        p_specialites: specialites.find((s) => s.libelle === c.specialite)?.codes,
        p_intitule: c.competence?.id,
        p_specialites_equivalentes: equivalentes.length > 0 ? equivalentes : undefined,
        p_lat: p?.lat,
        p_lon: p?.lon,
        p_rayon_km: p && c.rayon ? c.rayon : undefined,
      }
    },
    [specialites],
  )
  const cleCarte = JSON.stringify(parametres(actifs))

  // Mémoire de la visite, mise à jour à chaque changement
  useEffect(() => {
    memoire = {
      lecteur,
      criteres,
      actifs,
      resultats,
      peutPlus,
      total,
      carte,
      vue,
      defilement: memoire?.lecteur === lecteur ? memoire.defilement : 0,
    }
  }, [lecteur, criteres, actifs, resultats, peutPlus, total, carte, vue])

  // Retour d'une fiche : même endroit de la liste
  useEffect(() => {
    if (depart?.defilement) requestAnimationFrame(() => window.scrollTo(0, depart.defilement))
  }, [depart])

  function ouvrirFiche(rpps: string) {
    if (memoire) memoire.defilement = window.scrollY
    router.push(`/annuaire/${rpps}`)
  }

  const suggestionsCompetence = useMemo(() => {
    const q = normaliserRecherche(saisieCompetence)
    if (!q) return []
    const mots = q.split(' ')
    return catalogue
      .filter((i) => {
        const t = normaliserRecherche([i.libelle, ...i.synonymes].join(' '))
        return mots.every((m) => t.includes(m))
      })
      .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))
      .slice(0, 8)
  }, [catalogue, saisieCompetence])

  async function lancer(c: Criteres) {
    const id = ++requete.current
    const params = parametres(c)
    setActifs(c)
    setChargement(true)
    setErreur(null)
    const [liste, compte] = await Promise.all([
      supabase.rpc('annuaire_rechercher', { ...params, p_limite: PAR_PAGE, p_decalage: 0 }),
      supabase.rpc('annuaire_compter', params),
    ])
    if (id !== requete.current) return
    setChargement(false)
    if (liste.error) {
      setErreur(messageErreur(liste.error.code))
      return
    }
    const lignes = liste.data ?? []
    setResultats(lignes)
    setPeutPlus(lignes.length === PAR_PAGE)
    setTotal(compte.error ? null : compte.data)
  }

  async function afficherPlus() {
    const id = requete.current
    setChargement(true)
    const { data, error } = await supabase.rpc('annuaire_rechercher', {
      ...parametres(actifs),
      p_limite: PAR_PAGE,
      p_decalage: resultats.length,
    })
    if (id !== requete.current) return
    setChargement(false)
    if (error) {
      setErreur(messageErreur(error.code))
      return
    }
    const lignes = data ?? []
    setResultats((precedents) => [...precedents, ...lignes])
    setPeutPlus(lignes.length === PAR_PAGE)
  }

  // Carte : tout le rayon (jusqu'à MAX_CARTE), chargé à l'affichage de la carte et à chaque recherche
  const chargementCarte = vue === 'carte' && pointActif !== null && carte?.cle !== cleCarte
  useEffect(() => {
    if (!chargementCarte) return
    const id = ++requeteCarte.current
    supabase
      .rpc('annuaire_rechercher', { ...JSON.parse(cleCarte), p_limite: MAX_CARTE })
      .then(({ data, error }) => {
        if (id !== requeteCarte.current) return
        if (error) setErreur(messageErreur(error.code))
        setCarte({ cle: cleCarte, lignes: error ? [] : (data ?? []) })
      })
  }, [chargementCarte, cleCarte, supabase])

  /** Change un critère ; les listes et le rayon relancent la recherche, le nom attend « Rechercher ». */
  function modifier(partiel: Partial<Criteres>, relancer: boolean) {
    const suivant = { ...criteres, ...partiel }
    setCriteres(suivant)
    if (relancer) lancer(suivant)
  }

  function autourDeMoi() {
    if (!('geolocation' in navigator)) {
      setErreur('Votre navigateur ne permet pas la géolocalisation : indiquez une ville ou un code postal.')
      return
    }
    setGeolocalisation(true)
    setErreur(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeolocalisation(false)
        // Arrondie à ~1 km avant tout envoi ; jamais enregistrée
        modifier(
          {
            commune: null,
            position: arrondirPosition(p.coords.latitude, p.coords.longitude),
            rayon: criteres.rayon ?? RAYON_PAR_DEFAUT_KM,
          },
          true,
        )
      },
      () => {
        setGeolocalisation(false)
        setErreur('Position non disponible : indiquez une ville ou un code postal.')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    )
  }

  function resume(): string {
    if (total === null) {
      if (resultats.length === 0) return 'Aucun confrère ne correspond.'
      return `${resultats.length}${peutPlus ? '+' : ''} confrère${resultats.length > 1 ? 's' : ''}`
    }
    if (total === 0) return 'Aucun confrère ne correspond.'
    const n = `${total.toLocaleString('fr-FR')} confrère${total > 1 ? 's' : ''}`
    if (pointActif && actifs.rayon) {
      return `${n} à moins de ${actifs.rayon} km ${actifs.commune ? `de ${actifs.commune.ville}` : 'de votre position'}`
    }
    if (pointActif) return `${n} en France, du plus proche au plus éloigné`
    return `${n}, par ordre alphabétique`
  }

  const carteIncomplete = vue === 'carte' && carte !== null && total !== null && total > carte.lignes.length

  return (
    <div className="space-y-6">
      <Card padding="lg" overflow="visible">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            lancer(criteres)
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nom" htmlFor="annuaire-nom">
              <Input
                id="annuaire-nom"
                size="sm"
                value={criteres.texte}
                onChange={(e) => modifier({ texte: e.target.value }, false)}
                placeholder="Nom ou prénom"
              />
            </Field>
            <Field label="Spécialité" htmlFor="annuaire-specialite">
              <Select
                id="annuaire-specialite"
                size="sm"
                value={criteres.specialite}
                onChange={(e) => modifier({ specialite: e.target.value }, true)}
              >
                <option value="">Toutes les spécialités</option>
                {specialites.map((s) => (
                  <option key={s.libelle} value={s.libelle}>
                    {s.libelle}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Compétence" htmlFor="annuaire-competence">
              {criteres.competence ? (
                <div className="flex items-center gap-2 rounded-button border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <span className="flex-1 truncate">{criteres.competence.libelle}</span>
                  <button
                    type="button"
                    onClick={() => modifier({ competence: null }, true)}
                    aria-label="Retirer la compétence"
                    className="rounded-full p-0.5 text-gray-400 hover:text-navy hover:bg-surface-light"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="annuaire-competence"
                    size="sm"
                    value={saisieCompetence}
                    onChange={(e) => setSaisieCompetence(e.target.value)}
                    placeholder="Échographie, endométriose…"
                    autoComplete="off"
                  />
                  {suggestionsCompetence.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full divide-y divide-gray-100 rounded-button border border-gray-200 bg-white shadow-card">
                      {suggestionsCompetence.map((i) => (
                        <li key={i.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSaisieCompetence('')
                              modifier({ competence: i }, true)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-surface-light"
                          >
                            {i.libelle}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            <Field label="Près de" htmlFor="annuaire-commune-recherche">
              <ChoixCommune
                id="annuaire-commune-recherche"
                valeur={criteres.commune}
                onChange={(c) => modifier({ commune: c, position: c ? null : criteres.position }, c !== null)}
                ariaLabel="Près de quelle commune"
              />
            </Field>
            <Field
              label="Rayon"
              htmlFor="annuaire-rayon"
              hint={point ? undefined : 'Indiquez une commune ou votre position.'}
            >
              <Select
                id="annuaire-rayon"
                size="sm"
                value={criteres.rayon ?? ''}
                disabled={!point}
                onChange={(e) => modifier({ rayon: e.target.value ? Number(e.target.value) : null }, point !== null)}
              >
                {RAYONS_KM.map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
                <option value="">Toute la France</option>
              </Select>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" size="md" loading={chargement} leftIcon={<Search className="w-4 h-4" />}>
                Rechercher
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                loading={geolocalisation}
                leftIcon={<Navigation className="w-4 h-4" />}
                onClick={autourDeMoi}
              >
                Autour de moi
              </Button>
            </div>
          </div>
          {criteres.position && !criteres.commune && (
            <p className="text-xs text-gray-400">
              Recherche autour de votre position, arrondie à environ 1 km. Elle sert à cette recherche et n&apos;est pas
              enregistrée.
            </p>
          )}
        </form>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium text-navy">{resume()}</p>
          {vue === 'liste' && pointActif && resultats.length > 0 && (
            <p className="text-xs text-gray-400">Les plus proches d&apos;abord.</p>
          )}
          {carteIncomplete && carte && (
            <p className="text-xs text-gray-500">
              La carte montre les {carte.lignes.length.toLocaleString('fr-FR')} plus proches : précisez la spécialité ou
              réduisez le rayon.
            </p>
          )}
        </div>
        <div className="flex gap-2" role="group" aria-label="Affichage">
          <Button
            type="button"
            size="sm"
            variant={vue === 'liste' ? 'secondary' : 'ghost'}
            leftIcon={<List className="w-4 h-4" />}
            onClick={() => setVue('liste')}
            aria-pressed={vue === 'liste'}
          >
            Liste
          </Button>
          <Button
            type="button"
            size="sm"
            variant={vue === 'carte' ? 'secondary' : 'ghost'}
            leftIcon={<IconeCarte className="w-4 h-4" />}
            loading={vue === 'carte' && chargementCarte}
            onClick={() => setVue('carte')}
            aria-pressed={vue === 'carte'}
          >
            Carte
          </Button>
        </div>
      </div>

      {erreur && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{erreur}</div>}

      {vue === 'carte' ? (
        pointActif ? (
          <CarteAnnuaire
            resultats={carte?.cle === cleCarte ? carte.lignes : []}
            centre={pointActif}
            rayonKm={actifs.rayon}
            onOuvrir={ouvrirFiche}
          />
        ) : (
          <Card padding="lg" className="text-center">
            <p className="text-sm text-gray-600">
              Pour centrer la carte, indiquez une commune ci-dessus ou utilisez votre position.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="mt-4"
              loading={geolocalisation}
              leftIcon={<Navigation className="w-4 h-4" />}
              onClick={autourDeMoi}
            >
              Utiliser ma position
            </Button>
            <p className="text-xs text-gray-400 mt-3">
              Position arrondie à environ 1 km, utilisée pour la recherche et jamais enregistrée.
            </p>
          </Card>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {resultats.map((r) => (
            <Link
              key={r.rpps}
              href={`/annuaire/${r.rpps}`}
              className="block"
              onClick={() => {
                if (memoire) memoire.defilement = window.scrollY
              }}
            >
              <Card padding="md" hoverable className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy truncate">
                      Dr {r.prenom} {r.nom}
                    </p>
                    {libelleSpecialite(r) && <p className="text-sm text-gray-500 truncate">{libelleSpecialite(r)}</p>}
                    {r.a_une_fiche && (
                      <Badge variant="success" size="sm" className="mt-1">
                        Fiche complétée
                      </Badge>
                    )}
                  </div>
                  {r.ville && (
                    <p className="text-xs text-gray-400 text-right flex-shrink-0">
                      {r.ville}
                      {afficherDistance(r.distance_km) && (
                        <>
                          <br />
                          {afficherDistance(r.distance_km)}
                        </>
                      )}
                    </p>
                  )}
                </div>
                {r.competences.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.competences.slice(0, 4).map((c) => (
                      <Badge key={c} variant="info" size="sm">
                        {c}
                      </Badge>
                    ))}
                    {r.competences.length > 4 && (
                      <Badge variant="neutral" size="sm">
                        +{r.competences.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
                {r.moyen_contact && (
                  <p className="mt-3 text-xs text-gray-500">Préfère : {LIBELLES_CONTACT.get(r.moyen_contact) ?? r.moyen_contact}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {vue === 'liste' && peutPlus && (
        <div className="text-center">
          <Button type="button" variant="outline" size="md" loading={chargement} onClick={afficherPlus}>
            Afficher plus
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-400">
        {sourceVersion &&
          `Source : ANS, Annuaire Santé, données du ${new Date(sourceVersion).toLocaleDateString('fr-FR')} (Licence Ouverte 2.0). `}
        Fiches complétées : informations déclarées par les médecins, non vérifiées par l&apos;association.
        L&apos;annuaire ne note ni ne classe personne : les résultats sont triés par distance, puis par ordre alphabétique.
      </p>
    </div>
  )
}
