'use client'

import { useRef, useState } from 'react'
import { Film, Trash2, Upload, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { confirmerDepot, preparerDepot, supprimerFichier } from '@/lib/actions/videos-fichiers'
import { FORMATS, POIDS_MAX, TYPES_VIDEO, type FichierVideo, type FormatFichier, type PostReseau } from '@/lib/reseaux/types'

const EMPLACEMENTS: Record<FormatFichier, { titre: string; usage: string }> = {
  vertical: { titre: 'Fichier vertical', usage: 'Reel Instagram' },
  horizontal: { titre: 'Fichier horizontal', usage: 'Vidéo Facebook' },
}

// Bornes de durée d'un Reel (Meta).
const DUREE_MIN_S = 3
const DUREE_MAX_S = 15 * 60

function poids(octets: number): string {
  return `${Math.round(octets / (1024 * 1024))} Mo`
}

/** Type du fichier ; l'extension fait foi quand le navigateur ne l'annonce pas (certains .mov). */
function typeDe(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext === 'mp4' ? 'video/mp4' : ext === 'mov' ? 'video/quicktime' : ''
}

/** Dimensions et durée lues par le navigateur, ou null s'il ne sait pas lire ce fichier (MOV en HEVC). */
function lireVideo(file: File): Promise<{ largeur: number; hauteur: number; duree: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const adresse = URL.createObjectURL(file)
    const finir = (r: { largeur: number; hauteur: number; duree: number } | null) => {
      clearTimeout(delai)
      URL.revokeObjectURL(adresse)
      resolve(r)
    }
    const delai = setTimeout(() => finir(null), 8000)
    video.preload = 'metadata'
    video.onloadedmetadata = () => finir(video.videoWidth ? { largeur: video.videoWidth, hauteur: video.videoHeight, duree: video.duration } : null)
    video.onerror = () => finir(null)
    video.src = adresse
  })
}

/** Refus avant dépôt : mauvais type, trop lourd, mauvais sens, durée hors bornes. */
async function refus(file: File, format: FormatFichier): Promise<string | null> {
  if (!TYPES_VIDEO.includes(typeDe(file))) return 'Format non accepté : déposez un fichier MP4 ou MOV.'
  if (file.size > POIDS_MAX[format]) return `Fichier trop lourd (${poids(file.size)}) : ${poids(POIDS_MAX[format])} au plus.`
  const video = await lireVideo(file)
  if (!video) return null
  const vertical = video.hauteur > video.largeur
  if (format === 'vertical' && !vertical) return `Ce fichier est horizontal (${video.largeur} × ${video.hauteur}) : déposez-le dans l'autre emplacement.`
  if (format === 'horizontal' && vertical) return `Ce fichier est vertical (${video.largeur} × ${video.hauteur}) : déposez-le dans l'autre emplacement.`
  if (format === 'vertical' && (video.duree < DUREE_MIN_S || video.duree > DUREE_MAX_S)) return 'Un Reel dure entre 3 secondes et 15 minutes.'
  return null
}

/** PUT du fichier vers l'adresse de dépôt signée, avec progression (fetch ne la donne pas). */
function deposer(adresse: string, file: File, type: string, surProgression: (pourcent: number) => void, envoi: { xhr: XMLHttpRequest | null }): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    envoi.xhr = xhr
    xhr.open('PUT', adresse)
    xhr.setRequestHeader('content-type', type)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => e.lengthComputable && surProgression(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Le stockage a refusé le fichier (${xhr.status}).`)))
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant le dépôt : recommencez.'))
    xhr.onabort = () => reject(new Error('Dépôt annulé.'))
    xhr.send(file)
  })
}

interface Props {
  videoId: string
  fichiers: FichierVideo[]
  /** Fichiers et posts à jour après un dépôt ou une suppression (un dépôt passe le brouillon concerné en vidéo). */
  onChange: (etat: { fichiers: FichierVideo[]; posts: PostReseau[] }) => void
}

export default function FichiersVideoReseaux({ videoId, fichiers, onChange }: Props) {
  const [progression, setProgression] = useState<Partial<Record<FormatFichier, number>>>({})
  const [erreurs, setErreurs] = useState<Partial<Record<FormatFichier, string>>>({})
  const [suppression, setSuppression] = useState<FormatFichier | null>(null)
  const envois = useRef<Record<FormatFichier, { xhr: XMLHttpRequest | null }>>({ vertical: { xhr: null }, horizontal: { xhr: null } })
  const champs = useRef<Partial<Record<FormatFichier, HTMLInputElement | null>>>({})

  const erreur = (format: FormatFichier, message?: string) => setErreurs((e) => ({ ...e, [format]: message }))
  const avance = (format: FormatFichier, pourcent?: number) => setProgression((p) => ({ ...p, [format]: pourcent }))

  async function choisir(format: FormatFichier, file: File | undefined) {
    if (!file) return
    erreur(format)
    avance(format, 0)
    try {
      const motif = await refus(file, format)
      if (motif) throw new Error(motif)
      const type = typeDe(file)
      const depot = await preparerDepot(videoId, format, { taille: file.size, type })
      if ('error' in depot) throw new Error(depot.error)
      await deposer(depot.adresse, file, type, (pourcent) => avance(format, pourcent), envois.current[format])
      const etat = await confirmerDepot(videoId, format, depot.chemin, file.name)
      onChange(etat)
      if (etat.error) throw new Error(etat.error)
    } catch (e) {
      erreur(format, e instanceof Error ? e.message : 'Dépôt impossible.')
    } finally {
      avance(format)
      envois.current[format].xhr = null
      const champ = champs.current[format]
      if (champ) champ.value = ''
    }
  }

  async function supprimer(format: FormatFichier) {
    if (!confirm(`Supprimer le ${EMPLACEMENTS[format].titre.toLowerCase()} ?`)) return
    erreur(format)
    setSuppression(format)
    try {
      const etat = await supprimerFichier(videoId, format)
      onChange(etat)
      if (etat.error) erreur(format, etat.error)
    } catch (e) {
      erreur(format, e instanceof Error ? e.message : 'Suppression impossible.')
    } finally {
      setSuppression(null)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-navy">Fichiers vidéo</p>
        <p className="text-xs text-gray-500">
          Pour publier la vidéo elle-même sur Instagram et Facebook, au lieu d&apos;un lien YouTube. MP4 ou MOV. Les fichiers sont effacés automatiquement une semaine après la publication.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FORMATS.map((format) => {
          const fichier = fichiers.find((f) => f.format === format)
          const pourcent = progression[format]
          const enCours = pourcent !== undefined

          return (
            <div key={format} className="rounded-card border border-gray-200 p-4 space-y-2">
              <div>
                <p className="text-sm font-medium text-navy">{EMPLACEMENTS[format].titre}</p>
                <p className="text-xs text-gray-500">{EMPLACEMENTS[format].usage} · {poids(POIDS_MAX[format])} au plus</p>
              </div>

              <input
                ref={(el) => { champs.current[format] = el }}
                type="file"
                accept="video/mp4,video/quicktime,.mp4,.mov"
                className="hidden"
                onChange={(e) => choisir(format, e.target.files?.[0])}
              />

              {enCours ? (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={pourcent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-accent-blue transition-all" style={{ width: `${pourcent}%` }} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">{pourcent < 100 ? `Dépôt en cours : ${pourcent} %. Restez sur cette page.` : 'Vérification du fichier…'}</p>
                    {pourcent < 100 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => envois.current[format].xhr?.abort()} leftIcon={<X className="w-3.5 h-3.5" />}>
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {fichier && (
                    <p className="flex items-start gap-2 text-xs text-gray-600">
                      <Film className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent-blue" />
                      <span className="break-all">
                        {fichier.nom_origine ?? 'Fichier déposé'} · {poids(fichier.taille)} · déposé le {new Date(fichier.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={fichier ? 'ghost' : 'secondary'} size="sm" onClick={() => champs.current[format]?.click()} disabled={suppression === format} leftIcon={<Upload className="w-3.5 h-3.5" />}>
                      {fichier ? 'Remplacer' : 'Déposer un fichier'}
                    </Button>
                    {fichier && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => supprimer(format)} loading={suppression === format} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                        Supprimer
                      </Button>
                    )}
                  </div>
                </>
              )}

              {erreurs[format] && <p className="text-xs text-red-600">{erreurs[format]}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
