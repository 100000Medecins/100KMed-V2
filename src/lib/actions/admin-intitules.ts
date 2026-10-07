'use server'

/**
 * Administration du catalogue de l'annuaire : décisions sur les intitulés proposés
 * par les médecins (Accepter / Reformuler, Fusionner comme synonyme, Refuser), et
 * gestion des compétences validées (ajouter, modifier, supprimer).
 * Chaque décision efface le lien avec l'auteur (promesse de la charte) : acceptée,
 * la proposition perd `propose_par` ; fusionnée ou refusée, elle est supprimée.
 */

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { normaliserLibelle, normaliserRecherche } from '@/lib/annuaire/normaliser'

type Resultat = { ok: true } | { error: string }

function revalider() {
  revalidatePath('/admin/intitules')
  revalidatePath('/admin', 'layout') // badges de la navigation
  revalidatePath('/mon-compte/annuaire')
}

/** L'événement « proposition » du flux Activité est traité : on le marque lu. */
async function marquerEvenementLu(admin: ReturnType<typeof createServiceRoleClient>, intituleId: string) {
  await admin.from('activity_log').update({ lu: true }).eq('cible_type', 'intitule').eq('cible_id', intituleId)
}

function nettoyerSynonymes(synonymes: string[]): string[] {
  return Array.from(new Set(synonymes.map(normaliserRecherche).filter((s) => s.length > 0)))
}

/** Accepte une proposition, telle quelle ou reformulée (libellé, synonymes, rubrique). */
export async function accepterIntitule(
  id: string,
  input: { libelle: string; synonymes: string[]; groupe: string | null },
): Promise<Resultat> {
  await assertAdmin()
  const libelle = normaliserLibelle(input.libelle)
  if (libelle.length < 2 || libelle.length > 120) return { error: 'Un intitulé compte de 2 à 120 caractères.' }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('intitules')
    .update({
      libelle,
      synonymes: nettoyerSynonymes(input.synonymes),
      groupe: input.groupe?.trim() || null,
      statut: 'valide',
      propose_par: null,
      decide_le: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('statut', 'propose')
    .select('id')
  if (error) {
    if (error.code === '23505') return { error: 'Un intitulé porte déjà ce nom : utilisez « Fusionner ».' }
    return { error: error.message }
  }
  if (!data || data.length === 0) return { error: 'Proposition introuvable (déjà traitée ?).' }

  await marquerEvenementLu(admin, id)
  revalider()
  return { ok: true }
}

/**
 * Fusionne une proposition dans un intitulé validé : le libellé proposé devient un synonyme
 * de la cible, les médecins qui l'avaient coché reçoivent la cible, la proposition disparaît.
 */
export async function fusionnerIntitule(id: string, cibleId: string): Promise<Resultat> {
  await assertAdmin()
  const admin = createServiceRoleClient()

  const [{ data: proposition }, { data: cible }] = await Promise.all([
    admin.from('intitules').select('id, libelle').eq('id', id).eq('statut', 'propose').maybeSingle(),
    admin.from('intitules').select('id, synonymes').eq('id', cibleId).eq('statut', 'valide').maybeSingle(),
  ])
  if (!proposition) return { error: 'Proposition introuvable (déjà traitée ?).' }
  if (!cible) return { error: 'Intitulé cible introuvable.' }

  const { data: liens, error: errLiens } = await admin.from('fiches_intitules').select('user_id').eq('intitule_id', id)
  if (errLiens) return { error: errLiens.message }

  const { error: errSyn } = await admin
    .from('intitules')
    .update({ synonymes: nettoyerSynonymes([...cible.synonymes, proposition.libelle]) })
    .eq('id', cibleId)
  if (errSyn) return { error: errSyn.message }

  // Suppression d'abord (les liens partent en cascade) : la cible ne fait alors jamais
  // dépasser le plafond de 20 compétences d'une fiche.
  const { error: errDel } = await admin.from('intitules').delete().eq('id', id)
  if (errDel) return { error: errDel.message }

  if (liens && liens.length > 0) {
    const { error: errIns } = await admin
      .from('fiches_intitules')
      .upsert(
        liens.map((l) => ({ user_id: l.user_id, intitule_id: cibleId })),
        { onConflict: 'user_id,intitule_id', ignoreDuplicates: true },
      )
    if (errIns) return { error: `Fusion faite, mais la compétence n'a pas été reportée sur toutes les fiches : ${errIns.message}` }
  }

  await marquerEvenementLu(admin, id)
  revalider()
  return { ok: true }
}

// ────────────────────────────────────────────
// Catalogue (onglet « Catalogue ») : compétences validées
// ────────────────────────────────────────────

function nettoyerCodesSm(codes: string[]): string[] | null {
  const propres = Array.from(new Set(codes.map((c) => c.trim().toUpperCase().replace(/\s+/g, '')).filter(Boolean)))
  return propres.every((c) => /^SM\d{2}$/.test(c)) ? propres : null
}

export async function ajouterIntitule(input: { libelle: string; synonymes: string[]; groupe: string | null }): Promise<Resultat> {
  await assertAdmin()
  const libelle = normaliserLibelle(input.libelle)
  if (libelle.length < 2 || libelle.length > 120) return { error: 'Un intitulé compte de 2 à 120 caractères.' }

  const { error } = await createServiceRoleClient().from('intitules').insert({
    type: 'competence',
    libelle,
    synonymes: nettoyerSynonymes(input.synonymes),
    groupe: input.groupe?.trim() || null,
    statut: 'valide',
    decide_le: new Date().toISOString(),
  })
  if (error) return { error: error.code === '23505' ? 'Une compétence porte déjà ce nom.' : error.message }
  revalider()
  return { ok: true }
}

export async function modifierIntitule(
  id: string,
  input: { libelle: string; synonymes: string[]; groupe: string | null; specialitesSm: string[] },
): Promise<Resultat> {
  await assertAdmin()
  const libelle = normaliserLibelle(input.libelle)
  if (libelle.length < 2 || libelle.length > 120) return { error: 'Un intitulé compte de 2 à 120 caractères.' }
  const specialitesSm = nettoyerCodesSm(input.specialitesSm)
  if (!specialitesSm) return { error: 'Codes de spécialité attendus sous la forme SM57, séparés par des virgules.' }

  const { data, error } = await createServiceRoleClient()
    .from('intitules')
    .update({
      libelle,
      synonymes: nettoyerSynonymes(input.synonymes),
      groupe: input.groupe?.trim() || null,
      specialites_sm: specialitesSm,
    })
    .eq('id', id)
    .eq('statut', 'valide')
    .select('id')
  if (error) return { error: error.code === '23505' ? 'Une compétence porte déjà ce nom.' : error.message }
  if (!data || data.length === 0) return { error: 'Compétence introuvable.' }
  revalider()
  return { ok: true }
}

/** Supprime une compétence du catalogue : elle disparaît aussi des fiches qui l'avaient cochée. */
export async function supprimerIntitule(id: string): Promise<Resultat> {
  await assertAdmin()
  const { data, error } = await createServiceRoleClient()
    .from('intitules')
    .delete()
    .eq('id', id)
    .eq('statut', 'valide')
    .select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Compétence introuvable.' }
  revalider()
  return { ok: true }
}

/** Refuse une proposition : elle est supprimée et disparaît des fiches qui l'avaient cochée. */
export async function refuserIntitule(id: string): Promise<Resultat> {
  await assertAdmin()
  const admin = createServiceRoleClient()
  const { data, error } = await admin.from('intitules').delete().eq('id', id).eq('statut', 'propose').select('id')
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'Proposition introuvable (déjà traitée ?).' }
  await marquerEvenementLu(admin, id)
  revalider()
  return { ok: true }
}
