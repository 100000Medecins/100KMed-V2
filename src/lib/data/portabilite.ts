/**
 * Page publique /portabilite : éditeurs qui ont pris les trois engagements de portabilité
 * (export gratuit, remis sous 30 jours, complet et documenté).
 *
 * Liste tenue à la main : pour un nouvel éditeur engagé, ajouter une entrée ici puis redéployer
 * (et revoir dans Admin → Pages le titre « cinq éditeurs » et l'en-tête, qui racontent le
 * 19 octobre 2026). Les logos, noms et liens viennent de la base à partir des slugs. Un logiciel
 * sans `slug`, ou introuvable parmi les fiches actives, s'affiche sans lien.
 *
 * Les textes libres (en-tête, « Pourquoi c'est important », encadré éditeurs, description pour
 * Google) se modifient dans Admin → Pages, ligne `portabilite` : voir TEXTES_PORTABILITE_DEFAUT.
 *
 * Fichier sans dépendance à Next : il est aussi lu par scripts/portabilite-page-admin.ts.
 */

export type LogicielEngage = {
  /** Nom affiché si la fiche n'existe pas en base. */
  nom: string
  /** `solutions.slug` de la fiche du logiciel. Absent → carte sans lien. */
  slug?: string
}

export type EditeurEngage = {
  /** `editeurs.slug` : lien vers /editeur/<slug> et logo. */
  slug: string
  /** Nom affiché, celui de l'engagement public. */
  nom: string
  /** Logo officiel (public/images/portabilite) ; absent → logo de l'éditeur en base. */
  logo?: string
  /** Date de l'engagement public, AAAA-MM-JJ. */
  dateEngagement: string
  logiciels: LogicielEngage[]
}

// Logos du 19/10/2026 : ceux de l'en-tête du communiqué des éditeurs.
const LOGOS = '/images/portabilite'

export const EDITEURS_ENGAGES: EditeurEngage[] = [
  {
    slug: 'doctolib',
    nom: 'Doctolib',
    logo: `${LOGOS}/doctolib.webp`,
    dateEngagement: '2026-10-19',
    logiciels: [{ nom: 'Doctolib Médecin', slug: 'doctolibmedecin' }],
  },
  {
    slug: 'madeformed',
    nom: 'MadeForMed',
    logo: `${LOGOS}/madeformed.webp`,
    dateEngagement: '2026-10-19',
    logiciels: [{ nom: 'Odaiji', slug: 'odaiji' }],
  },
  {
    slug: 'orisha',
    nom: 'Orisha Care',
    logo: `${LOGOS}/orisha-care.webp`,
    dateEngagement: '2026-10-19',
    logiciels: [
      { nom: 'Desmos', slug: 'desmos-medecin' },
      { nom: 'Follow', slug: 'follow' },
    ],
  },
  {
    slug: 'semble',
    nom: 'Semble',
    logo: `${LOGOS}/semble.webp`,
    dateEngagement: '2026-10-19',
    logiciels: [{ nom: 'Semble', slug: 'semble' }],
  },
  {
    slug: 'vidal',
    nom: 'VIDAL Group',
    logo: `${LOGOS}/vidal-group.webp`,
    dateEngagement: '2026-10-19',
    logiciels: [
      { nom: 'Weda', slug: 'weda' },
      { nom: 'DrSanté', slug: 'drsante' },
      { nom: 'MonEcho' },
    ],
  },
]

export const DOCUMENTS_PORTABILITE = [
  {
    titre: 'Notre appel aux éditeurs : « n’attendons pas 2027 ! »',
    auteur: 'Association 100 000 Médecins et syndicats signataires',
    date: '2026-07-20',
    url: '/documents/portabilite/2026-07-20-appel-100000-medecins.pdf',
  },
  {
    titre: 'Communiqué des éditeurs : « cinq éditeurs s’engagent sans attendre 2027 »',
    auteur: 'Doctolib, MadeForMed, Orisha Care, Semble et VIDAL Group',
    date: '2026-10-19',
    url: '/documents/portabilite/2026-10-19-communique-editeurs.pdf',
  },
]

export const CONTACT_EDITEURS = 'contact@100000medecins.org'

// ────────────────────────────────────────────
// Textes modifiables dans Admin → Pages
// ────────────────────────────────────────────

/** Ligne de `pages_statiques` qui porte les textes de la page. */
export const SLUG_PAGE_PORTABILITE = 'portabilite'

/**
 * Textes libres de la page. `titre` et `metaDescription` vont dans les colonnes du même nom de
 * `pages_statiques`, le reste en JSON dans `contenu`. Les champs HTML viennent de l'éditeur de
 * texte allégé (paragraphes, gras, italique, listes, liens) et sont nettoyés à l'affichage.
 */
export type TextesPortabilite = {
  titre: string
  metaDescription: string
  /** Vide → pas de pastille. */
  pastille: string
  chapeau: string
  /** Vide → pas de phrase. */
  remerciement: string
  pourquoiTitre: string
  pourquoiTexte: string
  encadreTitre: string
  encadreTexte: string
  encadreBouton: string
}

const CLES_CONTENU = [
  'pastille',
  'chapeau',
  'remerciement',
  'pourquoiTitre',
  'pourquoiTexte',
  'encadreTitre',
  'encadreTexte',
  'encadreBouton',
] as const

const NOMS = EDITEURS_ENGAGES.map((e) => e.nom)

export const TEXTES_PORTABILITE_DEFAUT: TextesPortabilite = {
  titre: 'Portabilité des données : cinq éditeurs répondent à notre appel',
  metaDescription:
    `${NOMS.slice(0, -1).join(', ')} et ${NOMS[NOMS.length - 1]} s’engagent sans attendre 2027 : ` +
    'export des données du médecin gratuit, remis sous 30 jours, complet et documenté.',
  pastille: '19 octobre 2026',
  chapeau:
    '<p>Le 20 juillet, l’association 100 000 Médecins et six syndicats de médecins appelaient les éditeurs de ' +
    'logiciels médicaux à remettre ses données à tout médecin qui le demande, sans attendre 2027. Doctolib, ' +
    'MadeForMed, Orisha Care, Semble et VIDAL Group ont confirmé publiquement qu’ils appliquent dès maintenant ' +
    'les trois engagements issus du groupe de travail piloté par la Délégation au numérique en santé.</p>',
  remerciement: 'Merci à eux. Nous comptons sur les autres éditeurs pour les rejoindre.',
  pourquoiTitre: 'Pourquoi c’est important',
  pourquoiTexte:
    '<p>Un médecin qui hésite à changer de logiciel par crainte de perdre l’historique de ses patients reste ' +
    'avec un outil qui ne lui convient plus. Et quand la migration a lieu, un export incomplet ou mal documenté ' +
    'se paie en consultations sans antécédents ni comptes-rendus, et en jours de ressaisie pris sur le temps ' +
    'médical.</p><p>Le référentiel de portabilité élaboré par le groupe de travail ne s’imposera à tous les ' +
    'éditeurs qu’en 2027. Les éditeurs engagés appliquent dès maintenant ce qui avait été décidé ensemble.</p>',
  encadreTitre: 'Vous êtes éditeur de logiciel médical ?',
  encadreTexte:
    'Confirmez publiquement les mêmes engagements : export gratuit, remis sous 30 jours, complet et documenté. ' +
    'Nous ajouterons votre nom et vos logiciels à cette page.',
  encadreBouton: 'Nous écrire',
}

/** Champs obligatoires et longueurs maximales (contrôlés à l'enregistrement dans l'admin). */
const REGLES: Record<keyof TextesPortabilite, { libelle: string; obligatoire: boolean; max: number }> = {
  titre: { libelle: 'Titre de la page', obligatoire: true, max: 150 },
  metaDescription: { libelle: 'Description pour Google', obligatoire: false, max: 300 },
  pastille: { libelle: 'Pastille', obligatoire: false, max: 40 },
  chapeau: { libelle: 'Texte d’introduction', obligatoire: true, max: 8000 },
  remerciement: { libelle: 'Phrase en gras', obligatoire: false, max: 200 },
  pourquoiTitre: { libelle: 'Titre « Pourquoi »', obligatoire: true, max: 100 },
  pourquoiTexte: { libelle: 'Texte « Pourquoi »', obligatoire: true, max: 8000 },
  encadreTitre: { libelle: 'Titre de l’encadré', obligatoire: true, max: 100 },
  encadreTexte: { libelle: 'Texte de l’encadré', obligatoire: true, max: 600 },
  encadreBouton: { libelle: 'Bouton de l’encadré', obligatoire: true, max: 40 },
}

const CHAMPS_HTML: (keyof TextesPortabilite)[] = ['chapeau', 'pourquoiTexte']

/** Un champ HTML de l'éditeur sans texte (« <p></p> ») compte comme vide. */
function htmlVide(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === ''
}

/**
 * Textes de la page à partir de la ligne `pages_statiques`. Ligne absente, contenu illisible ou
 * clé manquante → texte par défaut ; une clé présente mais vide est gardée vide (champ masqué).
 */
export function lireTextesPortabilite(
  ligne: { titre?: string | null; meta_description?: string | null; contenu?: string | null } | null,
): TextesPortabilite {
  const textes = { ...TEXTES_PORTABILITE_DEFAUT }
  if (!ligne) return textes
  if (ligne.titre?.trim()) textes.titre = ligne.titre.trim()
  if (ligne.meta_description?.trim()) textes.metaDescription = ligne.meta_description.trim()
  let contenu: unknown = null
  try {
    contenu = ligne.contenu ? JSON.parse(ligne.contenu) : null
  } catch {
    contenu = null
  }
  if (contenu && typeof contenu === 'object') {
    const valeurs = contenu as Record<string, unknown>
    for (const cle of CLES_CONTENU) {
      const valeur = valeurs[cle]
      if (typeof valeur === 'string') textes[cle] = valeur
    }
  }
  return textes
}

/** Nettoie les champs saisis et rend la première erreur, ou null. */
export function verifierTextesPortabilite(textes: TextesPortabilite): string | null {
  for (const cle of Object.keys(REGLES) as (keyof TextesPortabilite)[]) {
    const regle = REGLES[cle]
    let valeur = textes[cle].trim()
    if (CHAMPS_HTML.includes(cle) && htmlVide(valeur)) valeur = ''
    textes[cle] = valeur
    if (regle.obligatoire && !valeur) return `« ${regle.libelle} » est obligatoire.`
    if (valeur.length > regle.max) return `« ${regle.libelle} » dépasse ${regle.max} caractères.`
  }
  return null
}

/** JSON rangé dans `pages_statiques.contenu`. */
export function contenuPortabilite(textes: TextesPortabilite): string {
  return JSON.stringify(Object.fromEntries(CLES_CONTENU.map((cle) => [cle, textes[cle]])))
}
