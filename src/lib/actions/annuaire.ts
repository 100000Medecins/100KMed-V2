'use server'

/**
 * Annuaire mutualisé — « Ma fiche annuaire » (Mon compte).
 *
 * L'identité vient de la session et de sa preuve PSC (`identites_psc`, rangée par RPPS) ; la
 * fiche est lue et écrite par le module serveur commun au site et à l'application
 * (`lib/annuaire/fiche-serveur`), en service role après ce contrôle.
 * Références : docs/2026-10-07-annuaire-tranche-1.md, docs/2026-10-10-annuaire-tranche-3.md
 */

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { getAnnuaireActif } from '@/lib/db/settings'
import type { MoyenContact } from '@/lib/constants/annuaire'
import { codesSmDeSpecialite, afficherPortable } from '@/lib/annuaire/normaliser'
import type { Commune } from '@/lib/annuaire/geocodage'
import {
  catalogueDe,
  enregistrerFiche,
  lireFiche,
  propositionsAnsPour,
  proposerCompetence as proposerCompetencePour,
  type IntituleCatalogue as IntituleCatalogueServeur,
  type PropositionsAns as PropositionsAnsServeur,
} from '@/lib/annuaire/fiche-serveur'

// Alias (pas de réexportation : un fichier « use server » n'exporte que des fonctions et des types déclarés)
export type IntituleCatalogue = IntituleCatalogueServeur
export type PropositionsAns = PropositionsAnsServeur

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
  /** Commune d'exercice déclarée (centre de la commune, ou lieu de l'Annuaire Santé choisi). */
  commune: Commune | null
  mssante: string
  telephoneCabinet: string
  competences: string[]
  catalogue: IntituleCatalogue[]
  /** Ce que l'Annuaire Santé connaît pour le RPPS du médecin : proposé, à confirmer d'un clic. */
  propositionsAns: PropositionsAns | null
}

/** Pour le menu de Mon compte. */
export async function annuaireEstActif(): Promise<boolean> {
  return getAnnuaireActif()
}

/** Le compte connecté et le RPPS de sa preuve PSC (null sans preuve). */
async function compteConnecte() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: identite } = await supabase.from('identites_psc').select('rpps').eq('user_id', user.id).maybeSingle()
  return { supabase, userId: user.id, rpps: identite?.rpps ?? null }
}

export async function getMaFicheAnnuaire(): Promise<MaFicheAnnuaire | null> {
  if (!(await getAnnuaireActif())) return null
  const compte = await compteConnecte()
  if (!compte) return null
  const { supabase, userId, rpps } = compte

  const [profil, fiche, catalogue, propositionsAns] = await Promise.all([
    supabase.from('users').select('specialite').eq('id', userId).maybeSingle(),
    rpps ? lireFiche(rpps) : null,
    rpps
      ? catalogueDe(rpps)
      : supabase
          .from('intitules')
          .select('id, libelle, synonymes, groupe, specialites_sm, statut')
          .eq('type', 'competence')
          .eq('statut', 'valide')
          .order('libelle')
          .then((r) => r.data ?? []),
    rpps ? propositionsAnsPour(rpps) : null,
  ])

  const specialite = profil.data?.specialite ?? null
  return {
    userId,
    verifie: rpps !== null,
    specialite,
    codesSm: codesSmDeSpecialite(specialite),
    moyenContact: fiche?.moyenContact ?? null,
    publiee: fiche?.publiee ?? false,
    publieeLe: fiche?.publieeLe ?? null,
    miseAJour: fiche?.miseAJour ?? null,
    portable: afficherPortable(fiche?.portable),
    portableVisible: fiche?.portableVisible ?? false,
    commune: fiche?.commune ?? null,
    mssante: fiche?.mssante ?? '',
    telephoneCabinet: afficherPortable(fiche?.telephoneCabinet),
    competences: fiche?.competences ?? [],
    catalogue,
    propositionsAns,
  }
}

async function rppsVerifie() {
  if (!(await getAnnuaireActif())) return { error: "L'annuaire n'est pas ouvert." } as const
  const compte = await compteConnecte()
  if (!compte) return { error: 'Vous devez être connecté.' } as const
  if (!compte.rpps) return { error: 'Vérifiez d’abord votre identité avec Pro Santé Connect.' } as const
  return { rpps: compte.rpps } as const
}

export async function enregistrerMaFiche(input: {
  moyenContact: string | null
  portable: string
  portableVisible: boolean
  publiee: boolean
  competences: string[]
  commune: Commune | null
  mssante: string
  telephoneCabinet: string
}): Promise<
  | { ok: true; publieeLe: string | null; miseAJour: string | null; portable: string; telephoneCabinet: string }
  | { error: string }
> {
  const ctx = await rppsVerifie()
  if (ctx.error) return { error: ctx.error }

  const res = await enregistrerFiche(ctx.rpps, input)
  if ('error' in res) return { error: res.error }

  revalidatePath('/mon-compte/annuaire')
  return {
    ok: true,
    publieeLe: res.publieeLe,
    miseAJour: res.miseAJour,
    portable: afficherPortable(res.portable),
    telephoneCabinet: afficherPortable(res.telephoneCabinet),
  }
}

/**
 * Propose un intitulé manquant. Renvoie l'intitulé existant s'il y en a déjà un
 * (même libellé ou synonyme, accents et casse ignorés) ; sinon crée la proposition
 * (statut `propose`) et la coche sur la fiche du médecin.
 */
export async function proposerCompetence(
  saisie: string,
): Promise<{ intitule: IntituleCatalogue } | { existant: IntituleCatalogue } | { error: string }> {
  const ctx = await rppsVerifie()
  if (ctx.error) return { error: ctx.error }
  const res = await proposerCompetencePour(ctx.rpps, saisie)
  if ('intitule' in res) revalidatePath('/mon-compte/annuaire')
  return res
}
