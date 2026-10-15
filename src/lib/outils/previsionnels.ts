import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { retryTransientAuth } from '@/lib/supabase/retry'
import type { Json } from '@/types/database'

// Prévisionnels « Maison de santé » enregistrés dans le compte (outil statique
// public/outils/previsionnel-msp, servi sur le même domaine : la session part avec ses requêtes).
// Les mêmes bornes sont tenues par la base (table previsionnels_msp : RLS, plafond par déclencheur,
// contraintes de taille) : ce code n'est pas le seul rempart.

export const MAX_PREVISIONNELS = 5
const NOM_MAX = 120
// Sous la contrainte de la base (200 000 octets en texte jsonb, plus bavard que JSON.stringify).
const DONNEES_MAX_OCTETS = 150_000

export type EntreePrevisionnel = { nom: string; donnees: { [key: string]: Json | undefined } }

export const repondre = (corps: Record<string, unknown>, status = 200) =>
  NextResponse.json(corps, { status, headers: { 'Cache-Control': 'no-store' } })

/** Client sous la session de l'appelant (RLS), et l'utilisateur connecté ou null. */
export async function sessionUtilisateur() {
  const supabase = await createServerClient()
  const { data } = await retryTransientAuth(() => supabase.auth.getUser())
  return { supabase, user: data.user }
}

/** Requête émise par une page du site lui-même (ou sans en-tête Origin). */
export function origineAutorisee(request: Request): boolean {
  const origine = request.headers.get('origin')
  if (!origine) return true
  const hote = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  try {
    return new URL(origine).host === hote
  } catch {
    return false
  }
}

/**
 * Écriture acceptée seulement en JSON et depuis le site lui-même : un formulaire d'un autre site
 * ne peut ni poser ce type de contenu sans requête préalable, ni passer le contrôle d'origine.
 */
export function ecritureAutorisee(request: Request): boolean {
  return !!request.headers.get('content-type')?.startsWith('application/json') && origineAutorisee(request)
}

/** Valide le corps envoyé par l'outil : nom non vide, scénario reconnaissable, taille bornée. */
export function lireEntree(corps: unknown): EntreePrevisionnel | null {
  if (!corps || typeof corps !== 'object') return null
  const { nom, donnees } = corps as { nom?: unknown; donnees?: unknown }
  if (typeof nom !== 'string') return null
  const nomPropre = nom.trim().slice(0, NOM_MAX)
  if (!nomPropre) return null
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) return null
  const d = donnees as { [key: string]: Json | undefined }
  if (!Array.isArray(d.professions) || !d.local || typeof d.local !== 'object' || !d.charges || typeof d.charges !== 'object') return null
  if (new TextEncoder().encode(JSON.stringify(d)).length > DONNEES_MAX_OCTETS) return null
  return { nom: nomPropre, donnees: d }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const idValide = (id: string) => UUID.test(id)
