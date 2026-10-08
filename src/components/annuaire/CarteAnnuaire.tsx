'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, Polygon, Point as PointGeo } from 'geojson'
import { STYLE_CARTE_PLAN_IGN } from '@/lib/constants/annuaire'
import { SM_SPECIALITES } from '@/lib/constants/profil'
import type { ResultatAnnuaire } from '@/components/annuaire/AnnuaireRecherche'

// Couleurs du thème (navy, accent-orange, accent-blue)
const MARINE = '#1B2A4A'
const ORANGE = '#E8734A'
const BLEU = '#4A90D9'

const SOURCE_LIEUX = 'lieux'
const SOURCE_PERIMETRE = 'perimetre'
const SOURCE_CENTRE = 'centre'
const COUCHE_GRAPPES = 'grappes'
const COUCHE_LIEUX = 'lieux-points'

type Point = { lat: number; lon: number }
const VIDE: FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Cercle du rayon de recherche (polygone de 64 côtés). */
function cercle(centre: Point, km: number): Feature<Polygon> {
  const coords: [number, number][] = []
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * 2 * Math.PI
    coords.push([
      centre.lon + (km / (111.32 * Math.cos((centre.lat * Math.PI) / 180))) * Math.cos(angle),
      centre.lat + (km / 111.32) * Math.sin(angle),
    ])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } }
}

/** Bulle d'un lieu : liste des confrères (éléments DOM, jamais de HTML construit à partir des noms). */
function contenuBulle(groupe: ResultatAnnuaire[], ouvrir: (rpps: string) => void): HTMLElement {
  const racine = document.createElement('div')
  racine.className = 'text-sm'
  const titre = document.createElement('p')
  titre.className = 'font-semibold text-navy mb-1'
  titre.textContent = groupe.length > 1 ? `${groupe[0].ville ?? ''} · ${groupe.length} confrères` : groupe[0].ville ?? ''
  racine.appendChild(titre)
  const liste = document.createElement('ul')
  liste.className = 'max-h-60 overflow-y-auto pr-1'
  for (const r of groupe) {
    const item = document.createElement('li')
    const lien = document.createElement('a')
    lien.href = `/annuaire/${r.rpps}`
    lien.className = 'text-accent-blue hover:underline'
    lien.textContent = `Dr ${r.prenom ?? ''} ${r.nom ?? ''}`.trim()
    // Navigation dans l'application (la recherche reste en mémoire pour le retour)
    lien.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      ouvrir(r.rpps)
    })
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
  return racine
}

/**
 * Carte des résultats (MapLibre + Plan IGN, comme l'application) : tous les confrères du rayon,
 * regroupés en grappes ; un point par lieu d'exercice (publié par l'ANS, à défaut le centre de la
 * commune de la fiche), cercle du rayon et point de départ.
 */
export default function CarteAnnuaire({
  resultats,
  centre,
  rayonKm,
  onOuvrir,
}: {
  resultats: ResultatAnnuaire[]
  centre: Point
  rayonKm: number | null
  onOuvrir: (rpps: string) => void
}) {
  const conteneur = useRef<HTMLDivElement>(null)
  const carte = useRef<maplibregl.Map | null>(null)
  const groupes = useRef(new Map<string, ResultatAnnuaire[]>())
  const ouvrir = useRef(onOuvrir)
  const [prete, setPrete] = useState(false)
  const centreLat = centre.lat
  const centreLon = centre.lon

  useEffect(() => {
    ouvrir.current = onOuvrir
  }, [onOuvrir])

  useEffect(() => {
    if (!conteneur.current) return
    const map = new maplibregl.Map({
      container: conteneur.current,
      style: STYLE_CARTE_PLAN_IGN,
      center: [centre.lon, centre.lat],
      zoom: 11,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    carte.current = map

    map.on('load', () => {
      // Périmètre sous les lieux, point de départ au-dessus (ajoutés dans cet ordre), comme l'application
      map.addSource(SOURCE_PERIMETRE, { type: 'geojson', data: VIDE })
      map.addLayer({ id: 'perimetre-fond', type: 'fill', source: SOURCE_PERIMETRE, paint: { 'fill-color': MARINE, 'fill-opacity': 0.06 } })
      map.addLayer({
        id: 'perimetre-bord',
        type: 'line',
        source: SOURCE_PERIMETRE,
        paint: { 'line-color': MARINE, 'line-width': 1.5, 'line-opacity': 0.6 },
      })
      map.addSource(SOURCE_LIEUX, { type: 'geojson', data: VIDE, cluster: true, clusterMaxZoom: 13, clusterRadius: 40 })
      map.addLayer({
        id: COUCHE_GRAPPES,
        type: 'circle',
        source: SOURCE_LIEUX,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': MARINE,
          'circle-radius': ['step', ['get', 'point_count'], 14, 50, 18, 500, 24],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: 'grappes-nombre',
        type: 'symbol',
        source: SOURCE_LIEUX,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Source Sans Pro Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: { 'text-color': '#ffffff' },
      })
      map.addLayer({
        id: COUCHE_LIEUX,
        type: 'circle',
        source: SOURCE_LIEUX,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ORANGE,
          'circle-radius': ['case', ['>', ['get', 'nombre'], 1], 9, 7],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })
      map.addSource(SOURCE_CENTRE, { type: 'geojson', data: VIDE })
      map.addLayer({
        id: 'centre',
        type: 'circle',
        source: SOURCE_CENTRE,
        paint: { 'circle-color': BLEU, 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 },
      })

      map.on('click', COUCHE_GRAPPES, async (e) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined
        if (!f || f.geometry.type !== 'Point') return
        const zoom = await (map.getSource(SOURCE_LIEUX) as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id)
        map.easeTo({ center: f.geometry.coordinates as [number, number], zoom })
      })
      map.on('click', COUCHE_LIEUX, (e) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined
        if (!f || f.geometry.type !== 'Point') return
        const groupe = groupes.current.get(String(f.properties.cle))
        if (!groupe) return
        new maplibregl.Popup({ offset: 12, maxWidth: '300px' })
          .setLngLat(f.geometry.coordinates as [number, number])
          .setDOMContent(contenuBulle(groupe, (rpps) => ouvrir.current(rpps)))
          .addTo(map)
      })
      for (const couche of [COUCHE_GRAPPES, COUCHE_LIEUX]) {
        map.on('mouseenter', couche, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', couche, () => (map.getCanvas().style.cursor = ''))
      }
      setPrete(true)
    })

    return () => {
      map.remove()
      carte.current = null
    }
    // Carte créée une seule fois ; le contenu suit ensuite les résultats (effet ci-dessous)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = carte.current
    if (!map || !prete) return
    const depart = { lat: centreLat, lon: centreLon }

    // Un point par lieu : plusieurs confrères peuvent partager le même cabinet
    const parLieu = new Map<string, ResultatAnnuaire[]>()
    for (const r of resultats) {
      if (r.lat == null || r.lon == null) continue
      const cle = `${r.lat.toFixed(5)},${r.lon.toFixed(5)}`
      parLieu.set(cle, [...(parLieu.get(cle) ?? []), r])
    }
    groupes.current = parLieu
    const lieux: FeatureCollection = {
      type: 'FeatureCollection',
      features: Array.from(parLieu.entries()).map(([cle, groupe]) => ({
        type: 'Feature',
        properties: { cle, nombre: groupe.length },
        geometry: { type: 'Point', coordinates: [groupe[0].lon as number, groupe[0].lat as number] },
      })),
    }
    ;(map.getSource(SOURCE_LIEUX) as GeoJSONSource).setData(lieux)
    ;(map.getSource(SOURCE_PERIMETRE) as GeoJSONSource).setData(rayonKm ? cercle(depart, rayonKm) : VIDE)
    ;(map.getSource(SOURCE_CENTRE) as GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [depart.lon, depart.lat] },
    })

    // Cadrage : le cercle du rayon ; sans rayon, l'ensemble des résultats
    const limites = new maplibregl.LngLatBounds()
    limites.extend([depart.lon, depart.lat])
    if (rayonKm) for (const c of cercle(depart, rayonKm).geometry.coordinates[0]) limites.extend(c as [number, number])
    else for (const f of lieux.features) limites.extend((f.geometry as PointGeo).coordinates as [number, number])
    map.fitBounds(limites, { padding: 40, maxZoom: 14, duration: 600 })
  }, [prete, resultats, centreLat, centreLon, rayonKm])

  return <div ref={conteneur} className="h-[520px] w-full rounded-card overflow-hidden shadow-card bg-white" />
}
