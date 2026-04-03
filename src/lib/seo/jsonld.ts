import type { SolutionWithRelations, ResultatWithCritere, Editeur } from '@/types/models'

/**
 * Génère le JSON-LD SoftwareApplication + AggregateRating pour une solution.
 */
export function generateSolutionJsonLd(
  solution: SolutionWithRelations,
  resultats: ResultatWithCritere[]
) {
  // Trouver la note globale
  const noteGenerale = resultats.find(
    (r) => r.critere?.type === 'general' || r.critere?.type === 'synthese'
  )

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: solution.nom,
    description: solution.description || undefined,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    url: solution.website || undefined,
    image: solution.logo_url || undefined,
  }

  // AggregateRating si notes disponibles
  if (noteGenerale && (noteGenerale.nb_notes ?? 0) > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: noteGenerale.moyenne_utilisateurs_base5 || 0,
      bestRating: 5,
      worstRating: 0,
      ratingCount: noteGenerale.nb_notes,
    }
  }

  // Éditeur
  if (solution.editeur) {
    jsonLd.author = {
      '@type': 'Organization',
      name: solution.editeur.nom_commercial || solution.editeur.nom || undefined,
      url: solution.editeur.website || undefined,
    }
  }

  // Prix
  if (solution.prix) {
    const prix = solution.prix as Record<string, unknown>
    if (prix.prix_ttc) {
      jsonLd.offers = {
        '@type': 'Offer',
        price: prix.prix_ttc,
        priceCurrency: (prix.devise as string) || 'EUR',
      }
    }
  }

  return jsonLd
}

/**
 * Génère le JSON-LD Organization pour un éditeur.
 */
export function generateOrganizationJsonLd(editeur: Editeur) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: editeur.nom_commercial || editeur.nom || undefined,
    description: editeur.description || undefined,
    url: editeur.website || undefined,
    logo: editeur.logo_url || undefined,
    address: editeur.contact_ville
      ? {
          '@type': 'PostalAddress',
          addressLocality: editeur.contact_ville,
          postalCode: editeur.contact_cp,
          addressCountry: editeur.contact_pays || 'FR',
        }
      : undefined,
    numberOfEmployees: editeur.nb_employes
      ? {
          '@type': 'QuantitativeValue',
          value: editeur.nb_employes,
        }
      : undefined,
  }
}

/**
 * Génère le JSON-LD WebSite pour la page d'accueil.
 */
export function generateWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '10000médecins.org',
    url: 'https://10000medecins.org',
    description: 'Trouvez les logiciels médicaux les plus adaptés à votre pratique.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://10000medecins.org/solutions?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }
}
