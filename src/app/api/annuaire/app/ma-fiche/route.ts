/**
 * Annuaire — la fiche du médecin connecté, depuis l'application (tranche 3).
 * GET : fiche, catalogue, textes d'accord, propositions de l'Annuaire Santé.
 * PUT : enregistrement (mêmes contrôles et accords que le site).
 * DELETE : suppression de la fiche.
 * `Authorization: Bearer <jeton du site>`. Contrat : docs/2026-10-10-annuaire-tranche-3.md
 */

import { NextResponse } from 'next/server'
import { authentifierApp, refus, reponse } from '@/lib/annuaire/app-session'
import {
  catalogueDe,
  enregistrerFiche,
  lireFiche,
  propositionsAnsPour,
  supprimerFiche,
  type SaisieFiche,
} from '@/lib/annuaire/fiche-serveur'
import {
  ANNUAIRE_VERSION_ACCORD,
  MAX_COMPETENCES,
  MAX_PROPOSITIONS_EN_ATTENTE,
  MOYENS_CONTACT,
  TEXTE_ACCORD_PORTABLE,
  TEXTE_ACCORD_PUBLICATION,
} from '@/lib/constants/annuaire'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await authentifierApp(request)
  if (auth instanceof NextResponse) return auth

  const [fiche, catalogue, ans] = await Promise.all([lireFiche(auth.rpps), catalogueDe(auth.rpps), propositionsAnsPour(auth.rpps)])
  return reponse({
    rpps: auth.rpps,
    fiche: fiche && {
      moyen_contact: fiche.moyenContact,
      publiee: fiche.publiee,
      publiee_le: fiche.publieeLe,
      mise_a_jour: fiche.miseAJour,
      portable: fiche.portable,
      portable_visible: fiche.portableVisible,
      commune: fiche.commune && {
        ville: fiche.commune.ville,
        code_postal: fiche.commune.codePostal || null,
        commune_insee: fiche.commune.communeInsee || null,
        lat: fiche.commune.lat,
        lon: fiche.commune.lon,
      },
      mssante: fiche.mssante,
      telephone_cabinet: fiche.telephoneCabinet,
      competences: fiche.competences,
    },
    catalogue,
    accord: { version: ANNUAIRE_VERSION_ACCORD, publication: TEXTE_ACCORD_PUBLICATION, portable: TEXTE_ACCORD_PORTABLE },
    moyens_contact: MOYENS_CONTACT,
    limites: { competences: MAX_COMPETENCES, propositions_en_attente: MAX_PROPOSITIONS_EN_ATTENTE },
    annuaire_sante: ans,
  })
}

const texte = (v: unknown) => (typeof v === 'string' ? v : '')

/** Corps du PUT (noms de l'API) → saisie du module serveur ; null si mal formé. */
function lireSaisie(corps: Record<string, unknown>): SaisieFiche | null {
  const competences = corps.competences
  if (!Array.isArray(competences) || !competences.every((c) => typeof c === 'string')) return null
  if (typeof corps.publiee !== 'boolean' || typeof corps.portable_visible !== 'boolean') return null
  const c = corps.commune as Record<string, unknown> | null | undefined
  let commune: SaisieFiche['commune'] = null
  if (c) {
    if (typeof c.ville !== 'string' || typeof c.lat !== 'number' || typeof c.lon !== 'number') return null
    commune = { ville: c.ville, codePostal: texte(c.code_postal), communeInsee: texte(c.commune_insee), lat: c.lat, lon: c.lon }
  }
  return {
    moyenContact: typeof corps.moyen_contact === 'string' ? corps.moyen_contact : null,
    portable: texte(corps.portable),
    portableVisible: corps.portable_visible,
    publiee: corps.publiee,
    competences: competences as string[],
    commune,
    mssante: texte(corps.mssante),
    telephoneCabinet: texte(corps.telephone_cabinet),
  }
}

export async function PUT(request: Request) {
  const auth = await authentifierApp(request)
  if (auth instanceof NextResponse) return auth

  const corps = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const saisie = corps && lireSaisie(corps)
  if (!corps || !saisie) return refus(400, 'corps_invalide', 'Corps JSON non conforme au contrat (voir la documentation).')

  // Un accord (publication, portable) ne vaut que pour les textes affichés au médecin
  if ((saisie.publiee || saisie.portableVisible) && corps.accord_version !== ANNUAIRE_VERSION_ACCORD) {
    return refus(409, 'accord_perime', `Textes d'accord modifiés : afficher ceux de la version ${ANNUAIRE_VERSION_ACCORD}.`)
  }

  const res = await enregistrerFiche(auth.rpps, saisie)
  if ('error' in res) return refus(422, 'saisie_refusee', res.error)
  return reponse({
    publiee_le: res.publieeLe,
    mise_a_jour: res.miseAJour,
    portable: res.portable,
    telephone_cabinet: res.telephoneCabinet,
  })
}

export async function DELETE(request: Request) {
  const auth = await authentifierApp(request)
  if (auth instanceof NextResponse) return auth
  const res = await supprimerFiche(auth.rpps)
  if ('error' in res) return refus(500, 'erreur_serveur', res.error)
  return reponse({ supprimee: true })
}
