/**
 * Encadrés éditoriaux affichés dans le hero des pages catégorie
 * (`/solutions/[idCategorie]`), sous l'intro.
 *
 * Contenu volontairement en dur : il s'agit de renvois ponctuels vers des
 * ressources externes de référence, pas de contenu éditorial géré en admin.
 * `categories` n'a pas de colonne JSONB libre — le jour où ces encadrés se
 * multiplient ou doivent être éditables par l'admin, il faudra une migration
 * (colonne `callout` jsonb) plutôt que d'allonger cette map.
 *
 * Clé = `categories.slug`.
 */

/** Un renvoi externe : amorce de phrase + lien. */
export interface CalloutLien {
  /** Texte affiché avant le lien (nomme la source, cf. « de nos confrères de X »). */
  amorce: string
  /** Libellé du lien — repris tel quel, guillemets compris s'il s'agit d'un titre. */
  titre: string
  url: string
  /** Nature du document si ce n'est pas une page web (ex. « PDF »). */
  hint?: string
}

export interface CategoryCallout {
  /** Surtitre court, en capitales dans le rendu. */
  label: string
  /** Phrase d'accroche affichée avant la liste de liens. */
  texte: string
  liens: CalloutLien[]
  /** Emoji d'illustration. */
  icon: string
}

export const CATEGORY_CALLOUTS: Record<string, CategoryCallout> = {
  'ia-documentaires': {
    label: 'À lire avant de vous lancer',
    texte:
      "Avant d'utiliser une IA en consultation, assurez-vous de connaître le cadre : aucune donnée nominative, connaître le corpus, et « juste un peu » de souveraineté.",
    liens: [
      {
        amorce: 'Vous pouvez lire cet article de nos confrères de Médecins Malins :',
        titre: "« Utiliser l'IA sans aller en prison »",
        url: 'https://medecinmalin.substack.com/p/utiliser-lia-sans-aller-en-prison',
      },
      {
        amorce: 'ou lire',
        titre: 'le guide des Pays de la Loire',
        url: 'https://www.esante-paysdelaloire.fr/media-files/5217/ia-generative_guide-pratique_vf.pdf',
        hint: 'PDF',
      },
    ],
    icon: '⚖️',
  },
}
