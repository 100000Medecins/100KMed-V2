/**
 * Recherche de communes auprès du géocodeur de la Géoplateforme IGN (Base Adresse Nationale),
 * le même que la chaîne de données de l'application (dépôt messagerie, `lot8/geocodage.py`).
 * Appelable depuis le navigateur (CORS ouvert) : la ville saisie part vers l'IGN, pas vers nos
 * serveurs — à mentionner dans la charte le jour de l'ouverture de l'annuaire.
 */

export interface Commune {
  ville: string
  codePostal: string
  communeInsee: string
  lat: number
  lon: number
}

const URL_GEOCODAGE = 'https://data.geopf.fr/geocodage/search'

type ReponseGeocodage = {
  features?: Array<{
    geometry: { coordinates: [number, number] }
    properties: { city?: string; name?: string; postcode?: string; citycode?: string }
  }>
}

/** Communes correspondant à une saisie (« Lyon », « 69003 », « 69003 Lyon »), 5 au plus. */
export async function chercherCommunes(saisie: string, limite = 5): Promise<Commune[]> {
  const q = saisie.trim()
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, index: 'address', type: 'municipality', autocomplete: '1', limit: String(limite) })
  try {
    const reponse = await fetch(`${URL_GEOCODAGE}?${params}`, { signal: AbortSignal.timeout(5000) })
    if (!reponse.ok) return []
    const json = (await reponse.json()) as ReponseGeocodage
    return (json.features ?? [])
      .map((f) => ({
        ville: f.properties.city ?? f.properties.name ?? '',
        codePostal: f.properties.postcode ?? '',
        communeInsee: f.properties.citycode ?? '',
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      }))
      .filter((c) => c.ville && Number.isFinite(c.lat) && Number.isFinite(c.lon))
  } catch {
    return []
  }
}

/** Position arrondie au centième de degré (~1 km) : jamais la position exacte vers le serveur. */
export function arrondirPosition(lat: number, lon: number): { lat: number; lon: number } {
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 }
}
