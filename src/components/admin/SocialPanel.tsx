'use client'

import { useState } from 'react'
import { Send, Clock, ChevronDown, ChevronUp, Sparkles, X, AlertCircle, Globe, CalendarX, Loader2, Film } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import FichiersVideoReseaux from '@/components/admin/FichiersVideoReseaux'
import { publishArticle } from '@/lib/actions/admin'
import {
  annulerProgrammation,
  enregistrerPost,
  envoyerMaintenant,
  genererBrouillons,
  programmerPost,
  supprimerPost,
} from '@/lib/actions/posts-reseaux'
import { RESEAUX, formatDuReseau, type FichierVideo, type MediaPost, type PostReseau, type Reseau } from '@/lib/reseaux/types'

const NETWORK_LABELS: Record<Reseau, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
}

const NETWORK_COLORS: Record<Reseau, string> = {
  linkedin: 'bg-[#0A66C2] text-white',
  facebook: 'bg-[#1877F2] text-white',
  instagram: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white',
}

function NetworkIcon({ network }: { network: Reseau }) {
  if (network === 'linkedin') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
  if (network === 'facebook') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  )
}

const NETWORK_LIMITS: Record<Reseau, number> = {
  linkedin: 3000,
  facebook: 2000,
  instagram: 2200,
}

const OPTIMAL_HOURS: Record<Reseau, number> = {
  linkedin: 9,
  facebook: 12,
  instagram: 11,
}

/** Prochain jour ouvré à l'heure donnée (heure locale du navigateur), en ISO. */
function creneauSuggere(heure: number): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  if (d.getDay() === 6) d.setDate(d.getDate() + 2)
  d.setHours(heure, 0, 0, 0)
  return d.toISOString()
}

/** ISO → valeur d'un champ datetime-local, en heure locale. */
function versSaisie(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function dateLisible(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Contenu à promouvoir : un article du blog ou une vidéo YouTube de la rubrique Vidéos. */
export type SourcePublication = {
  type: 'article' | 'video'
  id: string
  titre: string
  resume?: string | null // chapeau de l'article, description de la vidéo
  lien?: string // page de l'article, ou vidéo YouTube
  image?: string | null // couverture de l'article, vignette de la vidéo
  statut?: string | null // article seulement : « publié » ou non
}

interface Props {
  source: SourcePublication
  postsInitiaux: PostReseau[]
  programmationActive: boolean // tâche planifiée en place ; sinon envoi immédiat seulement
  fichiersInitiaux?: FichierVideo[] // vidéo seulement : fichiers déposés pour la publication native
}

type Resultat = { posts: PostReseau[]; error?: string }

export default function SocialPanel({ source, postsInitiaux, programmationActive, fichiersInitiaux = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [posts, setPosts] = useState<PostReseau[]>(postsInitiaux)
  const [fichiers, setFichiers] = useState<FichierVideo[]>(fichiersInitiaux)
  // Saisies en cours (texte, créneau) par post, enregistrées à la sortie du champ.
  const [textes, setTextes] = useState<Record<string, string>>({})
  const [creneaux, setCreneaux] = useState<Record<string, string>>({})
  const [occupe, setOccupe] = useState<string | null>(null) // id du post, ou « generer »
  const [erreur, setErreur] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  // Une vidéo pointe vers YouTube : sa publication sur le site n'a pas d'effet sur l'aperçu du lien.
  const [isPublished, setIsPublished] = useState(source.type !== 'article' || source.statut === 'publié')

  const ordre = (p: PostReseau) => RESEAUX.indexOf(p.reseau as Reseau)
  const actifs = posts.filter((p) => p.statut !== 'envoye').sort((a, b) => ordre(a) - ordre(b))
  const envoyes = posts.filter((p) => p.statut === 'envoye')
  const nbProgrammes = posts.filter((p) => p.statut === 'programme').length

  const texteDe = (p: PostReseau) => textes[p.id] ?? p.texte
  const creneauDe = (p: PostReseau) => creneaux[p.id] ?? versSaisie(p.programme_le)
  // Fichier que le réseau publierait (vertical pour Instagram, horizontal pour Facebook) ; rien pour un article.
  const formatDe = (p: PostReseau) => (source.type === 'video' ? formatDuReseau(p.reseau) : null)
  const fichierDepose = (p: PostReseau) => fichiers.some((f) => f.format === formatDe(p))
  // Instagram en image exige une image ; en vidéo, le fichier suffit.
  const sansImageDe = (p: PostReseau) => p.reseau === 'instagram' && p.media !== 'video' && !source.image

  async function executer(cle: string, action: () => Promise<Resultat>) {
    setOccupe(cle)
    setErreur(null)
    try {
      const r = await action()
      setPosts(r.posts)
      if (r.error) setErreur(r.error)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setOccupe(null)
    }
  }

  async function handlePublish() {
    setIsPublishing(true)
    const result = await publishArticle(source.id)
    if (!result?.error) setIsPublished(true)
    setIsPublishing(false)
  }

  function generer() {
    if (actifs.some((p) => p.statut === 'brouillon') && !confirm('Remplacer les brouillons actuels par de nouveaux messages ?')) return
    const suggestions = Object.fromEntries(RESEAUX.map((r) => [r, creneauSuggere(OPTIMAL_HOURS[r])])) as Record<Reseau, string>
    executer('generer', async () => {
      const r = await genererBrouillons({ type: source.type, id: source.id, titre: source.titre, resume: source.resume, lien: source.lien }, suggestions)
      setTextes({})
      setCreneaux({})
      return r
    })
  }

  // Sauvegarde discrète à la sortie d'un champ, pour que l'autre personne voie le brouillon à jour.
  async function sauver(p: PostReseau) {
    const texte = textes[p.id]
    const saisie = creneaux[p.id]
    if (texte === undefined && saisie === undefined) return
    try {
      const r = await enregistrerPost(p.id, {
        ...(texte !== undefined ? { texte } : {}),
        ...(saisie !== undefined ? { programmeLe: saisie ? new Date(saisie).toISOString() : null } : {}),
      })
      setPosts(r.posts)
    } catch {
      // L'envoi ou la programmation enregistrent de toute façon le texte affiché.
    }
  }

  function programmer(p: PostReseau) {
    const saisie = creneauDe(p)
    if (!saisie) {
      setErreur('Choisissez une date de publication.')
      return
    }
    executer(p.id, () => programmerPost(p.id, texteDe(p), new Date(saisie).toISOString()))
  }

  function choisirMedia(p: PostReseau, media: MediaPost) {
    if (p.media !== media) executer(p.id, () => enregistrerPost(p.id, { media }))
  }

  function programmerTout() {
    const brouillons = actifs.filter((p) => p.statut === 'brouillon' && creneauDe(p) && !sansImageDe(p))
    executer('tout', async () => {
      let dernier: Resultat = { posts }
      for (const p of brouillons) {
        dernier = await programmerPost(p.id, texteDe(p), new Date(creneauDe(p)).toISOString())
        if (dernier.error) break
      }
      return dernier
    })
  }

  return (
    <Card padding="none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-light transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Send className="w-4 h-4 text-accent-blue" />
          <span className="font-semibold text-navy text-sm">Publier sur les réseaux</span>
          {nbProgrammes > 0 && <Badge variant="info" size="sm">{nbProgrammes} programmé{nbProgrammes > 1 ? 's' : ''}</Badge>}
          {envoyes.length > 0 && <Badge variant="success" size="sm">{envoyes.length} transmis</Badge>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 py-5 space-y-5">

          {/* Article non publié */}
          {!isPublished && (
            <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-button px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>L&apos;article n&apos;est pas encore publié.</strong> Publie-le avant l&apos;envoi pour que la vignette de lien s&apos;affiche correctement sur LinkedIn et Facebook.
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handlePublish} loading={isPublishing} leftIcon={<Globe className="w-3.5 h-3.5" />}>
                Publier
              </Button>
            </div>
          )}

          {/* Instagram sans image (ni fichier vertical à publier à la place) */}
          {!source.image && !fichiers.some((f) => f.format === 'vertical') && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-button px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                {source.type === 'article' ? "Cet article n'a pas d'image de couverture." : "Cette vidéo n'a pas de vignette."} Instagram requiert une image : le post Instagram ne pourra pas partir.
              </p>
            </div>
          )}

          {!programmationActive && (
            <p className="text-xs text-gray-500">La programmation n&apos;est pas encore activée : les posts partent avec « Envoyer maintenant ».</p>
          )}

          {source.type === 'video' && (
            <FichiersVideoReseaux
              videoId={source.id}
              fichiers={fichiers}
              onChange={(etat) => {
                setFichiers(etat.fichiers)
                setPosts(etat.posts)
              }}
            />
          )}

          {erreur && <p className="text-xs text-red-600">{erreur}</p>}

          {/* Génération */}
          {actifs.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                {envoyes.length > 0
                  ? 'Préparer une nouvelle série de messages (les envois précédents restent dans l’historique).'
                  : `Génère 3 messages adaptés à chaque réseau, puis ${programmationActive ? 'programme leur publication' : 'envoie-les'}.`}
              </p>
              <Button type="button" variant="secondary" size="md" onClick={generer} loading={occupe === 'generer'} leftIcon={<Sparkles className="w-4 h-4" />}>
                {occupe === 'generer' ? 'Génération en cours…' : envoyes.length > 0 ? 'Préparer de nouveaux messages' : 'Générer les 3 messages'}
              </Button>
            </div>
          )}

          {/* Posts en préparation, programmés ou en erreur */}
          {actifs.map((p) => {
            const reseau = p.reseau as Reseau
            const texte = texteDe(p)
            const limite = NETWORK_LIMITS[reseau]
            const tropLong = texte.length > limite
            const sansImage = sansImageDe(p)
            const format = formatDe(p)
            const modifiable = p.statut === 'brouillon' || p.statut === 'erreur'
            const pending = occupe === p.id || occupe === 'tout'

            return (
              <div key={p.id} className={`rounded-card border p-4 space-y-3 ${p.statut === 'programme' ? 'border-accent-blue/30 bg-accent-blue/5' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-button ${NETWORK_COLORS[reseau]}`}>
                    <NetworkIcon network={reseau} />
                    {NETWORK_LABELS[reseau]}
                  </span>
                  <div className="flex items-center gap-2">
                    {!modifiable && p.media === 'video' && <Badge variant="neutral" size="sm" leftIcon={<Film className="w-3 h-3" />}>Vidéo</Badge>}
                    {p.statut === 'programme' && <Badge variant="info" size="sm" leftIcon={<Clock className="w-3 h-3" />}>Programmé {dateLisible(p.programme_le)}</Badge>}
                    {p.statut === 'en_cours' && <Badge variant="neutral" size="sm" leftIcon={<Loader2 className="w-3 h-3 animate-spin" />}>Envoi en cours</Badge>}
                    {p.statut === 'erreur' && <Badge variant="danger" size="sm">Échec de l&apos;envoi</Badge>}
                    {p.statut !== 'en_cours' && (
                      <button
                        type="button"
                        onClick={() => confirm(`Supprimer le post ${NETWORK_LABELS[reseau]} ?`) && executer(p.id, () => supprimerPost(p.id))}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                        aria-label="Supprimer ce post"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {p.statut === 'erreur' && p.erreur && <p className="text-xs text-red-600">{p.erreur}</p>}

                {modifiable ? (
                  <>
                    {format && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-500">Publier</span>
                        <Button type="button" variant={p.media === 'video' ? 'ghost' : 'secondary'} size="sm" aria-pressed={p.media !== 'video'} onClick={() => choisirMedia(p, 'image')} disabled={pending}>
                          Image
                        </Button>
                        <Button type="button" variant={p.media === 'video' ? 'secondary' : 'ghost'} size="sm" aria-pressed={p.media === 'video'} onClick={() => choisirMedia(p, 'video')} disabled={pending || !fichierDepose(p)} leftIcon={<Film className="w-3.5 h-3.5" />}>
                          Vidéo
                        </Button>
                        {!fichierDepose(p) && <span className="text-xs text-gray-400">Déposez le fichier {format} pour publier la vidéo.</span>}
                      </div>
                    )}

                    <div>
                      <Textarea
                        size="sm"
                        rows={5}
                        value={texte}
                        onChange={(e) => setTextes((t) => ({ ...t, [p.id]: e.target.value }))}
                        onBlur={() => sauver(p)}
                        error={tropLong}
                      />
                      <p className={`text-xs mt-1 text-right ${tropLong ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                        {texte.length} / {limite}
                      </p>
                    </div>

                    {programmationActive && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2">
                          <Clock className="w-3.5 h-3.5" /> Date de publication
                        </label>
                        <Input
                          size="sm"
                          type="datetime-local"
                          value={creneauDe(p)}
                          onChange={(e) => setCreneaux((c) => ({ ...c, [p.id]: e.target.value }))}
                          onBlur={() => sauver(p)}
                        />
                      </div>
                    )}

                    {sansImage && (
                      <p className="text-xs text-red-600 font-medium">Image obligatoire pour Instagram. Ajoutez-en une avant d&apos;envoyer.</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {programmationActive && (
                        <Button type="button" variant="primary" size="sm" onClick={() => programmer(p)} loading={pending} disabled={tropLong || sansImage} leftIcon={<Clock className="w-3.5 h-3.5" />}>
                          Programmer
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant={programmationActive ? 'ghost' : 'primary'}
                        size="sm"
                        onClick={() => confirm(`Envoyer le post ${NETWORK_LABELS[reseau]} maintenant ?`) && executer(p.id, () => envoyerMaintenant(p.id, texte))}
                        disabled={pending || tropLong || sansImage}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                      >
                        Envoyer maintenant
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{p.texte}</p>
                    {p.statut === 'programme' && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => executer(p.id, () => annulerProgrammation(p.id))} loading={pending} leftIcon={<CalendarX className="w-3.5 h-3.5" />}>
                        Annuler la programmation
                      </Button>
                    )}
                  </>
                )}
              </div>
            )
          })}

          {programmationActive && actifs.filter((p) => p.statut === 'brouillon').length > 1 && (
            <Button type="button" variant="primary" size="md" fullWidth onClick={programmerTout} loading={occupe === 'tout'} leftIcon={<Clock className="w-4 h-4" />}>
              Programmer tous les brouillons
            </Button>
          )}

          {actifs.some((p) => p.statut === 'brouillon') && (
            <button type="button" onClick={generer} disabled={occupe !== null} className="text-xs text-gray-400 hover:text-gray-600 underline">
              Regénérer les brouillons
            </button>
          )}

          {/* Historique */}
          {envoyes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transmis à Make</p>
              {envoyes.map((p) => (
                <details key={p.id} className="rounded-button border border-gray-100 px-4 py-2.5">
                  <summary className="flex items-center gap-2 text-sm cursor-pointer">
                    <span className="font-medium text-navy">{NETWORK_LABELS[p.reseau as Reseau]}</span>
                    <span className="text-xs text-gray-400">{dateLisible(p.envoye_le)}{p.media === 'video' ? ' · vidéo' : ''}</span>
                  </summary>
                  <p className="text-sm text-gray-600 whitespace-pre-line mt-2">{p.texte}</p>
                </details>
              ))}
              <p className="text-xs text-gray-400">« Transmis » : reçu par Make. La publication elle-même se vérifie dans l&apos;historique du scénario Make.</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
