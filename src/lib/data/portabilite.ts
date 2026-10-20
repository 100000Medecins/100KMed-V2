/**
 * Page publique /portabilite : éditeurs qui ont pris les trois engagements de portabilité
 * (export gratuit, remis sous 30 jours, complet et documenté).
 *
 * Liste tenue à la main : pour un nouvel éditeur engagé, ajouter une entrée ici puis redéployer
 * (et revoir le titre « cinq éditeurs » de l'en-tête de la page, qui raconte le 19 octobre 2026).
 * Les logos, noms et liens viennent de la base à partir des slugs. Un logiciel sans `slug`, ou
 * introuvable parmi les fiches actives, s'affiche sans lien.
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
