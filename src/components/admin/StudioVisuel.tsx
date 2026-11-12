'use client'

/**
 * Studio des visuels Instagram : recadrer la couverture d'un article en post 4:5 et en story 9:16
 * avec l'habillage de la charte (texte en briques, logo, tonalité), puis télécharger les JPEG.
 *
 * Tout le dessin est dans `src/lib/reseaux/gabarit.ts` : l'aperçu, les six vignettes et le JPEG
 * final sortent de la même fonction. La couverture est chargée dans sa grande version (3 840 px)
 * quand la banque d'images la donne.
 *
 * « Enregistrer pour Instagram » dépose les deux JPEG (post et story) dans le bucket public
 * `visuels-reseaux` avec leurs réglages ; rouvrir le studio repart de ces réglages
 * (cf `docs/studio-instagram` du dépôt de la messagerie).
 *
 * Sans article (`presentation="page"`, Admin → Blog → Studio Instagram) : photo importée, texte
 * libre, rien n'est enregistré ni demandé à Claude ; on télécharge les JPEG.
 *
 * Titre trop long pour le visuel (badge non vert en post ou en story) à la première ouverture :
 * Claude propose trois accroches de 50 caractères au plus ; la meilleure remplace le titre, qui
 * reste à un clic (« Revenir au titre complet »).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Space_Grotesk } from 'next/font/google'
import { Download, ImagePlus, Loader2, RefreshCw, Save, Sparkles } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Field from '@/components/ui/Field'
import Textarea from '@/components/ui/Textarea'
import {
  FORMATS,
  LOGO_MAX,
  LOGO_MIN,
  LOGO_PAS,
  TONALITES,
  ZOOM_MAX,
  adresseGrandFormat,
  cadrageInitial,
  chargerImage,
  chargerLogos,
  composer,
  dessiner,
  etatPhoto,
  etatTexte,
  geometrie,
  policeCanvas,
  rendreJpeg,
  tonaliteParId,
  versionLogo,
  type Cadrage,
  type CleLogo,
  type FormatId,
  type NiveauEtat,
  type Photo,
  type PositionTexte,
  type Reglages,
  type Ressources,
} from '@/lib/reseaux/gabarit'
import {
  EVENEMENT_VISUEL,
  FORMATS_VISUEL,
  dernierVisuel,
  memePhoto,
  nettoyerReglages,
  type DetailEvenementVisuel,
  type PhotoVisuel,
  type ReglagesVisuel,
  type VisuelsArticle,
} from '@/lib/reseaux/visuels'
import { confirmerDepotVisuel, lireVisuelsArticle, preparerDepotVisuel, proposerAccroches } from '@/lib/actions/visuels-reseaux'

// Police secondaire de la charte (« supports déclinés », licence OFL). Space Mono est réservée au logo.
const spaceGrotesk = Space_Grotesk({ weight: '700', subsets: ['latin'] })

type SourcePhoto = 'couverture' | 'import'
interface PhotoChargee extends Photo {
  apercu: string
  /** Ce qui identifie la photo dans les réglages enregistrés. */
  origine: PhotoVisuel
}

const dpr = () => Math.min(window.devicePixelRatio || 1, 2.5)
const borne = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const DAMIER = { background: 'repeating-conic-gradient(#E5E7EB 0 25%, transparent 0 50%) 0 0 / 16px 16px' }
const BADGE: Record<NiveauEtat, 'success' | 'warning' | 'neutral'> = { ok: 'success', alerte: 'warning', neutre: 'neutral' }
const SUR_LE: Record<FormatId, string> = { post: 'le post', story: 'la story' }

function photoDe(img: HTMLImageElement, apercu: string, origine: PhotoVisuel): PhotoChargee {
  return { image: img, largeur: img.naturalWidth, hauteur: img.naturalHeight, apercu, origine }
}

const date = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export interface StudioVisuelProps {
  /** Fenêtre (depuis un article) ou page (studio libre, Admin → Blog → Studio Instagram). */
  presentation?: 'fenetre' | 'page'
  open?: boolean
  /** Sans onClose, pas de bouton « Fermer » (page). */
  onClose?: () => void
  /**
   * Article déjà enregistré : les visuels lui sont rattachés et Claude peut proposer une accroche.
   * Sans article (studio libre), rien n'est enregistré : on télécharge les JPEG.
   */
  articleId?: string
  /** Couverture de l'article ; sans elle, le studio part d'une photo importée. */
  photoUrl?: string | null
  /** Texte de départ (titre de l'article) ; vide dans le studio libre. */
  titre?: string
  /** Début du nom des JPEG téléchargés (slug de l'article). */
  nomFichier: string
}

export default function StudioVisuel({
  presentation = 'fenetre',
  open = true,
  onClose,
  articleId,
  photoUrl = null,
  titre = '',
  nomFichier,
}: StudioVisuelProps) {
  const police = spaceGrotesk.style.fontFamily

  // ---- Ressources ----
  const [logos, setLogos] = useState<Record<CleLogo, HTMLImageElement> | null>(null)
  const [erreurLogos, setErreurLogos] = useState(false)
  const [photos, setPhotos] = useState<Partial<Record<SourcePhoto, PhotoChargee>>>({})
  const [source, setSource] = useState<SourcePhoto>(photoUrl ? 'couverture' : 'import')
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null)
  /** > 0 une fois la police chargée ; augmente à chaque chargement de police (redessin). */
  const [versionPolice, setVersionPolice] = useState(0)

  // ---- Réglages ----
  const [format, setFormat] = useState<FormatId>('post')
  const [cadrages, setCadrages] = useState<Record<string, Cadrage>>({})
  const [texte, setTexte] = useState(titre)
  const [position, setPosition] = useState<PositionTexte>('bas')
  const [tonaliteId, setTonaliteId] = useState(TONALITES[0].id)
  const [voile, setVoile] = useState(70)
  const [zones, setZones] = useState(true)
  const [logoL, setLogoL] = useState<Record<FormatId, number>>({ post: FORMATS.post.logoL, story: FORMATS.story.logoL })
  const [telechargement, setTelechargement] = useState<FormatId | null>(null)
  const [erreurJpeg, setErreurJpeg] = useState<string | null>(null)

  // ---- Enregistrement ----
  /** undefined tant que la lecture n'a pas répondu ; vide d'emblée dans le studio libre. */
  const [enregistres, setEnregistres] = useState<VisuelsArticle | undefined>(articleId ? undefined : {})
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreurEnregistrement, setErreurEnregistrement] = useState<string | null>(null)

  useEffect(() => {
    if (!articleId) return
    let actif = true
    lireVisuelsArticle(articleId)
      .then((v) => {
        if (!actif) return
        setEnregistres(v)
        // Rouvrir là où on l'avait laissé ; le cadrage est repris par cadrageDeDepart.
        const d = dernierVisuel(v)
        if (d) {
          setTexte(d.reglages.texte)
          setPosition(d.reglages.position)
          setTonaliteId(d.reglages.tonalite)
          setVoile(d.reglages.voile)
        }
        setLogoL({ post: v.post?.reglages.logoL ?? FORMATS.post.logoL, story: v.story?.reglages.logoL ?? FORMATS.story.logoL })
      })
      .catch(() => {
        if (!actif) return
        setEnregistres({})
        setErreurEnregistrement('Le visuel enregistré ne se lit pas : le studio repart de zéro.')
      })
    return () => {
      actif = false
    }
  }, [articleId])

  useEffect(() => {
    let actif = true
    chargerLogos()
      .then((l) => actif && setLogos(l))
      .catch(() => actif && setErreurLogos(true))
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    if (!photoUrl) return
    let actif = true
    // Grande version (3 840 px) si la banque d'images la donne, sinon l'adresse enregistrée.
    // crossOrigin : les hébergeurs répondent avec CORS ouvert, le canvas reste exportable.
    const grande = adresseGrandFormat(photoUrl)
    chargerImage(grande, true)
      .catch((e) => (grande !== photoUrl ? chargerImage(photoUrl, true) : Promise.reject(e)))
      .then((img) => actif && setPhotos((p) => ({ ...p, couverture: photoDe(img, photoUrl, { source: 'couverture', url: photoUrl }) })))
      .catch(() => actif && setErreurPhoto("La couverture ne se charge pas. Importez la photo depuis l'ordinateur."))
    return () => {
      actif = false
    }
  }, [photoUrl])

  useEffect(() => {
    // Attendre la police avant le premier dessin, sinon le canvas prend une police de secours.
    let actif = true
    const redessiner = () => actif && setVersionPolice((v) => v + 1)
    document.fonts.load(policeCanvas(80, police)).then(redessiner, redessiner)
    document.fonts.addEventListener('loadingdone', redessiner)
    return () => {
      actif = false
      document.fonts.removeEventListener('loadingdone', redessiner)
    }
  }, [police])

  const photo = photos[source] ?? null
  const ressources = useMemo<Ressources | null>(
    () => (photo && logos ? { photo, logos, police } : null),
    [photo, logos, police],
  )
  const pret = !!ressources && versionPolice > 0 && enregistres !== undefined
  const F = FORMATS[format]
  const ton = tonaliteParId(tonaliteId)

  /** Cadrage de départ d'un format : celui enregistré si le visuel utilisait cette photo, sinon centré. */
  const cadrageDeDepart = useCallback(
    (fmt: FormatId, p: PhotoChargee): Cadrage => {
      const r = enregistres?.[fmt]?.reglages
      if (r && memePhoto(r.photo, p.origine)) return { z: r.cadrage.z, cx: r.cadrage.cx * p.largeur, cy: r.cadrage.cy * p.hauteur }
      return cadrageInitial(p)
    },
    [enregistres],
  )

  const reglagesDe = useCallback(
    (fmt: FormatId): Reglages | null => {
      if (!photo) return null
      const cadrage = cadrages[`${source}:${fmt}`] ?? cadrageDeDepart(fmt, photo)
      return { texte, position, voile, logoL: logoL[fmt], cadrage }
    },
    [photo, cadrages, cadrageDeDepart, source, texte, position, voile, logoL],
  )
  const reglages = useMemo(() => reglagesDe(format), [reglagesDe, format])

  /** Modifie le cadrage d'un format, toujours ramené dans les limites de la photo. */
  const changerCadrage = useCallback(
    (fmt: FormatId, f: (c: Cadrage) => Cadrage) => {
      // Pas de recadrage avant la lecture du visuel enregistré : elle fixe le cadrage de départ.
      if (!photo || enregistres === undefined) return
      const cle = `${source}:${fmt}`
      setCadrages((prev) => {
        const actuel = geometrie(fmt, photo, prev[cle] ?? cadrageDeDepart(fmt, photo)).cadrage
        return { ...prev, [cle]: geometrie(fmt, photo, f(actuel)).cadrage }
      })
    },
    [photo, source, enregistres, cadrageDeDepart],
  )

  /** Réglages d'un format tels qu'ils seraient enregistrés (cadrage en fractions de la photo). */
  const reglagesAEnregistrer = useCallback(
    (fmt: FormatId): ReglagesVisuel | null => {
      const r = reglagesDe(fmt)
      if (!photo || !r) return null
      const cad = geometrie(fmt, photo, r.cadrage).cadrage
      return nettoyerReglages({
        photo: photo.origine,
        cadrage: { z: cad.z, cx: cad.cx / photo.largeur, cy: cad.cy / photo.hauteur },
        texte: r.texte,
        position: r.position,
        tonalite: tonaliteId,
        voile: r.voile,
        logoL: r.logoL,
      })
    },
    [reglagesDe, photo, tonaliteId],
  )
  const dernier = dernierVisuel(enregistres)
  const modifie = useMemo(
    () => FORMATS_VISUEL.some((fmt) => JSON.stringify(reglagesAEnregistrer(fmt)) !== JSON.stringify(enregistres?.[fmt]?.reglages ?? null)),
    [reglagesAEnregistrer, enregistres],
  )

  // ---- Accroche proposée par Claude ----
  const [accroches, setAccroches] = useState<string[]>([])
  const [accrocheEnCours, setAccrocheEnCours] = useState(false)
  const [accrocheErreur, setAccrocheErreur] = useState<string | null>(null)
  const demandeAuto = useRef(false)

  /** Le titre tient (badge vert : 3 lignes au plus en post, 4 en story) dans les deux formats. */
  const titreTient = useMemo(
    () =>
      versionPolice > 0 &&
      FORMATS_VISUEL.every(
        (fmt) => etatTexte(composer(fmt, { texte: titre, position: 'bas', logoL: FORMATS[fmt].logoL }, police), fmt).niveau === 'ok',
      ),
    [titre, police, versionPolice],
  )
  // Première ouverture (rien d'enregistré) d'un article au titre trop long : Claude propose.
  const doitProposer = !!articleId && enregistres !== undefined && !dernier && versionPolice > 0 && !titreTient

  useEffect(() => {
    if (!doitProposer || !articleId || demandeAuto.current) return
    demandeAuto.current = true
    proposerAccroches(articleId)
      .then((r) => {
        if ('error' in r) {
          setAccrocheErreur(r.error)
          return
        }
        setAccroches(r.accroches)
        // Le titre n'est remplacé que s'il n'a pas été retouché pendant l'attente.
        setTexte((t) => (t === titre ? r.accroches[0] : t))
      })
      .catch(() => setAccrocheErreur('Claude ne répond pas : gardez le titre ou écrivez une accroche.'))
  }, [doitProposer, articleId, titre])

  const accrocheAttendue = accrocheEnCours || (doitProposer && accroches.length === 0 && !accrocheErreur)
  const indexAccroche = accroches.indexOf(texte)

  async function demanderAccroches() {
    if (!articleId) return
    setAccrocheEnCours(true)
    setAccrocheErreur(null)
    try {
      const r = await proposerAccroches(articleId)
      if ('error' in r) setAccrocheErreur(r.error)
      else {
        setAccroches(r.accroches)
        setTexte(r.accroches[0])
      }
    } catch {
      setAccrocheErreur('Claude ne répond pas : réessayez.')
    } finally {
      setAccrocheEnCours(false)
    }
  }

  // ---- Aperçu principal ----
  const colonneRef = useRef<HTMLElement>(null)
  const toileRef = useRef<HTMLCanvasElement>(null)
  const [largeurColonne, setLargeurColonne] = useState(0)

  useEffect(() => {
    const el = colonneRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setLargeurColonne(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const cssW = Math.max(200, Math.min(largeurColonne || F.vignetteMax, F.vignetteMax))
  const cssH = (cssW * F.h) / F.w

  useEffect(() => {
    if (!pret || !ressources || !reglages) return
    const id = requestAnimationFrame(() => {
      const cv = toileRef.current
      const c = cv?.getContext('2d')
      if (!cv || !c) return
      const w = Math.round(cssW * dpr())
      const h = Math.round(cssH * dpr())
      if (cv.width !== w) cv.width = w
      if (cv.height !== h) cv.height = h
      dessiner(c, cv.width / F.w, format, ton, ressources, reglages, zones)
    })
    return () => cancelAnimationFrame(id)
  }, [pret, ressources, reglages, format, ton, zones, cssW, cssH, F.w, versionPolice])

  // ---- Vignettes des tonalités (après une courte pause, comme la maquette) ----
  const vignettesRef = useRef<(HTMLCanvasElement | null)[]>([])
  useEffect(() => {
    if (!pret || !ressources || !reglages) return
    const t = setTimeout(() => {
      TONALITES.forEach((tn, i) => {
        const cv = vignettesRef.current[i]
        const c = cv?.getContext('2d')
        if (!cv || !c) return
        cv.width = Math.round((cv.clientWidth || 110) * dpr())
        cv.height = Math.round((cv.width * F.h) / F.w)
        dessiner(c, cv.width / F.w, format, tn, ressources, reglages, false)
      })
    }, 140)
    return () => clearTimeout(t)
  }, [pret, ressources, reglages, format, F.w, F.h, largeurColonne, versionPolice])

  // ---- Recadrage : glisser (souris ou doigt), molette ----
  const glisse = useRef<{ x: number; y: number } | null>(null)

  function surPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    glisse.current = { x: e.clientX, y: e.clientY }
  }
  function surPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const debut = glisse.current
    const cv = toileRef.current
    if (!debut || !photo || !cv) return
    const dx = e.clientX - debut.x
    const dy = e.clientY - debut.y
    glisse.current = { x: e.clientX, y: e.clientY }
    const u = F.w / cv.clientWidth
    changerCadrage(format, (cad) => {
      const s = geometrie(format, photo, cad).s
      return { ...cad, cx: cad.cx - (dx * u) / s, cy: cad.cy - (dy * u) / s }
    })
  }
  function finGlisse() {
    glisse.current = null
  }

  useEffect(() => {
    const cv = toileRef.current
    if (!cv) return
    const surMolette = (e: WheelEvent) => {
      e.preventDefault()
      changerCadrage(format, (cad) => ({ ...cad, z: borne(cad.z * Math.exp(-e.deltaY * 0.0015), 1, ZOOM_MAX) }))
    }
    cv.addEventListener('wheel', surMolette, { passive: false })
    return () => cv.removeEventListener('wheel', surMolette)
  }, [changerCadrage, format, open])

  // ---- Photo importée ----
  const champImport = useRef<HTMLInputElement>(null)
  async function importer(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    const url = URL.createObjectURL(fichier)
    try {
      const img = await chargerImage(url)
      const ancienne = photos.import
      if (ancienne) URL.revokeObjectURL(ancienne.apercu)
      setPhotos((p) => ({ ...p, import: photoDe(img, url, { source: 'import', nom: fichier.name }) }))
      setCadrages((prev) => {
        const suite = { ...prev }
        delete suite['import:post']
        delete suite['import:story']
        return suite
      })
      setSource('import')
      setErreurPhoto(null)
    } catch {
      URL.revokeObjectURL(url)
      setErreurPhoto('Ce fichier ne se lit pas comme une image.')
    }
  }

  // ---- Téléchargement ----
  async function telecharger(fmt: FormatId) {
    const r = reglagesDe(fmt)
    if (!ressources || !r) return
    setTelechargement(fmt)
    setErreurJpeg(null)
    try {
      const blob = await rendreJpeg(fmt, ton, ressources, r)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${nomFichier}-instagram-${fmt}.jpg`
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      setErreurJpeg("Le JPEG n'a pas pu être produit.")
    } finally {
      setTelechargement(null)
    }
  }

  // ---- Enregistrement : post puis story, chacun dessiné, déposé, vérifié par le serveur ----
  async function enregistrer() {
    if (!ressources || !articleId) return
    setEnregistrement(true)
    setErreurEnregistrement(null)
    let suite: VisuelsArticle = { ...enregistres }
    for (const fmt of FORMATS_VISUEL) {
      try {
        const r = reglagesDe(fmt)
        const aGarder = reglagesAEnregistrer(fmt)
        if (!r || !aGarder) throw new Error("la photo n'est pas chargée.")
        const jpeg = await rendreJpeg(fmt, ton, ressources, r)
        const depot = await preparerDepotVisuel(articleId, fmt)
        if ('error' in depot) throw new Error(depot.error)
        const reponse = await fetch(depot.adresse, {
          method: 'PUT',
          headers: { 'content-type': 'image/jpeg', 'x-upsert': 'false' },
          body: jpeg,
        })
        if (!reponse.ok) throw new Error(`le stockage a refusé le fichier (${reponse.status}).`)
        const res = await confirmerDepotVisuel(articleId, fmt, depot.chemin, aGarder)
        if ('error' in res) throw new Error(res.error)
        suite = { ...suite, [fmt]: res.visuel }
        setEnregistres(suite)
        if (fmt === 'post') {
          window.dispatchEvent(
            new CustomEvent<DetailEvenementVisuel>(EVENEMENT_VISUEL, { detail: { articleId, url: res.visuel.url } }),
          )
        }
      } catch (e) {
        setErreurEnregistrement(`Échec sur ${SUR_LE[fmt]} : ${e instanceof Error ? e.message : 'connexion interrompue.'}`)
        break
      }
    }
    setEnregistrement(false)
  }

  // ---- États affichés ----
  const bloc = useMemo(
    () => (versionPolice > 0 ? composer(format, { texte, position, logoL: logoL[format] }, police) : null),
    [format, texte, position, logoL, police, versionPolice],
  )
  const etatT = bloc ? etatTexte(bloc, format) : null
  const etatP = photo && reglages ? etatPhoto(geometrie(format, photo, reglages.cadrage)) : null
  const petitLogo = versionLogo(logoL[format]) === 'petit'

  const photoEnregistree = dernier?.reglages.photo
  const notePhoto = !photoEnregistree
    ? null
    : photoEnregistree.source === 'import'
      ? photos.import && memePhoto(photoEnregistree, photos.import.origine)
        ? null
        : `Le visuel enregistré utilise une photo importée (« ${photoEnregistree.nom} ») : importez-la de nouveau pour le retoucher.`
      : photoEnregistree.url !== photoUrl
        ? 'La couverture a changé depuis l’enregistrement : le cadrage repart du centre.'
        : null

  const occupe = telechargement !== null || enregistrement
  const note =
    erreurEnregistrement ??
    erreurJpeg ??
    (!articleId
      ? 'Rien n’est enregistré ici : téléchargez le post et la story.'
      : !pret
      ? 'Chargement…'
      : !dernier
        ? 'Pas encore enregistré pour cet article.'
        : modifie
          ? `Modifications non enregistrées (dernier enregistrement le ${date(dernier.enregistreLe)}).`
          : `Enregistré le ${date(dernier.enregistreLe)}.`)

  const choixFormat = (fmt: FormatId, libelle: string, taille: string) => (
    <Button
      type="button"
      size="sm"
      variant={format === fmt ? 'primary' : 'ghost'}
      aria-pressed={format === fmt}
      onClick={() => setFormat(fmt)}
    >
      {libelle} <span className="hidden font-normal opacity-70 tabular-nums sm:inline">{taille}</span>
    </Button>
  )
  const choixPosition = (p: PositionTexte, libelle: string) => (
    <Button
      type="button"
      size="sm"
      variant={position === p ? 'primary' : 'ghost'}
      aria-pressed={position === p}
      onClick={() => setPosition(p)}
    >
      {libelle}
    </Button>
  )
  const tuilePhoto = (actif: boolean) =>
    `relative flex flex-col gap-1 rounded-xl border-2 p-1 text-left text-xs text-gray-500 transition-colors cursor-pointer ${
      actif ? 'border-navy' : 'border-transparent hover:border-gray-200'
    }`

  const corps = (
    <>
      {presentation === 'fenetre' && <Modal.Header onClose={onClose}>Visuel Instagram</Modal.Header>}
      <Modal.Body>
        <div className="grid items-start gap-8 md:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          {/* Aperçu */}
          <section ref={colonneRef} aria-label="Aperçu" className="flex min-w-0 flex-col items-center gap-3 md:sticky md:top-0">
            <div role="group" aria-label="Format" className="inline-flex gap-1 rounded-button border border-gray-200 p-1">
              {choixFormat('post', 'Post 4:5', '1080 × 1350')}
              {choixFormat('story', 'Story 9:16', '1080 × 1920')}
            </div>
            <div className="relative max-w-full rounded" style={DAMIER}>
              <canvas
                ref={toileRef}
                aria-label="Aperçu du visuel ; glisser pour recadrer"
                className="block max-w-full cursor-grab touch-none rounded active:cursor-grabbing"
                style={{ width: cssW, height: cssH }}
                onPointerDown={surPointerDown}
                onPointerMove={surPointerMove}
                onPointerUp={finGlisse}
                onPointerCancel={finGlisse}
              />
              {!pret && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-sm text-gray-500">
                  {erreurLogos ? (
                    'Les logos ne se chargent pas.'
                  ) : !photo && (erreurPhoto || !photoUrl) ? (
                    <>
                      <span>{erreurPhoto ?? 'Importez une photo de votre ordinateur ou de votre téléphone.'}</span>
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        leftIcon={<ImagePlus className="h-4 w-4" />}
                        onClick={() => champImport.current?.click()}
                      >
                        Importer une photo
                      </Button>
                    </>
                  ) : (
                    'Chargement…'
                  )}
                </div>
              )}
            </div>
            <div className="flex w-full max-w-[440px] items-center gap-3">
              <label htmlFor="studio-zoom" className="text-sm text-gray-500">Zoom</label>
              <input
                id="studio-zoom"
                type="range"
                min={1}
                max={ZOOM_MAX}
                step={0.01}
                value={reglages?.cadrage.z ?? 1}
                onChange={(e) => changerCadrage(format, (cad) => ({ ...cad, z: Number(e.target.value) }))}
                className="min-w-0 flex-1 accent-navy"
                disabled={!pret}
              />
            </div>
            <p className="max-w-[44ch] text-center text-xs text-gray-500">
              Glissez la photo pour la recadrer. Molette ou curseur pour zoomer. Chaque format a son propre cadrage.
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={zones} onChange={(e) => setZones(e.target.checked)} className="h-4 w-4 accent-navy" />
              Montrer les zones sûres
            </label>
            {etatP && (
              <Badge variant={BADGE[etatP.niveau]} dot className="!whitespace-normal text-center">
                {etatP.message}
              </Badge>
            )}
          </section>

          {/* Réglages */}
          <section aria-label="Réglages" className="flex min-w-0 flex-col gap-7">
            <fieldset className="space-y-3">
              <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Photo</legend>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {photos.couverture && (
                  <button
                    type="button"
                    aria-pressed={source === 'couverture'}
                    onClick={() => setSource('couverture')}
                    className={tuilePhoto(source === 'couverture')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- adresse externe, simple vignette */}
                    <img src={photos.couverture.apercu} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                    <span className="truncate px-0.5">Couverture</span>
                  </button>
                )}
                <label className={`${tuilePhoto(source === 'import')} focus-within:ring-2 focus-within:ring-accent-blue/40`}>
                  {photos.import ? (
                    // eslint-disable-next-line @next/next/no-img-element -- fichier local (blob:)
                    <img src={photos.import.apercu} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                  ) : (
                    <span aria-hidden className="grid aspect-[4/3] w-full place-items-center rounded-lg border-[1.5px] border-dashed border-gray-300 text-gray-400">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                  )}
                  <span className="truncate px-0.5">{photos.import ? 'Votre photo' : 'Importer'}</span>
                  <input
                    ref={champImport}
                    type="file"
                    accept="image/*"
                    aria-label="Importer une photo"
                    onChange={importer}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
              {erreurPhoto && <p className="text-xs text-amber-700">{erreurPhoto}</p>}
              {notePhoto && <p className="text-xs text-gray-500">{notePhoto}</p>}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Texte</legend>
              <Field
                htmlFor="studio-texte"
                hint={
                  articleId
                    ? 'Titre complet ou accroche courte. Entrée force un retour à la ligne.'
                    : 'Texte court : une cinquantaine de caractères au plus. Vide, le visuel ne garde que le logo. Entrée force un retour à la ligne.'
                }
              >
                <Textarea
                  id="studio-texte"
                  rows={3}
                  value={texte}
                  placeholder={articleId ? undefined : 'Votre texte'}
                  onChange={(e) => setTexte(e.target.value)}
                />
              </Field>
              {etatT && (
                <div>
                  <Badge variant={BADGE[etatT.niveau]} dot className="!whitespace-normal">
                    {etatT.message}
                  </Badge>
                </div>
              )}
              {articleId && (accrocheAttendue || accrocheErreur || indexAccroche >= 0) && (
                <p className={`flex items-center gap-1.5 text-xs ${accrocheErreur && !accrocheAttendue ? 'text-amber-700' : 'text-gray-500'}`}>
                  {accrocheAttendue ? (
                    <>
                      <Loader2 aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      {accrocheEnCours ? 'Claude cherche des accroches…' : 'Titre trop long pour le visuel : Claude prépare une accroche…'}
                    </>
                  ) : accrocheErreur ? (
                    accrocheErreur
                  ) : (
                    <>
                      <Sparkles aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent-blue" />
                      Accroche proposée par Claude ({indexAccroche + 1} sur {accroches.length}), à relire et modifier librement.
                    </>
                  )}
                </p>
              )}
              {articleId && (
              <div className="flex flex-wrap items-center gap-2">
                {accroches.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    disabled={accrocheAttendue}
                    onClick={() => setTexte(accroches[(indexAccroche + 1) % accroches.length])}
                  >
                    Autre proposition
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  disabled={accrocheAttendue}
                  onClick={demanderAccroches}
                >
                  {accroches.length ? 'Nouvelles propositions' : 'Proposer une accroche'}
                </Button>
              </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {titre && texte !== titre && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTexte(titre)}>
                    Revenir au titre complet
                  </Button>
                )}
                <div role="group" aria-label="Position du texte" className="inline-flex gap-1 rounded-button border border-gray-200 p-1">
                  {choixPosition('bas', 'Texte en bas')}
                  {choixPosition('haut', 'Texte en haut')}
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Logo</legend>
              <div className="flex items-center gap-3">
                <label htmlFor="studio-logo" className="text-sm text-gray-700">Taille du logo</label>
                <input
                  id="studio-logo"
                  type="range"
                  min={LOGO_MIN}
                  max={LOGO_MAX}
                  step={LOGO_PAS}
                  value={logoL[format]}
                  onChange={(e) => setLogoL((l) => ({ ...l, [format]: Number(e.target.value) }))}
                  className="min-w-0 flex-1 accent-navy"
                />
                <output htmlFor="studio-logo" className="min-w-[4.5ch] text-right text-xs tabular-nums text-gray-500">
                  {logoL[format]} px
                </output>
              </div>
              <p className="text-xs text-gray-500">
                {petitLogo
                  ? 'Version « petite taille » (charte : jusqu’à 250 px de large).'
                  : 'Version normale du logo (charte : au-delà de 250 px de large).'}
              </p>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Tonalité</legend>
              <p className="text-xs text-gray-500">
                Chaque vignette montre votre photo, votre cadrage et votre texte dans une tonalité. Touchez celle que vous préférez pour l’appliquer.
              </p>
              <div className={`grid gap-3 ${format === 'story' ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3'}`}>
                {TONALITES.map((t, i) => {
                  const actif = t.id === tonaliteId
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={actif}
                      title={t.nom}
                      onClick={() => setTonaliteId(t.id)}
                      className={`flex min-w-0 flex-col gap-1.5 rounded-xl border-2 p-1 text-left transition-colors ${
                        actif ? 'border-navy bg-surface-light/40' : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <canvas
                        ref={(el) => {
                          vignettesRef.current[i] = el
                        }}
                        aria-hidden
                        className="block h-auto w-full rounded-md bg-gray-100"
                      />
                      <span className="flex min-w-0 items-center gap-1.5 px-0.5 text-xs font-medium text-navy">
                        <span className="inline-flex shrink-0 gap-0.5">
                          {[t.brique, ...t.ombres].map((coul, j) => (
                            <i key={j} className="block h-2 w-2 rounded-[3px] ring-1 ring-inset ring-black/20" style={{ background: coul }} />
                          ))}
                        </span>
                        <span className="truncate">{t.nom}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="studio-voile" className="text-sm text-gray-700">Voile sur la photo</label>
                <input
                  id="studio-voile"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={voile}
                  onChange={(e) => setVoile(Number(e.target.value))}
                  className="min-w-0 flex-1 accent-navy"
                />
                <output htmlFor="studio-voile" className="min-w-[4ch] text-right text-xs tabular-nums text-gray-500">
                  {voile} %
                </output>
              </div>
            </fieldset>
          </section>
        </div>
      </Modal.Body>
      {/* En page, les boutons restent au bas de l'écran pendant qu'on fait défiler les réglages. */}
      <Modal.Footer className={`flex-wrap ${presentation === 'page' ? 'sticky bottom-0 z-10 rounded-b-card !bg-white' : ''}`}>
        <p
          role="status"
          className={`min-w-0 flex-1 basis-60 text-xs ${erreurEnregistrement || erreurJpeg ? 'text-amber-700' : 'text-gray-500'} ${
            // Téléphone, studio libre : la note fixe est déjà dans l'en-tête de la page, la barre du bas reste basse.
            !articleId && !erreurJpeg ? 'hidden sm:block' : ''
          }`}
        >
          {note}
        </p>
        {onClose && (
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Fermer
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="md"
          leftIcon={<Download className="h-4 w-4" />}
          loading={telechargement === 'story'}
          disabled={!pret || occupe}
          onClick={() => telecharger('story')}
          title="JPEG 1080 × 1920"
        >
          Télécharger la story
        </Button>
        <Button
          type="button"
          variant={articleId ? 'outline' : 'primary'}
          size="md"
          leftIcon={<Download className="h-4 w-4" />}
          loading={telechargement === 'post'}
          disabled={!pret || occupe}
          onClick={() => telecharger('post')}
          title="JPEG 1080 × 1350"
        >
          Télécharger le post
        </Button>
        {articleId && (
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<Save className="h-4 w-4" />}
            loading={enregistrement}
            disabled={!pret || occupe}
            onClick={enregistrer}
          >
            Enregistrer pour Instagram
          </Button>
        )}
      </Modal.Footer>
    </>
  )

  if (presentation === 'page') {
    return (
      <Card padding="none" overflow="visible">
        {corps}
      </Card>
    )
  }
  return (
    <Modal open={open} onClose={onClose ?? (() => {})} size="2xl" closeOnBackdropClick={false}>
      {corps}
    </Modal>
  )
}
