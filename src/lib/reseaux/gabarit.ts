/**
 * Gabarit des visuels Instagram : post 4:5 (1080 × 1350) et story 9:16 (1080 × 1920).
 *
 * Un seul dessin sur canvas pour l'aperçu, les vignettes des tonalités et le JPEG final :
 * ce qu'on voit est ce qui part. Code pur (navigateur, sans React).
 *
 * Repris de la maquette validée par David le 12/11/2026 (`maquette-source.html`, dossier
 * `docs/studio-instagram` du dépôt de la messagerie) : la fonction `dessiner()` et ses aides
 * y font foi. Ne pas changer les nombres sans refaire la comparaison avec la maquette.
 */

export type FormatId = 'post' | 'story'
export type PositionTexte = 'bas' | 'haut'
export type VarianteLogo = 'couleur' | 'noir'
export type VersionLogo = 'petit' | 'grand'
export type CleLogo = `${VarianteLogo}-${VersionLogo}`

/** Couleurs de la charte ; lavande et crème relevées dans l'intro animée. */
export const COULEURS = {
  noir: '#000000',
  blanc: '#FFFFFF',
  orange: '#FFAE6C',
  vert: '#00726A',
  violet: '#6B44CC',
  lavande: '#D3CFFE',
  creme: '#FFFBEE',
} as const

interface ZoneSure {
  x0: number
  y0: number
  x1: number
  y1: number
  /** Story : bord droit ramené à `x1Bas` sous `yCoude` (boutons d'Instagram). */
  x1Bas?: number
  yCoude?: number
}

export interface Format {
  w: number
  h: number
  nom: string
  sure: ZoneSure
  /** Largeur du logo par défaut. */
  logoL: number
  fMax: number
  fMin: number
  lignesMax: number
  /** Au-delà : on conseille l'accroche courte. */
  lignesConfort: number
  /** Largeur maximale de l'aperçu à l'écran (px CSS). */
  vignetteMax: number
}

/** Zones sûres en pixels du visuel final. Story : gabarit fourni par David (12/11/2026). */
export const FORMATS: Record<FormatId, Format> = {
  post: {
    w: 1080, h: 1350, nom: 'Post 4:5',
    sure: { x0: 80, y0: 80, x1: 1000, y1: 1270 },
    logoL: 230, fMax: 78, fMin: 56, lignesMax: 4, lignesConfort: 3, vignetteMax: 440,
  },
  story: {
    w: 1080, h: 1920, nom: 'Story 9:16',
    sure: { x0: 120, y0: 250, x1: 960, y1: 1540, x1Bas: 880, yCoude: 720 },
    logoL: 240, fMax: 86, fMin: 60, lignesMax: 5, lignesConfort: 4, vignetteMax: 330,
  },
}

export interface Tonalite {
  id: string
  nom: string
  logo: VarianteLogo
  brique: string
  texte: string
  /** Une ombre par ligne, en boucle. */
  ombres: string[]
  voile: string
  voileMax: number
  teinte: [string, number] | null
  gris?: boolean
}

const C = COULEURS
export const TONALITES: Tonalite[] = [
  { id: 'tricolore', nom: 'Tricolore', logo: 'couleur', brique: C.blanc, texte: C.noir, ombres: [C.orange, C.vert, C.violet], voile: C.noir, voileMax: 0.62, teinte: null },
  { id: 'orange', nom: 'Orange', logo: 'couleur', brique: C.blanc, texte: C.noir, ombres: [C.orange], voile: C.noir, voileMax: 0.6, teinte: [C.orange, 0.12] },
  { id: 'vert', nom: 'Vert', logo: 'couleur', brique: C.blanc, texte: C.noir, ombres: [C.vert], voile: C.vert, voileMax: 0.88, teinte: [C.vert, 0.16] },
  { id: 'violet', nom: 'Violet plein', logo: 'couleur', brique: C.violet, texte: C.blanc, ombres: [C.noir], voile: C.violet, voileMax: 0.85, teinte: [C.violet, 0.14] },
  { id: 'lavande', nom: 'Lavande', logo: 'couleur', brique: C.creme, texte: C.noir, ombres: [C.violet], voile: C.lavande, voileMax: 0.92, teinte: [C.lavande, 0.2] },
  { id: 'nb', nom: 'Noir et blanc', logo: 'noir', brique: C.blanc, texte: C.noir, ombres: [C.noir], voile: C.noir, voileMax: 0.66, teinte: null, gris: true },
]

export function tonaliteParId(id: string): Tonalite {
  return TONALITES.find((t) => t.id === id) ?? TONALITES[0]
}

// ---- Logo (charte, p. 14) ----

/** Jusqu'à 250 px de large, version « petite taille » (contours plus épais) ; au-delà, version normale. */
export const SEUIL_PETITE_TAILLE = 250
export const LOGO_MIN = 160
export const LOGO_MAX = 360
export const LOGO_PAS = 10

/** Fichiers du graphiste (copiés tels quels dans `public/logos`), avec leurs dimensions (viewBox). */
export const FICHIERS_LOGOS: Record<CleLogo, { src: string; w: number; h: number }> = {
  'couleur-petit': { src: '/logos/logo-principal-couleur-petite-taille.svg', w: 250, h: 174.17 },
  'couleur-grand': { src: '/logos/logo-principal-couleur.svg', w: 1185, h: 825 },
  'noir-petit': { src: '/logos/logo-principal-nb-petite-taille.svg', w: 305, h: 215 },
  'noir-grand': { src: '/logos/logo-principal-nb.svg', w: 1185, h: 825 },
}
export const CLES_LOGOS = Object.keys(FICHIERS_LOGOS) as CleLogo[]

/** Le plus haut des quatre : la mise en page ne dépend pas de la tonalité. */
const RATIO_LOGO = 215 / 305

export const versionLogo = (largeur: number): VersionLogo => (largeur > SEUIL_PETITE_TAILLE ? 'grand' : 'petit')

// ---- Entrées du dessin ----

/** Recadrage : zoom (1 à 3) et centre de la vue, en pixels de la photo. */
export interface Cadrage {
  z: number
  cx: number
  cy: number
}
export const ZOOM_MAX = 3

export interface Photo {
  image: CanvasImageSource
  largeur: number
  hauteur: number
}

export interface Ressources {
  photo: Photo
  logos: Record<CleLogo, CanvasImageSource>
  /** Famille CSS de Space Grotesk (celle que donne `next/font`). */
  police: string
}

export interface Reglages {
  texte: string
  position: PositionTexte
  /** Curseur « Voile », 0 à 100. */
  voile: number
  /** Largeur du logo pour ce format, en px du visuel. */
  logoL: number
  cadrage: Cadrage
}

const borne = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function cadrageInitial(photo: Photo): Cadrage {
  return { z: 1, cx: photo.largeur / 2, cy: photo.hauteur / 2 }
}

// ---- Géométrie du recadrage : la photo couvre toujours le cadre ----

export interface Geometrie {
  /** Agrandissement de la photo (> 1 : elle est étirée). */
  s: number
  sx: number
  sy: number
  vw: number
  vh: number
  /** Cadrage ramené dans les limites de la photo. */
  cadrage: Cadrage
}

export function geometrie(fmtId: FormatId, photo: Photo, cad: Cadrage): Geometrie {
  const F = FORMATS[fmtId]
  const iw = photo.largeur
  const ih = photo.hauteur
  const s = Math.max(F.w / iw, F.h / ih) * cad.z
  const vw = F.w / s
  const vh = F.h / s
  const cx = borne(cad.cx, vw / 2, iw - vw / 2)
  const cy = borne(cad.cy, vh / 2, ih - vh / 2)
  return { s, sx: cx - vw / 2, sy: cy - vh / 2, vw, vh, cadrage: { z: cad.z, cx, cy } }
}

// ---- Texte en briques, comme les lignes du logo ----

export const policeCanvas = (f: number, famille: string) =>
  `700 ${f}px ${famille}, "Segoe UI", system-ui, sans-serif`

const metriques = (f: number) => ({ hb: 1.32 * f, pad: 0.38 * f, d: 0.12 * f, g: 0.07 * f, r: 0.17 * f })
type Metriques = ReturnType<typeof metriques>

let contexteMesure: CanvasRenderingContext2D | null = null
function mesure(): CanvasRenderingContext2D {
  if (!contexteMesure) {
    const c = document.createElement('canvas').getContext('2d')
    if (!c) throw new Error('Canvas indisponible')
    contexteMesure = c
  }
  return contexteMesure
}

export function couper(c: CanvasRenderingContext2D, texte: string, largeurMax: number): string[] {
  const lignes: string[] = []
  for (const para of texte.split('\n')) {
    // Espace insécable avant « : ; ! ? » » et après « « » : jamais de ligne qui commence par la ponctuation.
    const mots = para
      .trim()
      .replace(/ +([:;!?»])/g, ' $1')
      .replace(/(«) +/g, '$1 ')
      .split(/ +/)
      .filter(Boolean)
    let ligne = ''
    for (const mot of mots) {
      const essai = ligne ? ligne + ' ' + mot : mot
      if (!ligne || c.measureText(essai).width <= largeurMax) ligne = essai
      else {
        lignes.push(ligne)
        ligne = mot
      }
    }
    if (ligne) lignes.push(ligne)
  }
  return lignes
}

export type Bloc =
  | { vide: true; lignes: [] }
  | { vide: false; f: number; m: Metriques; lignes: string[]; h: number; x: number; y: number; tient: boolean }

export function composer(fmtId: FormatId, reglages: Pick<Reglages, 'texte' | 'position' | 'logoL'>, police: string): Bloc {
  const F = FORMATS[fmtId]
  const S = F.sure
  const logoH = reglages.logoL * RATIO_LOGO
  const X = logoH / 3 // zone de protection de la charte : hauteur d'une ligne du logo
  const haut = S.y0 + logoH + X
  const bas = S.y1
  const x = S.x0
  const largeur = (S.x1Bas || S.x1) - S.x0
  const texte = reglages.texte.trim()
  if (!texte) return { vide: true, lignes: [] }

  const c = mesure()
  const essayer = (f: number) => {
    const m = metriques(f)
    c.font = policeCanvas(f, police)
    const lignes = couper(c, texte, largeur - 2 * m.pad - m.d)
    const h = lignes.length * m.hb + (lignes.length - 1) * m.g + m.d
    return { f, m, lignes, h }
  }
  let choix: ReturnType<typeof essayer> | null = null
  for (let f = F.fMax; f >= F.fMin; f -= 2) {
    const e = essayer(f)
    if (e.lignes.length <= F.lignesMax && e.h <= bas - haut) {
      choix = e
      break
    }
  }
  const tient = !!choix
  if (!choix) choix = essayer(F.fMin)
  const y = reglages.position === 'bas' ? bas - choix.h : haut
  return { ...choix, x, y, tient, vide: false }
}

function rectArrondi(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

function niveauxDeGris(c: CanvasRenderingContext2D, w: number, h: number) {
  const d = c.getImageData(0, 0, w, h)
  const p = d.data
  for (let i = 0; i < p.length; i += 4) {
    const v = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]
    p[i] = p[i + 1] = p[i + 2] = v
  }
  c.putImageData(d, 0, 0)
}

/** Zones sûres : aperçu seulement, jamais dans le JPEG. */
function dessinerZones(c: CanvasRenderingContext2D, fmtId: FormatId) {
  const F = FORMATS[fmtId]
  const S = F.sure
  c.save()
  c.fillStyle = 'rgba(18, 16, 28, 0.5)'
  if (fmtId === 'story') {
    const x1Bas = S.x1Bas ?? S.x1
    const yCoude = S.yCoude ?? S.y1
    c.fillRect(0, 0, F.w, S.y0)
    c.fillRect(0, S.y1, F.w, F.h - S.y1)
    c.fillRect(0, S.y0, S.x0, S.y1 - S.y0)
    c.fillRect(S.x1, S.y0, F.w - S.x1, S.y1 - S.y0)
    c.fillRect(x1Bas, yCoude, S.x1 - x1Bas, S.y1 - yCoude)
  } else {
    c.fillRect(0, 0, 34, F.h)
    c.fillRect(F.w - 34, 0, 34, F.h)
  }
  c.strokeStyle = '#FFE94A'
  c.lineWidth = 3
  c.setLineDash([16, 10])
  c.beginPath()
  if (fmtId === 'story') {
    const x1Bas = S.x1Bas ?? S.x1
    const yCoude = S.yCoude ?? S.y1
    c.moveTo(S.x0, S.y0)
    c.lineTo(S.x1, S.y0)
    c.lineTo(S.x1, yCoude)
    c.lineTo(x1Bas, yCoude)
    c.lineTo(x1Bas, S.y1)
    c.lineTo(S.x0, S.y1)
    c.closePath()
  } else {
    c.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0)
  }
  c.stroke()
  c.restore()
}

/**
 * Dessine le visuel à l'échelle `k` (1 = taille finale) dans `c`.
 * Ordre : photo recadrée → niveaux de gris → teinte → voile → briques → logo → (zones sûres).
 */
export function dessiner(
  c: CanvasRenderingContext2D,
  k: number,
  fmtId: FormatId,
  ton: Tonalite,
  ressources: Ressources,
  reglages: Reglages,
  avecZones: boolean,
): Bloc {
  const F = FORMATS[fmtId]
  const W = Math.round(F.w * k)
  const H = Math.round(F.h * k)
  const g = geometrie(fmtId, ressources.photo, reglages.cadrage)
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, W, H)
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = 'high'
  c.drawImage(ressources.photo.image, g.sx, g.sy, g.vw, g.vh, 0, 0, W, H)
  if (ton.gris) niveauxDeGris(c, W, H)
  if (ton.teinte) {
    c.fillStyle = rgba(ton.teinte[0], ton.teinte[1])
    c.fillRect(0, 0, W, H)
  }

  const a = (ton.voileMax * reglages.voile) / 100
  if (a > 0) {
    const grad = reglages.position === 'bas'
      ? c.createLinearGradient(0, H, 0, H * 0.38)
      : c.createLinearGradient(0, 0, 0, H * 0.62)
    grad.addColorStop(0, rgba(ton.voile, a))
    grad.addColorStop(0.45, rgba(ton.voile, a * 0.55))
    grad.addColorStop(1, rgba(ton.voile, 0))
    c.fillStyle = grad
    c.fillRect(0, 0, W, H)
  }

  c.setTransform(k, 0, 0, k, 0, 0)
  const bloc = composer(fmtId, reglages, ressources.police)
  if (!bloc.vide) {
    const { m, f } = bloc
    c.font = policeCanvas(f, ressources.police)
    const cap = c.measureText('H').actualBoundingBoxAscent || 0.7 * f
    let y = bloc.y
    bloc.lignes.forEach((ligne, i) => {
      const bw = c.measureText(ligne).width + 2 * m.pad
      c.fillStyle = ton.ombres[i % ton.ombres.length]
      rectArrondi(c, bloc.x + m.d, y + m.d, bw, m.hb, m.r)
      c.fill()
      c.fillStyle = ton.brique
      rectArrondi(c, bloc.x, y, bw, m.hb, m.r)
      c.fill()
      c.fillStyle = ton.texte
      c.textBaseline = 'alphabetic'
      c.fillText(ligne, bloc.x + m.pad, y + (m.hb + cap) / 2)
      y += m.hb + m.g
    })
  }

  const L = reglages.logoL
  const cle: CleLogo = `${ton.logo}-${versionLogo(L)}`
  const fichier = FICHIERS_LOGOS[cle]
  c.drawImage(ressources.logos[cle], F.sure.x0, F.sure.y0, L, (L * fichier.h) / fichier.w)

  if (avecZones) dessinerZones(c, fmtId)
  c.setTransform(1, 0, 0, 1, 0, 0)
  return bloc
}

/** Le visuel à sa taille finale, en JPEG (qualité 0,9). */
export function rendreJpeg(fmtId: FormatId, ton: Tonalite, ressources: Ressources, reglages: Reglages): Promise<Blob> {
  const F = FORMATS[fmtId]
  const cv = document.createElement('canvas')
  cv.width = F.w
  cv.height = F.h
  const c = cv.getContext('2d')
  if (!c) return Promise.reject(new Error('Canvas indisponible'))
  dessiner(c, 1, fmtId, ton, ressources, reglages, false)
  return new Promise((ok, ko) => {
    cv.toBlob((b) => (b ? ok(b) : ko(new Error('Le JPEG n’a pas pu être produit'))), 'image/jpeg', 0.9)
  })
}

// ---- Messages d'état (mêmes seuils que la maquette) ----

export type NiveauEtat = 'ok' | 'alerte' | 'neutre'

const nombre = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export function etatTexte(bloc: Bloc, fmtId: FormatId): { niveau: NiveauEtat; message: string } {
  if (bloc.vide) return { niveau: 'neutre', message: 'Sans texte : le logo seul.' }
  const F = FORMATS[fmtId]
  const n = bloc.lignes.length
  if (!bloc.tient) return { niveau: 'alerte', message: 'Trop long pour ce format, même en petit. Prenez une accroche courte.' }
  if (n > F.lignesConfort) {
    return { niveau: 'alerte', message: `${n} lignes, corps ${bloc.f} px : ça tient, mais une accroche courte se lira mieux.` }
  }
  return { niveau: 'ok', message: `${n} ligne${n > 1 ? 's' : ''}, corps ${bloc.f} px : ça tient.` }
}

export function etatPhoto(g: Geometrie): { niveau: NiveauEtat; message: string } {
  if (g.s <= 1.02) {
    return { niveau: 'ok', message: `Photo nette : ${Math.round(g.vw).toLocaleString('fr-FR')} px de la photo pour 1 080 px.` }
  }
  if (g.s <= 1.3) return { niveau: 'ok', message: `Photo agrandie ×${nombre(g.s)} : encore nette.` }
  return {
    niveau: 'alerte',
    message: `Photo agrandie ×${nombre(g.s)} : elle sera floue. Dézoomez, ou importez une photo plus grande.`,
  }
}

// ---- Chargement ----

/**
 * Largeur demandée aux banques d'images. Une couverture est souvent en paysage 16:9 : il faut
 * 3 413 px de large pour qu'elle couvre les 1 920 px de haut de la story sans agrandissement
 * (en 2 400 px, la photo est agrandie ×1,4 en story). Poids constaté : 0,6 à 2,4 Mo.
 */
export const LARGEUR_GRANDE_PHOTO = 3840

/**
 * Grande version d'une couverture Unsplash ou Pexels (les adresses enregistrées sont en 1 080 et
 * 940 px de large) ; toute autre adresse est rendue telle quelle (couverture déposée
 * sur le site : 1 600 px au plus, en WebP). Les trois hébergeurs répondent avec CORS ouvert :
 * le canvas reste exportable sans passer par le serveur.
 */
export function adresseGrandFormat(adresse: string): string {
  let u: URL
  try {
    u = new URL(adresse)
  } catch {
    return adresse
  }
  if (u.hostname !== 'images.unsplash.com' && u.hostname !== 'images.pexels.com') return adresse
  u.searchParams.delete('h')
  u.searchParams.set('w', String(LARGEUR_GRANDE_PHOTO))
  return u.toString()
}

export function chargerImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const i = new Image()
    if (crossOrigin) i.crossOrigin = 'anonymous'
    i.onload = () => ok(i)
    i.onerror = () => ko(new Error(`Image illisible : ${src}`))
    i.src = src
  })
}

function dessinable(img: HTMLImageElement): boolean {
  try {
    document.createElement('canvas').getContext('2d')?.drawImage(img, 0, 0, 1, 1)
    return true
  } catch {
    return false
  }
}

/**
 * Logos du graphiste, tels quels. Leurs SVG n'ont qu'un viewBox, sans largeur ni hauteur :
 * Firefox refuse alors de les dessiner sur un canvas. Dans ce cas seulement, on les recharge avec
 * les dimensions du viewBox (Chrome et Safari gardent le fichier d'origine : rendu identique à la
 * maquette au pixel près ; la taille ajoutée change très légèrement le lissage des contours).
 */
export async function chargerLogos(): Promise<Record<CleLogo, HTMLImageElement>> {
  const images = await Promise.all(
    CLES_LOGOS.map(async (cle) => {
      const { src, w, h } = FICHIERS_LOGOS[cle]
      const img = await chargerImage(src)
      if (dessinable(img)) return img
      const svg = await fetch(src).then((r) => {
        if (!r.ok) throw new Error(`Logo introuvable : ${src}`)
        return r.text()
      })
      const avecTaille = svg.replace(/<svg\b/, `<svg width="${w}" height="${h}"`)
      // Adresse locale (blob:) gardée tant que la page vit : le navigateur peut redessiner le SVG
      // à une autre taille. Quatre petits fichiers.
      return chargerImage(URL.createObjectURL(new Blob([avecTaille], { type: 'image/svg+xml' })))
    }),
  )
  return Object.fromEntries(CLES_LOGOS.map((cle, i) => [cle, images[i]])) as Record<CleLogo, HTMLImageElement>
}
