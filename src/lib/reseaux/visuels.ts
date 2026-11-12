/**
 * Visuels Instagram enregistrés par le studio (table `visuels_reseaux`, bucket public
 * `visuels-reseaux`, un fichier `{article_id}/{format}-{horodatage}.jpg` par format).
 * Types et contrôle des réglages, communs au navigateur et au serveur.
 */

import { LOGO_MAX, LOGO_MIN, TONALITES, ZOOM_MAX, type FormatId, type PositionTexte } from './gabarit'

export const BUCKET_VISUELS = 'visuels-reseaux'
/** Plafond d'Instagram pour une image, repris par le bucket. */
export const POIDS_MAX_VISUEL = 8 * 1024 * 1024
export const FORMATS_VISUEL: FormatId[] = ['post', 'story']

export const estFormatVisuel = (f: string): f is FormatId => (FORMATS_VISUEL as string[]).includes(f)

/** Photo du visuel : la couverture de l'article (par son adresse) ou un fichier importé (par son nom). */
export type PhotoVisuel = { source: 'couverture'; url: string } | { source: 'import'; nom: string }

export const memePhoto = (a: PhotoVisuel, b: PhotoVisuel): boolean =>
  a.source === 'couverture' ? b.source === 'couverture' && a.url === b.url : b.source === 'import' && a.nom === b.nom

/**
 * Réglages qui permettent de rouvrir le studio là où on l'avait laissé. Le cadrage est en
 * fractions de la photo (cx et cy entre 0 et 1) : il reste juste si la photo se recharge à une
 * autre taille (grande version indisponible un autre jour).
 */
export type ReglagesVisuel = {
  photo: PhotoVisuel
  cadrage: { z: number; cx: number; cy: number }
  texte: string
  position: PositionTexte
  tonalite: string
  voile: number
  logoL: number
}

export type VisuelEnregistre = { format: FormatId; url: string; reglages: ReglagesVisuel; enregistreLe: string }
export type VisuelsArticle = Partial<Record<FormatId, VisuelEnregistre>>

/**
 * Événement de fenêtre émis par le studio quand le post 4:5 est enregistré : le panneau
 * « Publier sur les réseaux » de la même page met sa vignette Instagram à jour.
 */
export const EVENEMENT_VISUEL = 'visuel-instagram-enregistre'
export type DetailEvenementVisuel = { articleId: string; url: string }

const TEXTE_MAX = 500

function nombre(v: unknown, min: number, max: number, decimales: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const p = 10 ** decimales
  return Math.round(Math.min(max, Math.max(min, v)) * p) / p
}

const objet = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

function photoVisuel(v: unknown): PhotoVisuel | null {
  const p = objet(v)
  if (p?.source === 'couverture' && typeof p.url === 'string' && p.url.length <= 2048) return { source: 'couverture', url: p.url }
  if (p?.source === 'import' && typeof p.nom === 'string') return { source: 'import', nom: p.nom.slice(0, 200) }
  return null
}

/**
 * Réglages relus et ramenés dans leurs bornes, toujours dans le même ordre de clés (le studio
 * compare ses réglages à ceux enregistrés par leur JSON) ; null s'ils sont inutilisables.
 */
export function nettoyerReglages(v: unknown): ReglagesVisuel | null {
  const r = objet(v)
  const cad = objet(r?.cadrage)
  if (!r || !cad) return null
  const photo = photoVisuel(r.photo)
  const z = nombre(cad.z, 1, ZOOM_MAX, 4)
  const cx = nombre(cad.cx, 0, 1, 5)
  const cy = nombre(cad.cy, 0, 1, 5)
  const voile = nombre(r.voile, 0, 100, 0)
  const logoL = nombre(r.logoL, LOGO_MIN, LOGO_MAX, 0)
  const position = r.position === 'bas' || r.position === 'haut' ? r.position : null
  const tonalite = TONALITES.find((t) => t.id === r.tonalite)?.id ?? null
  if (!photo || z === null || cx === null || cy === null || voile === null || logoL === null || !position || !tonalite) return null
  if (typeof r.texte !== 'string') return null
  return { photo, cadrage: { z, cx, cy }, texte: r.texte.slice(0, TEXTE_MAX), position, tonalite, voile, logoL }
}

/** Le visuel enregistré le plus récemment (post ou story). */
export function dernierVisuel(visuels: VisuelsArticle | undefined): VisuelEnregistre | null {
  const liste = FORMATS_VISUEL.map((f) => visuels?.[f]).filter((v): v is VisuelEnregistre => !!v)
  return liste.sort((a, b) => b.enregistreLe.localeCompare(a.enregistreLe))[0] ?? null
}
