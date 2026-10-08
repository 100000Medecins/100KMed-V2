'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
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
  loading: () => <div className="h-[480px] rounded-card bg-white shadow-card animate-pulse" />,
})

const PAR_PAGE = 50
const LIBELLES_CONTACT = new Map<string, string>(MOYENS_CONTACT.map((m) => [m.valeur, m.libelle]))

function afficherDistance(km: number | null): string | null {
  if (km == null) return null
  return km < 1 ? 'moins d’1 km' : `${Math.round(km)} km`
}

/** Libellé de spécialité affiché : celui du site si le code est connu, sinon celui de l'ANS. */
function libelleSpecialite(r: { specialite: string | null; specialite_code: string | null }): string | null {
  return (r.specialite_code && SM_SPECIALITES[r.specialite_code]) || r.specialite
}

export default function AnnuaireRecherche({
  catalogue,
  specialites,
  communeLecteur,
  resultatsInitiaux,
  sourceVersion,
}: {
  catalogue: IntituleCatalogue[]
  specialites: { libelle: string; codes: string[] }[]
  communeLecteur: Commune | null
  resultatsInitiaux: ResultatAnnuaire[]
  sourceVersion: string | null
}) {
  const supabase = useMemo(() => createClient(), [])

  const [texte, setTexte] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [competence, setCompetence] = useState<IntituleCatalogue | null>(null)
  const [saisieCompetence, setSaisieCompetence] = useState('')
  // Point de départ : la commune saisie, à défaut celle de la fiche du lecteur ; sinon la
  // géolocalisation, seulement à la demande (décision de David du 08/10).
  const [commune, setCommune] = useState<Commune | null>(communeLecteur)
  const [position, setPosition] = useState<Point | null>(null)
  const [rayon, setRayon] = useState<number | null>(RAYON_PAR_DEFAUT_KM)
  const [vue, setVue] = useState<'liste' | 'carte'>('liste')

  const [resultats, setResultats] = useState<ResultatAnnuaire[]>(resultatsInitiaux)
  const [peutPlus, setPeutPlus] = useState(resultatsInitiaux.length === PAR_PAGE)
  const [chargement, setChargement] = useState(false)
  const [geolocalisation, setGeolocalisation] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const point: Point | null = commune ? { lat: commune.lat, lon: commune.lon } : position

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

  async function lancer(options: { decalage?: number; pointForce?: Point | null; rayonForce?: number | null } = {}) {
    const decalage = options.decalage ?? 0
    const p = options.pointForce !== undefined ? options.pointForce : point
    const r = options.rayonForce !== undefined ? options.rayonForce : rayon
    // Une compétence vaut aussi pour les médecins dont c'est la spécialité RPPS (ex. Allergologie)
    const equivalentes = competence?.specialites_sm ?? []
    const codesSpecialite = specialites.find((s) => s.libelle === specialite)?.codes

    setChargement(true)
    setErreur(null)
    const { data, error } = await supabase.rpc('annuaire_rechercher', {
      p_texte: texte.trim() || undefined,
      p_specialites: codesSpecialite,
      p_intitule: competence?.id,
      p_specialites_equivalentes: equivalentes.length > 0 ? equivalentes : undefined,
      p_lat: p?.lat,
      p_lon: p?.lon,
      p_rayon_km: p && r ? r : undefined,
      p_limite: PAR_PAGE,
      p_decalage: decalage,
    })
    setChargement(false)
    if (error) {
      setErreur(
        error.code === '42501'
          ? 'Votre session ne permet pas de consulter l’annuaire : reconnectez-vous avec Pro Santé Connect.'
          : 'La recherche a échoué. Réessayez.',
      )
      return
    }
    const lignes = data ?? []
    setResultats((precedents) => (decalage > 0 ? [...precedents, ...lignes] : lignes))
    setPeutPlus(lignes.length === PAR_PAGE)
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
        const arrondie = arrondirPosition(p.coords.latitude, p.coords.longitude)
        const r = rayon ?? RAYON_PAR_DEFAUT_KM
        setCommune(null)
        setPosition(arrondie)
        setRayon(r)
        lancer({ pointForce: arrondie, rayonForce: r })
      },
      () => {
        setGeolocalisation(false)
        setErreur('Position non disponible : indiquez une ville ou un code postal.')
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    )
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" overflow="visible">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            lancer()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Nom" htmlFor="annuaire-nom">
              <Input id="annuaire-nom" size="sm" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Nom ou prénom" />
            </Field>
            <Field label="Spécialité" htmlFor="annuaire-specialite">
              <Select id="annuaire-specialite" size="sm" value={specialite} onChange={(e) => setSpecialite(e.target.value)}>
                <option value="">Toutes les spécialités</option>
                {specialites.map((s) => (
                  <option key={s.libelle} value={s.libelle}>
                    {s.libelle}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Compétence" htmlFor="annuaire-competence">
              {competence ? (
                <div className="flex items-center gap-2 rounded-button border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                  <span className="flex-1 truncate">{competence.libelle}</span>
                  <button
                    type="button"
                    onClick={() => setCompetence(null)}
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
                              setCompetence(i)
                              setSaisieCompetence('')
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
                valeur={commune}
                onChange={(c) => {
                  setCommune(c)
                  if (c) setPosition(null)
                }}
                ariaLabel="Près de quelle commune"
              />
            </Field>
            <Field label="Rayon" htmlFor="annuaire-rayon">
              <Select
                id="annuaire-rayon"
                size="sm"
                value={rayon ?? ''}
                onChange={(e) => setRayon(e.target.value ? Number(e.target.value) : null)}
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
          {position && !commune && (
            <p className="text-xs text-gray-400">
              Recherche autour de votre position, arrondie à environ 1 km. Elle sert à cette recherche et n&apos;est pas
              enregistrée.
            </p>
          )}
        </form>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500">
          {resultats.length === 0
            ? 'Aucun confrère ne correspond.'
            : `${resultats.length}${peutPlus ? '+' : ''} confrère${resultats.length > 1 ? 's' : ''}`}
        </p>
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
            onClick={() => setVue('carte')}
            aria-pressed={vue === 'carte'}
          >
            Carte
          </Button>
        </div>
      </div>

      {erreur && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{erreur}</div>}

      {vue === 'carte' ? (
        point ? (
          <CarteAnnuaire resultats={resultats} centre={point} />
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
            <Link key={r.rpps} href={`/annuaire/${r.rpps}`} className="block">
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
          <Button type="button" variant="outline" size="md" loading={chargement} onClick={() => lancer({ decalage: resultats.length })}>
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
