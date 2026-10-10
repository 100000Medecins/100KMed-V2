/**
 * Annuaire — fiches publiées et catalogue des compétences, téléchargés par l'application à
 * chaque session (tranche 3). Jamais les portables : seulement s'ils sont disponibles.
 * GET, `Authorization: Bearer <jeton du site>`.
 * Contrat : docs/2026-10-10-annuaire-tranche-3.md
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { authentifierApp, refus, reponse } from '@/lib/annuaire/app-session'

export const dynamic = 'force-dynamic'

const PAGE = 1000

/** Toutes les lignes d'une requête, par pages (PostgREST plafonne à 1 000 par réponse). */
async function toutesLesLignes<T>(page: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const lignes: T[] = []
  for (let de = 0; ; de += PAGE) {
    const { data, error } = await page(de, de + PAGE - 1)
    if (error) throw new Error(error.message)
    lignes.push(...(data ?? []))
    if (!data || data.length < PAGE) return lignes
  }
}

export async function GET(request: Request) {
  const auth = await authentifierApp(request)
  if (auth instanceof NextResponse) return auth

  const admin = createServiceRoleClient()
  try {
    const [fiches, portables, coches, competences] = await Promise.all([
      toutesLesLignes((de, a) =>
        admin
          .from('fiches_annuaire')
          .select(
            'rpps, moyen_contact, ville, code_postal, lat, lon, mssante, telephone_cabinet, mise_a_jour, identite:identites_psc(nom, prenom, specialite_code, compte:users(nom, prenom))',
          )
          .eq('publiee', true)
          .order('rpps')
          .range(de, a),
      ),
      toutesLesLignes((de, a) => admin.from('fiches_annuaire_portables').select('rpps').eq('visible', true).order('rpps').range(de, a)),
      toutesLesLignes((de, a) => admin.from('fiches_intitules').select('rpps, intitule_id').order('rpps').range(de, a)),
      toutesLesLignes((de, a) =>
        admin
          .from('intitules')
          .select('id, libelle, synonymes, groupe, specialites_sm')
          .eq('type', 'competence')
          .eq('statut', 'valide')
          .order('libelle')
          .range(de, a),
      ),
    ])

    const valides = new Set(competences.map((c) => c.id))
    const avecPortable = new Set(portables.map((p) => p.rpps))
    const cochesParRpps = new Map<string, string[]>()
    for (const c of coches) {
      if (!valides.has(c.intitule_id)) continue // propositions en attente : pas encore publiques
      cochesParRpps.set(c.rpps, [...(cochesParRpps.get(c.rpps) ?? []), c.intitule_id])
    }

    return reponse({
      genere_le: new Date().toISOString(),
      fiches: fiches.map((f) => ({
        rpps: f.rpps,
        nom: f.identite?.nom ?? f.identite?.compte?.nom ?? null,
        prenom: f.identite?.prenom ?? f.identite?.compte?.prenom ?? null,
        specialite_code: f.identite?.specialite_code ?? null,
        moyen_contact: f.moyen_contact,
        ville: f.ville,
        code_postal: f.code_postal,
        lat: f.lat,
        lon: f.lon,
        mssante: f.mssante,
        telephone_cabinet: f.telephone_cabinet,
        portable_disponible: avecPortable.has(f.rpps),
        competences: cochesParRpps.get(f.rpps) ?? [],
        mise_a_jour: f.mise_a_jour,
      })),
      competences,
    })
  } catch (e) {
    console.error('[annuaire app] fiches :', e)
    return refus(500, 'erreur_serveur', 'Les fiches n’ont pas pu être lues. Réessayer.')
  }
}
