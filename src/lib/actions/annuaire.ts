'use server'

/**
 * Annuaire mutualisé — « Ma fiche annuaire » (Mon compte).
 *
 * Lectures et écritures avec le client de l'utilisateur (RLS : chacun ne voit et ne
 * modifie que sa fiche). Seule la proposition d'un intitulé passe par le service role,
 * après contrôle : `authenticated` n'a que la lecture sur `intitules`.
 * Référence : docs/2026-10-07-annuaire-tranche-1.md
 */

import { revalidatePath } from 'next/cache'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getAnnuaireActif } from '@/lib/db/settings'
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity/log'
import {
  ANNUAIRE_VERSION_ACCORD,
  MAX_COMPETENCES,
  MAX_PROPOSITIONS_EN_ATTENTE,
  MOYENS_CONTACT,
  type MoyenContact,
} from '@/lib/constants/annuaire'
import { normaliserPortable, normaliserLibelle, normaliserRecherche, codesSmDeSpecialite, afficherPortable } from '@/lib/annuaire/normaliser'
import type { Database } from '@/types/database'

type IntituleRow = Database['public']['Tables']['intitules']['Row']
export type IntituleCatalogue = Pick<IntituleRow, 'id' | 'libelle' | 'synonymes' | 'groupe' | 'specialites_sm' | 'statut'>

const COLONNES_CATALOGUE = 'id, libelle, synonymes, groupe, specialites_sm, statut'

export interface MaFicheAnnuaire {
  userId: string
  /** Preuve de connexion PSC présente : sans elle, aucune fiche possible. */
  verifie: boolean
  specialite: string | null
  codesSm: string[]
  moyenContact: MoyenContact | null
  publiee: boolean
  publieeLe: string | null
  miseAJour: string | null
  portable: string
  portableVisible: boolean
  competences: string[]
  catalogue: IntituleCatalogue[]
}

/** Pour le menu de Mon compte. */
export async function annuaireEstActif(): Promise<boolean> {
  return getAnnuaireActif()
}

export async function getMaFicheAnnuaire(): Promise<MaFicheAnnuaire | null> {
  if (!(await getAnnuaireActif())) return null
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profil, identite, fiche, portable, liens, catalogue] = await Promise.all([
    supabase.from('users').select('specialite').eq('id', user.id).maybeSingle(),
    supabase.from('identites_psc').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('fiches_annuaire').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('fiches_annuaire_portables').select('portable, visible').eq('user_id', user.id).maybeSingle(),
    supabase.from('fiches_intitules').select('intitule_id').eq('user_id', user.id),
    supabase.from('intitules').select(COLONNES_CATALOGUE).eq('type', 'competence').order('libelle'),
  ])

  const specialite = profil.data?.specialite ?? null
  return {
    userId: user.id,
    verifie: !!identite.data,
    specialite,
    codesSm: codesSmDeSpecialite(specialite),
    moyenContact: (fiche.data?.moyen_contact as MoyenContact | null) ?? null,
    publiee: fiche.data?.publiee ?? false,
    publieeLe: fiche.data?.publiee_accord_le ?? null,
    miseAJour: fiche.data?.mise_a_jour ?? null,
    portable: afficherPortable(portable.data?.portable),
    portableVisible: portable.data?.visible ?? false,
    competences: (liens.data ?? []).map((l) => l.intitule_id),
    catalogue: catalogue.data ?? [],
  }
}

async function utilisateurVerifie() {
  if (!(await getAnnuaireActif())) return { error: "L'annuaire n'est pas ouvert." } as const
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Vous devez être connecté.' } as const
  const { data: identite } = await supabase.from('identites_psc').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!identite) return { error: 'Vérifiez d’abord votre identité avec Pro Santé Connect.' } as const
  return { supabase, userId: user.id } as const
}

export async function enregistrerMaFiche(input: {
  moyenContact: string | null
  portable: string
  portableVisible: boolean
  publiee: boolean
  competences: string[]
}): Promise<{ ok: true; publieeLe: string | null; miseAJour: string | null; portable: string } | { error: string }> {
  const ctx = await utilisateurVerifie()
  if (ctx.error) return { error: ctx.error }
  const { supabase, userId } = ctx

  const moyenContact = MOYENS_CONTACT.some((m) => m.valeur === input.moyenContact) ? input.moyenContact : null
  let portable: string | null = null
  if (input.portable.trim()) {
    portable = normaliserPortable(input.portable)
    if (!portable) return { error: 'Numéro de portable non reconnu. Exemple : 06 12 34 56 78.' }
  }
  const competences = Array.from(new Set(input.competences))
  if (competences.length > MAX_COMPETENCES) return { error: `Une fiche compte au plus ${MAX_COMPETENCES} compétences.` }

  // Les dates d'accord sont posées par la base (déclencheurs), jamais ici.
  const { data: fiche, error: errFiche } = await supabase
    .from('fiches_annuaire')
    .upsert(
      {
        user_id: userId,
        moyen_contact: moyenContact,
        publiee: input.publiee,
        publiee_accord_version: input.publiee ? ANNUAIRE_VERSION_ACCORD : null,
      },
      { onConflict: 'user_id' },
    )
    .select('publiee_accord_le, mise_a_jour')
    .single()
  if (errFiche) return { error: `Enregistrement impossible : ${errFiche.message}` }

  if (portable) {
    const { error } = await supabase.from('fiches_annuaire_portables').upsert(
      {
        user_id: userId,
        portable,
        visible: input.portableVisible,
        visible_accord_version: input.portableVisible ? ANNUAIRE_VERSION_ACCORD : null,
      },
      { onConflict: 'user_id' },
    )
    if (error) return { error: `Portable non enregistré : ${error.message}` }
  } else {
    const { error } = await supabase.from('fiches_annuaire_portables').delete().eq('user_id', userId)
    if (error) return { error: `Portable non effacé : ${error.message}` }
  }

  const { data: liens, error: errLiens } = await supabase.from('fiches_intitules').select('intitule_id').eq('user_id', userId)
  if (errLiens) return { error: `Compétences non enregistrées : ${errLiens.message}` }
  const actuelles = new Set((liens ?? []).map((l) => l.intitule_id))
  const aRetirer = Array.from(actuelles).filter((id) => !competences.includes(id))
  const aAjouter = competences.filter((id) => !actuelles.has(id))

  if (aRetirer.length > 0) {
    const { error } = await supabase.from('fiches_intitules').delete().eq('user_id', userId).in('intitule_id', aRetirer)
    if (error) return { error: `Compétences non retirées : ${error.message}` }
    // Une proposition en attente que son auteur retire de sa fiche est abandonnée.
    await createServiceRoleClient()
      .from('intitules')
      .delete()
      .in('id', aRetirer)
      .eq('statut', 'propose')
      .eq('propose_par', userId)
  }
  if (aAjouter.length > 0) {
    const { error } = await supabase
      .from('fiches_intitules')
      .insert(aAjouter.map((intitule_id) => ({ user_id: userId, intitule_id })))
    if (error) return { error: `Compétences non ajoutées : ${error.message}` }
  }

  revalidatePath('/mon-compte/annuaire')
  return { ok: true, publieeLe: fiche.publiee_accord_le, miseAJour: fiche.mise_a_jour, portable: afficherPortable(portable) }
}

/**
 * Propose un intitulé manquant. Renvoie l'intitulé existant s'il y en a déjà un
 * (même libellé ou synonyme, accents et casse ignorés) ; sinon crée la proposition
 * (statut `propose`) et la coche sur la fiche du médecin.
 */
export async function proposerCompetence(
  saisie: string,
): Promise<{ intitule: IntituleCatalogue } | { existant: IntituleCatalogue } | { error: string }> {
  const ctx = await utilisateurVerifie()
  if (ctx.error) return { error: ctx.error }
  const { userId } = ctx

  const libelle = normaliserLibelle(saisie)
  if (libelle.length < 2 || libelle.length > 120) return { error: 'Un intitulé compte de 2 à 120 caractères.' }

  const admin = createServiceRoleClient()
  const { data: tous, error: errTous } = await admin
    .from('intitules')
    .select(`${COLONNES_CATALOGUE}, propose_par`)
    .eq('type', 'competence')
  if (errTous) return { error: errTous.message }

  const cible = normaliserRecherche(libelle)
  const correspond = (i: Pick<IntituleRow, 'libelle' | 'synonymes'>) =>
    normaliserRecherche(i.libelle) === cible || i.synonymes.some((s) => normaliserRecherche(s) === cible)

  const existant = tous.find((i) => (i.statut === 'valide' || i.propose_par === userId) && correspond(i))
  if (existant) {
    const { id, libelle: lib, synonymes, groupe, specialites_sm, statut } = existant
    return { existant: { id, libelle: lib, synonymes, groupe, specialites_sm, statut } }
  }
  if (tous.some((i) => i.statut === 'propose' && correspond(i))) {
    return { error: 'Cet intitulé a déjà été proposé par un confrère et attend sa validation.' }
  }
  if (tous.filter((i) => i.statut === 'propose' && i.propose_par === userId).length >= MAX_PROPOSITIONS_EN_ATTENTE) {
    return { error: `Vous avez déjà ${MAX_PROPOSITIONS_EN_ATTENTE} propositions en attente de validation.` }
  }

  const { count } = await admin.from('fiches_intitules').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  if ((count ?? 0) >= MAX_COMPETENCES) return { error: `Une fiche compte au plus ${MAX_COMPETENCES} compétences.` }

  const { error: errFiche } = await admin
    .from('fiches_annuaire')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (errFiche) return { error: errFiche.message }

  const { data: cree, error: errCree } = await admin
    .from('intitules')
    .insert({ type: 'competence', libelle, statut: 'propose', propose_par: userId })
    .select(COLONNES_CATALOGUE)
    .single()
  if (errCree) return { error: errCree.message }

  const { error: errLien } = await admin.from('fiches_intitules').insert({ user_id: userId, intitule_id: cree.id })
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

  revalidatePath('/mon-compte/annuaire')
  return { intitule: cree }
}
