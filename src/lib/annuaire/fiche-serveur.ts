import 'server-only'

/**
 * Annuaire — la fiche d'un médecin, par RPPS, côté serveur (service role, après contrôle de
 * l'identité par l'appelant). Un seul code pour « Ma fiche » du site (identité : la session et
 * sa preuve PSC) et pour l'application (identité : son jeton PSC vérifié).
 * Référence : docs/2026-10-10-annuaire-tranche-3.md
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity/log'
import {
  ANNUAIRE_VERSION_ACCORD,
  MAX_COMPETENCES,
  MAX_PROPOSITIONS_EN_ATTENTE,
  MOYENS_CONTACT,
  type MoyenContact,
} from '@/lib/constants/annuaire'
import {
  normaliserPortable,
  normaliserTelephone,
  normaliserMssante,
  normaliserLibelle,
  normaliserRecherche,
} from '@/lib/annuaire/normaliser'
import type { Commune } from '@/lib/annuaire/geocodage'
import type { Database } from '@/types/database'

type IntituleRow = Database['public']['Tables']['intitules']['Row']
export type IntituleCatalogue = Pick<IntituleRow, 'id' | 'libelle' | 'synonymes' | 'groupe' | 'specialites_sm' | 'statut'>

const COLONNES_CATALOGUE = 'id, libelle, synonymes, groupe, specialites_sm, statut'

export interface FicheAnnuaire {
  moyenContact: MoyenContact | null
  publiee: boolean
  publieeLe: string | null
  miseAJour: string | null
  /** Format international (+33…), ou null */
  portable: string | null
  portableVisible: boolean
  commune: Commune | null
  mssante: string | null
  /** Format international (+33…), ou null */
  telephoneCabinet: string | null
  /** Identifiants des intitulés cochés (validés, ou proposés par le médecin) */
  competences: string[]
}

export interface SaisieFiche {
  moyenContact: string | null
  portable: string
  portableVisible: boolean
  publiee: boolean
  competences: string[]
  commune: Commune | null
  mssante: string
  telephoneCabinet: string
}

export interface LieuAns {
  nom: string | null
  voie: string | null
  codePostal: string | null
  commune: string | null
  telephones: string[]
  lat: number | null
  lon: number | null
}

export interface PropositionsAns {
  version: string
  lieux: LieuAns[]
  mssante: string[]
}

/** Lieux et adresses MSSanté que l'Annuaire Santé connaît pour ce RPPS : proposés, à confirmer. */
export async function propositionsAnsPour(rpps: string): Promise<PropositionsAns | null> {
  const admin = createServiceRoleClient()
  const { data: courante } = await admin.from('ans_version').select('lot, version').eq('cle', 'courante').maybeSingle()
  if (!courante) return null
  const [{ data: liens }, { data: bal }] = await Promise.all([
    admin.from('ans_exerce').select('site_id').eq('lot', courante.lot).eq('rpps', rpps),
    admin.from('ans_mssante').select('adresse').eq('lot', courante.lot).eq('rpps', rpps).order('adresse'),
  ])
  const ids = (liens ?? []).map((l) => l.site_id)
  const { data: sites } = ids.length
    ? await admin.from('ans_sites').select('nom, voie, code_postal, commune, telephones, lat, lon').eq('lot', courante.lot).in('id', ids)
    : { data: [] }
  return {
    version: courante.version,
    lieux: (sites ?? []).map((s) => ({
      nom: s.nom,
      voie: s.voie,
      codePostal: s.code_postal,
      commune: s.commune,
      telephones: s.telephones,
      lat: s.lat,
      lon: s.lon,
    })),
    mssante: (bal ?? []).map((b) => b.adresse),
  }
}

type Resultat<T> = ({ ok: true } & T) | { error: string }

/** La fiche du médecin (null s'il n'en a pas encore). */
export async function lireFiche(rpps: string): Promise<FicheAnnuaire | null> {
  const admin = createServiceRoleClient()
  const [fiche, portable, liens] = await Promise.all([
    admin.from('fiches_annuaire').select('*').eq('rpps', rpps).maybeSingle(),
    admin.from('fiches_annuaire_portables').select('portable, visible').eq('rpps', rpps).maybeSingle(),
    admin.from('fiches_intitules').select('intitule_id').eq('rpps', rpps),
  ])
  const f = fiche.data
  if (!f) return null
  return {
    moyenContact: (f.moyen_contact as MoyenContact | null) ?? null,
    publiee: f.publiee,
    publieeLe: f.publiee_accord_le,
    miseAJour: f.mise_a_jour,
    portable: portable.data?.portable ?? null,
    portableVisible: portable.data?.visible ?? false,
    commune:
      f.ville && f.lat != null && f.lon != null
        ? { ville: f.ville, codePostal: f.code_postal ?? '', communeInsee: f.commune_insee ?? '', lat: f.lat, lon: f.lon }
        : null,
    mssante: f.mssante,
    telephoneCabinet: f.telephone_cabinet,
    competences: (liens.data ?? []).map((l) => l.intitule_id),
  }
}

/** Catalogue visible du médecin : compétences validées et ses propres propositions en attente. */
export async function catalogueDe(rpps: string): Promise<IntituleCatalogue[]> {
  const { data } = await createServiceRoleClient()
    .from('intitules')
    .select(COLONNES_CATALOGUE)
    .eq('type', 'competence')
    .or(`statut.eq.valide,propose_par_rpps.eq.${rpps}`)
    .order('libelle')
  return data ?? []
}

/**
 * Enregistre la fiche (création ou mise à jour). Les dates d'accord sont posées par la base
 * (déclencheurs), avec la version des textes d'accord en vigueur.
 */
export async function enregistrerFiche(
  rpps: string,
  saisie: SaisieFiche,
): Promise<Resultat<{ publieeLe: string | null; miseAJour: string | null; portable: string | null; telephoneCabinet: string | null }>> {
  const moyenContact = MOYENS_CONTACT.some((m) => m.valeur === saisie.moyenContact) ? saisie.moyenContact : null
  let portable: string | null = null
  if (saisie.portable.trim()) {
    portable = normaliserPortable(saisie.portable)
    if (!portable) return { error: 'Numéro de portable non reconnu. Exemple : 06 12 34 56 78.' }
  }
  let telephoneCabinet: string | null = null
  if (saisie.telephoneCabinet.trim()) {
    telephoneCabinet = normaliserTelephone(saisie.telephoneCabinet)
    if (!telephoneCabinet) return { error: 'Téléphone du cabinet non reconnu. Exemple : 01 23 45 67 89.' }
  }
  let mssante: string | null = null
  if (saisie.mssante.trim()) {
    mssante = normaliserMssante(saisie.mssante)
    if (!mssante) return { error: 'Adresse MSSanté non reconnue. Exemple : prenom.nom@medecin.mssante.fr.' }
  }
  const c = saisie.commune
  if (c && !(c.ville && Number.isFinite(c.lat) && Number.isFinite(c.lon) && Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180)) {
    return { error: 'Commune non reconnue : choisissez-la dans la liste proposée.' }
  }
  const competences = Array.from(new Set(saisie.competences))
  if (competences.length > MAX_COMPETENCES) return { error: `Une fiche compte au plus ${MAX_COMPETENCES} compétences.` }

  const admin = createServiceRoleClient()
  // Compétences cochables : validées, ou proposées par ce médecin
  if (competences.length > 0) {
    const { data: permises } = await admin
      .from('intitules')
      .select('id')
      .in('id', competences)
      .or(`statut.eq.valide,propose_par_rpps.eq.${rpps}`)
    if ((permises ?? []).length !== competences.length) return { error: 'Compétence inconnue : rechargez la page.' }
  }

  const { data: fiche, error: errFiche } = await admin
    .from('fiches_annuaire')
    .upsert(
      {
        rpps,
        moyen_contact: moyenContact,
        publiee: saisie.publiee,
        publiee_accord_version: saisie.publiee ? ANNUAIRE_VERSION_ACCORD : null,
        ville: c?.ville ?? null,
        code_postal: c && /^[0-9]{5}$/.test(c.codePostal) ? c.codePostal : null,
        commune_insee: c && /^[0-9][0-9AB][0-9]{3}$/.test(c.communeInsee) ? c.communeInsee : null,
        lat: c?.lat ?? null,
        lon: c?.lon ?? null,
        mssante,
        telephone_cabinet: telephoneCabinet,
      },
      { onConflict: 'rpps' },
    )
    .select('publiee_accord_le, mise_a_jour')
    .single()
  if (errFiche) return { error: `Enregistrement impossible : ${errFiche.message}` }

  if (portable) {
    const { error } = await admin.from('fiches_annuaire_portables').upsert(
      {
        rpps,
        portable,
        visible: saisie.portableVisible,
        visible_accord_version: saisie.portableVisible ? ANNUAIRE_VERSION_ACCORD : null,
      },
      { onConflict: 'rpps' },
    )
    if (error) return { error: `Portable non enregistré : ${error.message}` }
  } else {
    const { error } = await admin.from('fiches_annuaire_portables').delete().eq('rpps', rpps)
    if (error) return { error: `Portable non effacé : ${error.message}` }
  }

  const { data: liens, error: errLiens } = await admin.from('fiches_intitules').select('intitule_id').eq('rpps', rpps)
  if (errLiens) return { error: `Compétences non enregistrées : ${errLiens.message}` }
  const actuelles = new Set((liens ?? []).map((l) => l.intitule_id))
  const aRetirer = Array.from(actuelles).filter((id) => !competences.includes(id))
  const aAjouter = competences.filter((id) => !actuelles.has(id))

  if (aRetirer.length > 0) {
    const { error } = await admin.from('fiches_intitules').delete().eq('rpps', rpps).in('intitule_id', aRetirer)
    if (error) return { error: `Compétences non retirées : ${error.message}` }
    // Une proposition en attente que son auteur retire de sa fiche est abandonnée.
    await admin.from('intitules').delete().in('id', aRetirer).eq('statut', 'propose').eq('propose_par_rpps', rpps)
  }
  if (aAjouter.length > 0) {
    const { error } = await admin.from('fiches_intitules').insert(aAjouter.map((intitule_id) => ({ rpps, intitule_id })))
    if (error) return { error: `Compétences non ajoutées : ${error.message}` }
  }

  return {
    ok: true,
    publieeLe: fiche.publiee_accord_le,
    miseAJour: fiche.mise_a_jour,
    portable,
    telephoneCabinet,
  }
}

/**
 * Propose un intitulé manquant. Renvoie l'intitulé existant s'il y en a déjà un (même libellé
 * ou synonyme, accents et casse ignorés) ; sinon crée la proposition (statut `propose`) et la
 * coche sur la fiche du médecin (créée vide au besoin, non publiée).
 */
export async function proposerCompetence(
  rpps: string,
  saisie: string,
): Promise<{ intitule: IntituleCatalogue } | { existant: IntituleCatalogue } | { error: string }> {
  const libelle = normaliserLibelle(saisie)
  if (libelle.length < 2 || libelle.length > 120) return { error: 'Un intitulé compte de 2 à 120 caractères.' }

  const admin = createServiceRoleClient()
  const { data: tous, error: errTous } = await admin
    .from('intitules')
    .select(`${COLONNES_CATALOGUE}, propose_par_rpps`)
    .eq('type', 'competence')
  if (errTous) return { error: errTous.message }

  const cible = normaliserRecherche(libelle)
  const correspond = (i: Pick<IntituleRow, 'libelle' | 'synonymes'>) =>
    normaliserRecherche(i.libelle) === cible || i.synonymes.some((s) => normaliserRecherche(s) === cible)

  const existant = tous.find((i) => (i.statut === 'valide' || i.propose_par_rpps === rpps) && correspond(i))
  if (existant) {
    const { id, libelle: lib, synonymes, groupe, specialites_sm, statut } = existant
    return { existant: { id, libelle: lib, synonymes, groupe, specialites_sm, statut } }
  }
  if (tous.some((i) => i.statut === 'propose' && correspond(i))) {
    return { error: 'Cet intitulé a déjà été proposé par un confrère et attend sa validation.' }
  }
  if (tous.filter((i) => i.statut === 'propose' && i.propose_par_rpps === rpps).length >= MAX_PROPOSITIONS_EN_ATTENTE) {
    return { error: `Vous avez déjà ${MAX_PROPOSITIONS_EN_ATTENTE} propositions en attente de validation.` }
  }

  const { count } = await admin.from('fiches_intitules').select('*', { count: 'exact', head: true }).eq('rpps', rpps)
  if ((count ?? 0) >= MAX_COMPETENCES) return { error: `Une fiche compte au plus ${MAX_COMPETENCES} compétences.` }

  const { error: errFiche } = await admin.from('fiches_annuaire').upsert({ rpps }, { onConflict: 'rpps', ignoreDuplicates: true })
  if (errFiche) return { error: errFiche.message }

  const { data: cree, error: errCree } = await admin
    .from('intitules')
    .insert({ type: 'competence', libelle, statut: 'propose', propose_par_rpps: rpps })
    .select(COLONNES_CATALOGUE)
    .single()
  if (errCree) return { error: errCree.message }

  const { error: errLien } = await admin.from('fiches_intitules').insert({ rpps, intitule_id: cree.id })
  if (errLien) return { error: errLien.message }

  // Sans l'auteur : la charte promet d'effacer le lien proposition ↔ auteur à la décision,
  // le journal (gardé 12 mois) ne doit pas le conserver. L'auteur se voit dans /admin/intitules.
  await logActivity({
    type: ACTIVITY_TYPES.PROPOSITION,
    acteurType: 'medecin',
    cibleType: 'intitule',
    cibleId: cree.id,
    cibleLabel: libelle,
    gravite: 'a_moderer',
  })

  return { intitule: cree }
}

/** Supprime la fiche (portable et compétences cochées en cascade) et les propositions en attente. */
export async function supprimerFiche(rpps: string): Promise<Resultat<object>> {
  const admin = createServiceRoleClient()
  await admin.from('intitules').delete().eq('propose_par_rpps', rpps).eq('statut', 'propose')
  const { error } = await admin.from('fiches_annuaire').delete().eq('rpps', rpps)
  if (error) return { error: error.message }
  return { ok: true }
}
