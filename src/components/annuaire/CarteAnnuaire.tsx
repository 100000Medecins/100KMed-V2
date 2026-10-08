'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { STYLE_CARTE_PLAN_IGN } from '@/lib/constants/annuaire'
import { SM_SPECIALITES } from '@/lib/constants/profil'
import type { ResultatAnnuaire } from '@/components/annuaire/AnnuaireRecherche'

const COULEUR_MARQUEUR = '#1B2A4A' // navy du thème
const MAX_NOMS_PAR_BULLE = 10

/** Bulle d'un lieu : liste des confrères (éléments DOM, jamais de HTML construit à partir des noms). */
function contenuBulle(groupe: ResultatAnnuaire[]): HTMLElement {
  const racine = document.createElement('div')
  racine.className = 'text-sm'
  const titre = document.createElement('p')
  titre.className = 'font-semibold text-navy mb-1'
  titre.textContent = groupe[0].ville ?? ''
  racine.appendChild(titre)
  const liste = document.createElement('ul')
  for (const r of groupe.slice(0, MAX_NOMS_PAR_BULLE)) {
    const item = document.createElement('li')
    const lien = document.createElement('a')
    lien.href = `/annuaire/${r.rpps}`
    lien.className = 'text-accent-blue hover:underline'
    lien.textContent = `Dr ${r.prenom ?? ''} ${r.nom ?? ''}`.trim()
    item.appendChild(lien)
    const specialite = (r.specialite_code && SM_SPECIALITES[r.specialite_code]) || r.specialite
    if (specialite) {
      const spe = document.createElement('span')
      spe.className = 'text-gray-500'
      spe.textContent = ` — ${specialite}`
      item.appendChild(spe)
    }
    liste.appendChild(item)
  }
  racine.appendChild(liste)
  if (groupe.length > MAX_NOMS_PAR_BULLE) {
    const plus = document.createElement('p')
    plus.className = 'text-gray-400 mt-1'
    plus.textContent = `et ${groupe.length - MAX_NOMS_PAR_BULLE} autres (voir la liste)`
    racine.appendChild(plus)
  }
  return racine
}

/**
 * Carte des résultats (MapLibre + Plan IGN, comme l'application). Les médecins sont placés à leur
 * lieu d'exercice publié par l'ANS, à défaut au centre de la commune de leur fiche : un marqueur
 * par position, avec la liste des confrères dans la bulle.
 */
export default function CarteAnnuaire({ resultats, centre }: { resultats: ResultatAnnuaire[]; centre: { lat: number; lon: number } }) {
  const conteneur = useRef<HTMLDivElement>(null)
  const carte = useRef<maplibregl.Map | null>(null)
  const marqueurs = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!conteneur.current) return
    const map = new maplibregl.Map({
      container: conteneur.current,
      style: STYLE_CARTE_PLAN_IGN,
      center: [centre.lon, centre.lat],
      zoom: 10,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    carte.current = map
    return () => {
      map.remove()
      carte.current = null
    }
    // Carte créée une seule fois ; le centre suit ensuite par flyTo (effet ci-dessous)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = carte.current
    if (!map) return
    for (const m of marqueurs.current) m.remove()
    marqueurs.current = []

    const parPosition = new Map<string, ResultatAnnuaire[]>()
    for (const r of resultats) {
      if (r.lat == null || r.lon == null) continue
      const cle = `${r.lat.toFixed(5)},${r.lon.toFixed(5)}`
      parPosition.set(cle, [...(parPosition.get(cle) ?? []), r])
    }

    const limites = new maplibregl.LngLatBounds()
    limites.extend([centre.lon, centre.lat])
    for (const groupe of parPosition.values()) {
      const { lat, lon } = groupe[0]
      if (lat == null || lon == null) continue
      const marqueur = new maplibregl.Marker({ color: COULEUR_MARQUEUR })
        .setLngLat([lon, lat])
        .setPopup(new maplibregl.Popup({ offset: 24, maxWidth: '280px' }).setDOMContent(contenuBulle(groupe)))
        .addTo(map)
      marqueurs.current.push(marqueur)
      limites.extend([lon, lat])
    }

    if (parPosition.size > 0) map.fitBounds(limites, { padding: 60, maxZoom: 12, duration: 600 })
    else map.flyTo({ center: [centre.lon, centre.lat], zoom: 10, duration: 600 })
  }, [resultats, centre.lat, centre.lon])

  return <div ref={conteneur} className="h-[480px] w-full rounded-card overflow-hidden shadow-card bg-white" />
}
