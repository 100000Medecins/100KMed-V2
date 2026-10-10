import 'server-only'

/**
 * Annuaire — identification de l'application (tranche 3, option A).
 *
 * 1. L'application présente son jeton d'accès PSC (obtenu par le relais, dont le client PSC
 *    n'est pas celui du site en production) : le site vérifie qu'il a été émis pour le client de
 *    l'application et pour son environnement, puis le fait valider par PSC (`userinfo`), qui
 *    donne le RPPS, la profession, le nom et la spécialité.
 * 2. Le site rend un jeton à lui, signé (HMAC, `ANNUAIRE_APP_SECRET`), valable 30 minutes.
 * 3. Chaque appel de l'application présente ce jeton : il est contrôlé, et l'identité doit
 *    toujours exister (compte supprimé entre-temps → refus).
 *
 * Pas de compte du site pour l'application : l'identité est le RPPS (`identites_psc`).
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { PSC_ENDPOINTS, PSC_ENV, extractCodeProfession, extractRpps } from '@/lib/auth/psc'
import { extractSpecialiteCode } from '@/lib/auth/psc-specialites'
import { getAnnuaireActif } from '@/lib/db/settings'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { InfosPsc } from '@/lib/annuaire/identite-psc'

export const DUREE_JETON_APP_S = 30 * 60

/** Réponse d'erreur de l'API de l'application : `{ erreur, detail }`. */
export function refus(statut: number, erreur: string, detail: string) {
  return NextResponse.json({ erreur, detail }, { status: statut, headers: { 'Cache-Control': 'no-store' } })
}

export function reponse(corps: unknown, statut = 200) {
  return NextResponse.json(corps, { status: statut, headers: { 'Cache-Control': 'no-store' } })
}

function base64url(donnees: Buffer | string): string {
  return Buffer.from(donnees).toString('base64url')
}

function secret(): string {
  const s = process.env.ANNUAIRE_APP_SECRET
  if (!s || s.length < 32) throw new Error('ANNUAIRE_APP_SECRET absente ou trop courte')
  return s
}

function signer(charge: string): string {
  return createHmac('sha256', secret()).update(`annuaire-app.${charge}`).digest('base64url')
}

/** Jeton du site remis à l'application : `v1.<charge>.<signature>`. */
export function creerJetonApp(rpps: string): { jeton: string; expireDans: number } {
  const charge = base64url(JSON.stringify({ r: rpps, e: Math.floor(Date.now() / 1000) + DUREE_JETON_APP_S }))
  return { jeton: `v1.${charge}.${signer(charge)}`, expireDans: DUREE_JETON_APP_S }
}

function lireJetonApp(jeton: string): { rpps: string } | null {
  const [version, charge, signature] = jeton.split('.')
  if (version !== 'v1' || !charge || !signature) return null
  const attendue = Buffer.from(signer(charge))
  const recue = Buffer.from(signature)
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null
  try {
    const { r, e } = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8')) as { r?: unknown; e?: unknown }
    if (typeof r !== 'string' || !/^[0-9]{11}$/.test(r) || typeof e !== 'number' || e < Date.now() / 1000) return null
    return { rpps: r }
  } catch {
    return null
  }
}

function jetonPorteur(request: Request): string | null {
  const entete = request.headers.get('authorization') ?? ''
  const m = /^Bearer\s+(\S+)$/i.exec(entete)
  return m ? m[1] : null
}

/**
 * Contrôle d'un appel de l'application : annuaire ouvert, jeton du site valide, identité de
 * médecin toujours présente. Renvoie le RPPS du lecteur, ou la réponse de refus à renvoyer.
 */
export async function authentifierApp(request: Request): Promise<{ rpps: string } | NextResponse> {
  if (!(await getAnnuaireActif())) return refus(404, 'annuaire_ferme', "L'annuaire n'est pas ouvert.")
  const jeton = jetonPorteur(request)
  const lu = jeton ? lireJetonApp(jeton) : null
  if (!lu) return refus(401, 'jeton_invalide', 'Jeton absent, invalide ou expiré : ouvrir une nouvelle session.')
  const { data: identite } = await createServiceRoleClient()
    .from('identites_psc')
    .select('code_profession')
    .eq('rpps', lu.rpps)
    .maybeSingle()
  if (!identite) return refus(401, 'identite_inconnue', 'Identité inconnue : ouvrir une nouvelle session.')
  if ((identite.code_profession ?? '10') !== '10') {
    return refus(403, 'profession_non_admise', "L'annuaire est réservé aux médecins.")
  }
  return lu
}

/** Adresse `userinfo` de PSC ; remplaçable pour les essais locaux seulement (faux PSC), jamais chez Vercel. */
function adresseUserinfo(): string {
  const essai = process.env.PSC_USERINFO_URL_ESSAI
  return essai && !process.env.VERCEL ? essai : PSC_ENDPOINTS.userinfo
}

/** Émetteur attendu des jetons PSC (même environnement que le site). */
function emetteurAttendu(): string {
  return PSC_ENDPOINTS.userinfo.replace(/\/protocol\/openid-connect\/userinfo$/, '')
}

/**
 * Client PSC de l'application (relais de la messagerie, flux CIBA), par environnement PSC.
 * En production ce n'est pas celui du site (`NEXT_PUBLIC_PSC_CLIENT_ID` = `100000medecins`) ;
 * au bac à sable, le site et l'application partagent le même.
 */
const CLIENT_PSC_APPLICATION = {
  bas: '100000medecins-100000medecins-org-bas',
  production: '100000medecins-100000medecins-org',
} as const

type VerificationPsc = { ok: true; infos: InfosPsc } | { ok: false; statut: number; erreur: string; detail: string }

/**
 * Vérifie un jeton d'accès PSC présenté par l'application : client émetteur (`azp`) = client
 * PSC de l'application, émetteur (`iss`) = environnement PSC du site, non expiré ; puis
 * validation par PSC (`userinfo`), qui fait foi pour l'identité.
 */
export async function verifierJetonPsc(jeton: string): Promise<VerificationPsc> {
  let charge: { azp?: unknown; iss?: unknown; exp?: unknown }
  try {
    charge = JSON.parse(Buffer.from(jeton.split('.')[1] ?? '', 'base64url').toString('utf8'))
  } catch {
    return { ok: false, statut: 401, erreur: 'jeton_psc_illisible', detail: "Ce n'est pas un jeton d'accès PSC." }
  }
  const clientAttendu = CLIENT_PSC_APPLICATION[PSC_ENV]
  if (charge.azp !== clientAttendu) {
    return {
      ok: false,
      statut: 401,
      erreur: 'jeton_psc_autre_client',
      detail: `Jeton PSC émis pour un autre client que celui de l'application (attendu : ${clientAttendu}).`,
    }
  }
  if (charge.iss !== emetteurAttendu()) {
    return { ok: false, statut: 401, erreur: 'jeton_psc_autre_environnement', detail: 'Jeton PSC d’un autre environnement (bac à sable / production).' }
  }
  if (typeof charge.exp !== 'number' || charge.exp < Date.now() / 1000) {
    return { ok: false, statut: 401, erreur: 'jeton_psc_expire', detail: 'Jeton PSC expiré : en obtenir un nouveau auprès du relais.' }
  }

  let userInfo: Record<string, unknown>
  try {
    const res = await fetch(adresseUserinfo(), { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' })
    if (res.status === 401 || res.status === 403) {
      return { ok: false, statut: 401, erreur: 'jeton_psc_refuse', detail: 'PSC refuse ce jeton (session terminée ou révoquée).' }
    }
    if (!res.ok) return { ok: false, statut: 502, erreur: 'psc_indisponible', detail: `PSC indisponible (HTTP ${res.status}).` }
    userInfo = (await res.json()) as Record<string, unknown>
  } catch {
    return { ok: false, statut: 502, erreur: 'psc_indisponible', detail: 'PSC injoignable.' }
  }

  const rpps = extractRpps(userInfo)
  if (!rpps || !/^[0-9]{11}$/.test(rpps)) {
    return { ok: false, statut: 403, erreur: 'rpps_absent', detail: 'PSC ne donne pas de RPPS pour cette identité.' }
  }
  const codeProfession = extractCodeProfession(userInfo)
  if (codeProfession && codeProfession !== '10') {
    return { ok: false, statut: 403, erreur: 'profession_non_admise', detail: "L'annuaire est réservé aux médecins pour l'instant." }
  }
  return {
    ok: true,
    infos: {
      rpps,
      codeProfession,
      nom: typeof userInfo.family_name === 'string' ? userInfo.family_name : null,
      prenom: typeof userInfo.given_name === 'string' ? userInfo.given_name : null,
      specialiteCode: extractSpecialiteCode(userInfo),
    },
  }
}

export { jetonPorteur }
