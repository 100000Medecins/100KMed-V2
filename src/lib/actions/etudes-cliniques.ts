'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import sgMail from '@sendgrid/mail'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EtudeClinique = {
  id: string
  titre: string
  description: string | null
  lien: string | null
  images: string[]
  specialites_cibles: string[]
  date_debut: string | null
  date_fin: string | null
  created_by: string | null
  statut: 'en_attente' | 'publie' | 'refuse'
  created_at: string
  updated_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertDmhRole() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const admin = createServiceRoleClient()
  const { data } = await admin.from('users').select('role').eq('id', user.id).single()
  if (data?.role !== 'digital_medical_hub') throw new Error('Non autorisé')

  return user
}

// ── Lecture ───────────────────────────────────────────────────────────────────

/**
 * Toutes les études (pour le gestionnaire DMH — sans filtre de date).
 */
export async function getEtudesAdmin(): Promise<EtudeClinique[]> {
  await assertDmhRole()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { data } = await supabase
    .from('etudes_cliniques')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []).map(normalise)
}

/**
 * Études actives publiées (filtrées par date et statut) — pour les utilisateurs opt-in.
 */
export async function getEtudesActives(): Promise<EtudeClinique[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('etudes_cliniques')
    .select('*')
    .eq('statut', 'publie')
    .or(`date_debut.is.null,date_debut.lte.${today}`)
    .or(`date_fin.is.null,date_fin.gte.${today}`)
    .order('created_at', { ascending: false })
  return (data ?? []).map(normalise)
}

function normalise(row: any): EtudeClinique {
  return {
    ...row,
    images: Array.isArray(row.images) ? row.images : [],
    specialites_cibles: Array.isArray(row.specialites_cibles) ? row.specialites_cibles : [],
    statut: row.statut ?? 'publie',
  }
}

// ── Écriture ──────────────────────────────────────────────────────────────────

export async function createEtudeClinique(formData: FormData) {
  const user = await assertDmhRole()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any

  const images = JSON.parse((formData.get('images') as string) || '[]')
  const specialites_cibles = JSON.parse((formData.get('specialites_cibles') as string) || '[]')

  await supabase.from('etudes_cliniques').insert({
    titre:             formData.get('titre') as string,
    description:       formData.get('description') as string || null,
    lien:              formData.get('lien') as string || null,
    images,
    specialites_cibles,
    date_debut:        (formData.get('date_debut') as string) || null,
    date_fin:          (formData.get('date_fin') as string) || null,
    created_by:        user.id,
    statut:            'en_attente',
  })

  revalidatePath('/mon-compte/etudes-cliniques')
  revalidatePath('/admin/questionnaires-these')
}

export async function updateEtudeClinique(id: string, formData: FormData) {
  await assertDmhRole()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any

  const images = JSON.parse((formData.get('images') as string) || '[]')
  const specialites_cibles = JSON.parse((formData.get('specialites_cibles') as string) || '[]')

  await supabase.from('etudes_cliniques').update({
    titre:             formData.get('titre') as string,
    description:       formData.get('description') as string || null,
    lien:              formData.get('lien') as string || null,
    images,
    specialites_cibles,
    date_debut:        (formData.get('date_debut') as string) || null,
    date_fin:          (formData.get('date_fin') as string) || null,
    updated_at:        new Date().toISOString(),
  }).eq('id', id)

  revalidatePath('/mon-compte/etudes-cliniques')
}

export async function deleteEtudeClinique(id: string) {
  await assertDmhRole()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  await supabase.from('etudes_cliniques').delete().eq('id', id)
  revalidatePath('/mon-compte/etudes-cliniques')
  revalidatePath('/mon-compte/etudes-cliniques')
}

// ── Admin (accès superadmin sans garde DMH) ───────────────────────────────────

/**
 * Toutes les études cliniques — pour la page admin /admin/questionnaires-these.
 */
export async function getEtudesCliniquesSuperAdmin(): Promise<EtudeClinique[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { data } = await supabase
    .from('etudes_cliniques')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []).map(normalise)
}

/**
 * Crée une étude clinique — admin uniquement.
 */
export async function createEtudeCliniqueAdmin(formData: FormData): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const images = JSON.parse((formData.get('images') as string) || '[]')
  const specialites_cibles = JSON.parse((formData.get('specialites_cibles') as string) || '[]')

  const { error } = await supabase.from('etudes_cliniques').insert({
    titre:             formData.get('titre') as string,
    description:       formData.get('description') as string || null,
    lien:              formData.get('lien') as string || null,
    images,
    specialites_cibles,
    date_debut:        (formData.get('date_debut') as string) || null,
    date_fin:          (formData.get('date_fin') as string) || null,
    created_by:        null,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires-these')
  revalidatePath('/mon-compte/etudes-cliniques')
  return { error: null }
}

/**
 * Met à jour une étude clinique — admin uniquement.
 */
export async function updateEtudeCliniqueAdmin(id: string, formData: FormData): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const images = JSON.parse((formData.get('images') as string) || '[]')
  const specialites_cibles = JSON.parse((formData.get('specialites_cibles') as string) || '[]')

  const { error } = await supabase.from('etudes_cliniques').update({
    titre:             formData.get('titre') as string,
    description:       formData.get('description') as string || null,
    lien:              formData.get('lien') as string || null,
    images,
    specialites_cibles,
    date_debut:        (formData.get('date_debut') as string) || null,
    date_fin:          (formData.get('date_fin') as string) || null,
    updated_at:        new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires-these')
  revalidatePath('/mon-compte/etudes-cliniques')
  return { error: null }
}

/**
 * Supprime une étude clinique — admin uniquement.
 */
export async function deleteEtudeCliniqueAdmin(id: string): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { error } = await supabase.from('etudes_cliniques').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires-these')
  revalidatePath('/mon-compte/etudes-cliniques')
  revalidatePath('/mon-compte/etudes-cliniques')
  return { error: null }
}

/**
 * Change le statut d'une étude clinique — admin uniquement.
 */
export async function setStatutEtude(
  id: string,
  statut: 'publie' | 'refuse'
): Promise<{ error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceRoleClient() as any
  const { error } = await supabase
    .from('etudes_cliniques')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/questionnaires-these')
  revalidatePath('/mon-compte/etudes-cliniques')
  return { error: null }
}

// ── Notification "En savoir plus" ─────────────────────────────────────────────

export async function demanderInfoEtude(etudeId: string, etudeTitle: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const admin = createServiceRoleClient()

  // Profil de l'utilisateur intéressé
  const { data: profil } = await admin
    .from('users')
    .select('nom, prenom, specialite, contact_email, email')
    .eq('id', user.id)
    .single()

  // Destinataire : variable d'env prioritaire, sinon premier compte DMH trouvé
  let dmhEmail: string | undefined = process.env.DMH_CONTACT_EMAIL || undefined
  if (!dmhEmail) {
    const { data: dmhUser } = await admin
      .from('users')
      .select('contact_email, email')
      .eq('role', 'digital_medical_hub')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    dmhEmail = dmhUser?.contact_email || dmhUser?.email || undefined
  }
  if (!dmhEmail) throw new Error('Destinataire DMH introuvable')

  const { resolveSpecialite } = await import('@/lib/constants/profil')
  const specialite = resolveSpecialite(profil?.specialite ?? null) || 'Non renseignée'
  const nomComplet = [profil?.prenom, profil?.nom].filter(Boolean).join(' ') || 'Utilisateur'
  const emailContact = profil?.contact_email || user.email || 'Non renseigné'

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  await sgMail.send({
    to: dmhEmail,
    from: 'contact@100000medecins.org',
    subject: `Demande d'information — ${etudeTitle}`,
    html: `
      <p>Un médecin souhaite en savoir plus sur l'étude <strong>${etudeTitle}</strong>.</p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><strong>Nom</strong></td><td>${nomComplet}</td></tr>
        <tr><td><strong>Spécialité</strong></td><td>${specialite}</td></tr>
        <tr><td><strong>Email</strong></td><td>${emailContact}</td></tr>
      </table>
    `,
  })
}
