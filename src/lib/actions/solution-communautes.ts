'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import sgMail from '@sendgrid/mail'

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const NOTIF_TO = 'contact@100000medecins.org'
const NOTIF_FROM = 'contact@100000medecins.org'

const VALID_TYPES = ['whatsapp', 'telegram', 'discord', 'facebook', 'forum', 'autre'] as const
type TypeCommunaute = (typeof VALID_TYPES)[number]

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!)
    .update('admin-session')
    .digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) throw new Error('Non autorisé')
}

export type AdminCommunaute = {
  id: string
  type: string
  nom: string
  url: string
  description: string | null
  statut: 'en_attente' | 'approuve' | 'refuse'
  note_admin: string | null
  created_at: string
  approved_at: string | null
  proposer_email: string | null
  proposer: { id: string; prenom: string | null; nom: string | null; pseudo: string | null; email: string | null; contact_email: string | null } | null
  solution: { id: string; nom: string; slug: string | null; categorie: { slug: string | null; nom: string | null } | null } | null
}

export async function submitSolutionCommunaute(input: {
  solutionId: string
  type: string
  nom: string
  url: string
  description?: string | null
  proposerEmail?: string | null
}): Promise<{ status: 'SUCCESS' } | { status: 'ERROR'; message: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const type = input.type.trim().toLowerCase()
  const nom = input.nom.trim()
  const url = input.url.trim()
  const description = input.description?.trim() || null
  const anonymousEmail = input.proposerEmail?.trim() || null

  if (!VALID_TYPES.includes(type as TypeCommunaute)) return { status: 'ERROR', message: 'Type invalide.' }
  if (!url) return { status: 'ERROR', message: "L'URL est requise." }
  try { new URL(url) } catch { return { status: 'ERROR', message: "L'URL n'est pas valide." } }
  // Si pas de nom fourni, on prend le host de l'URL comme fallback (ex. "chat.whatsapp.com")
  const nomFinal = nom || (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Lien' } })()

  const admin = createServiceRoleClient()

  // Vérifier que la solution existe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sol } = await (admin as any).from('solutions').select('id, nom').eq('id', input.solutionId).single()
  if (!sol) return { status: 'ERROR', message: 'Solution introuvable.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('solution_communautes').insert({
    solution_id: input.solutionId,
    type,
    nom: nomFinal,
    url,
    description,
    proposed_by: user?.id ?? null,
    proposer_email: user ? null : anonymousEmail,
  })
  if (error) return { status: 'ERROR', message: error.message }

  // Notification admin (best-effort)
  try {
    if (process.env.SENDGRID_API_KEY) {
      let proposerLabel = 'Visiteur anonyme'
      let proposerEmail = anonymousEmail
      if (user) {
        const { data: profile } = await admin
          .from('users')
          .select('prenom, nom, pseudo, email, contact_email')
          .eq('id', user.id)
          .single()
        proposerLabel = profile?.pseudo
          || `${profile?.prenom ?? ''} ${profile?.nom ?? ''}`.trim()
          || profile?.contact_email
          || profile?.email
          || 'Utilisateur'
        proposerEmail = profile?.contact_email || profile?.email || null
      }
      await sgMail.send({
        to: NOTIF_TO,
        from: { email: NOTIF_FROM, name: '100000médecins.org' },
        subject: `[Communauté ${type}] ${nomFinal} (${sol.nom})`,
        html: `
          <h2>Nouvelle proposition de communauté</h2>
          <p><strong>Solution :</strong> ${sol.nom}</p>
          <p><strong>Type :</strong> ${type}</p>
          <p><strong>Nom :</strong> ${nomFinal}${nom ? '' : ' <em style="color:#999">(extrait automatiquement de l\'URL)</em>'}</p>
          <p><strong>URL :</strong> <a href="${url}">${url}</a></p>
          ${description ? `<p><strong>Description :</strong></p><p>${description.replace(/\n/g, '<br />')}</p>` : ''}
          <hr />
          <p><strong>Proposé par :</strong> ${proposerLabel}${proposerEmail ? ` (${proposerEmail})` : ''}</p>
          <hr />
          <p style="font-size:12px;color:#666">À modérer dans <a href="https://www.100000medecins.org/admin/communautes">l'admin</a>.</p>
        `,
      })
    }
  } catch (e) {
    console.error('[submitSolutionCommunaute] email notif failed:', e)
  }

  revalidatePath('/admin/communautes')
  return { status: 'SUCCESS' }
}

export async function listSolutionCommunautesAdmin(filters?: { statut?: 'en_attente' | 'approuve' | 'refuse' | 'tous'; type?: string }): Promise<AdminCommunaute[]> {
  await assertAdmin()
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('solution_communautes')
    .select('id, type, nom, url, description, statut, note_admin, created_at, approved_at, proposed_by, proposer_email, solution_id')
    .order('created_at', { ascending: false })

  if (filters?.statut && filters.statut !== 'tous') query = query.eq('statut', filters.statut)
  if (filters?.type) query = query.eq('type', filters.type)

  const { data, error } = await query
  if (error) return []
  const rows = (data ?? []) as Array<Record<string, unknown>>
  if (rows.length === 0) return []

  // Récupère les proposers + solutions en bloc
  const userIds = Array.from(new Set(rows.map((r) => r.proposed_by as string).filter(Boolean)))
  const solutionIds = Array.from(new Set(rows.map((r) => r.solution_id as string).filter(Boolean)))

  const [usersRes, solutionsRes] = await Promise.all([
    userIds.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin as any).from('users').select('id, prenom, nom, pseudo, email, contact_email').in('id', userIds)
      : Promise.resolve({ data: [] }),
    solutionIds.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (admin as any).from('solutions').select('id, nom, slug, categorie:categories(slug, nom)').in('id', solutionIds)
      : Promise.resolve({ data: [] }),
  ])

  const userMap = new Map<string, AdminCommunaute['proposer']>()
  for (const u of (usersRes.data ?? []) as Array<NonNullable<AdminCommunaute['proposer']>>) userMap.set(u.id, u)
  const solMap = new Map<string, AdminCommunaute['solution']>()
  for (const s of (solutionsRes.data ?? []) as Array<NonNullable<AdminCommunaute['solution']>>) solMap.set(s.id, s)

  return rows.map((r) => ({
    id: r.id as string,
    type: r.type as string,
    nom: r.nom as string,
    url: r.url as string,
    description: r.description as string | null,
    statut: r.statut as AdminCommunaute['statut'],
    note_admin: r.note_admin as string | null,
    created_at: r.created_at as string,
    approved_at: r.approved_at as string | null,
    proposer_email: r.proposer_email as string | null,
    proposer: r.proposed_by ? userMap.get(r.proposed_by as string) ?? null : null,
    solution: solMap.get(r.solution_id as string) ?? null,
  }))
}

export async function setStatutCommunaute(id: string, statut: 'en_attente' | 'approuve' | 'refuse', noteAdmin?: string) {
  await assertAdmin()
  const admin = createServiceRoleClient()

  const updates: Record<string, unknown> = { statut }
  if (noteAdmin !== undefined) updates.note_admin = noteAdmin
  if (statut === 'approuve') updates.approved_at = new Date().toISOString()

  // Lire l'entrée pour récupérer infos email proposeur si on approuve
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: before } = await (admin as any)
    .from('solution_communautes')
    .select('statut, proposed_by, proposer_email, nom, type, url, solution_id')
    .eq('id', id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('solution_communautes').update(updates).eq('id', id)
  if (error) return { error: error.message }

  // Notification au proposeur si on vient d'approuver (best-effort)
  if (statut === 'approuve' && before?.statut !== 'approuve') {
    try {
      let email: string | null = before?.proposer_email ?? null
      if (!email && before?.proposed_by) {
        const { data: u } = await admin.from('users').select('contact_email, email').eq('id', before.proposed_by).single()
        email = (u as { contact_email?: string; email?: string } | null)?.contact_email
          || (u as { contact_email?: string; email?: string } | null)?.email
          || null
      }
      if (email && process.env.SENDGRID_API_KEY) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sol } = await (admin as any).from('solutions').select('nom, slug, categorie:categories(slug)').eq('id', before.solution_id).single()
        const solutionUrl = sol?.categorie?.slug && sol?.slug
          ? `https://www.100000medecins.org/solutions/${sol.categorie.slug}/${sol.slug}`
          : 'https://www.100000medecins.org'
        await sgMail.send({
          to: email,
          from: { email: NOTIF_FROM, name: '100000médecins.org' },
          subject: `Votre proposition de communauté pour ${sol?.nom ?? 'une solution'} a été publiée`,
          html: `
            <h2>Merci pour votre contribution !</h2>
            <p>Votre proposition de groupe <strong>${before.nom}</strong> (${before.type}) pour la solution <strong>${sol?.nom ?? ''}</strong> vient d'être validée par notre équipe.</p>
            <p>Elle est désormais visible sur <a href="${solutionUrl}">la fiche de la solution</a> et pourra aider d'autres médecins à rejoindre la communauté.</p>
            <p style="font-size:12px;color:#666">Vous recevez cet email parce que vous avez proposé ce groupe sur 100000médecins.org.</p>
          `,
        })
      }
    } catch (e) {
      console.error('[setStatutCommunaute] notif proposeur failed:', e)
    }
  }

  revalidatePath('/admin/communautes')
  return { ok: true }
}

export async function deleteSolutionCommunaute(id: string) {
  await assertAdmin()
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('solution_communautes').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/communautes')
  return { ok: true }
}

export type CommunauteForManager = {
  id: string
  type: string
  nom: string
  url: string
  description: string | null
  statut: 'en_attente' | 'approuve' | 'refuse'
}

/**
 * Liste les communautés d'une solution donnée (pour le manager admin de la fiche solution).
 */
export async function listCommunautesBySolution(solutionId: string): Promise<CommunauteForManager[]> {
  await assertAdmin()
  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('solution_communautes')
    .select('id, type, nom, url, description, statut')
    .eq('solution_id', solutionId)
    .order('statut')
    .order('created_at')
  if (error) {
    console.error('[listCommunautesBySolution]', JSON.stringify(error))
    return []
  }
  return (data ?? []) as CommunauteForManager[]
}

/**
 * Création d'une communauté directement par l'admin (statut 'approuve' d'emblée,
 * pas de passage par la file de modération).
 */
export async function createCommunauteAdmin(input: {
  solutionId: string
  type: string
  nom: string
  url: string
  description?: string | null
}): Promise<{ ok: true } | { error: string }> {
  await assertAdmin()

  const type = input.type.trim().toLowerCase()
  const nom = input.nom.trim()
  const url = input.url.trim()
  const description = input.description?.trim() || null

  if (!VALID_TYPES.includes(type as TypeCommunaute)) return { error: 'Type invalide.' }
  if (!url) return { error: "L'URL est requise." }
  try { new URL(url) } catch { return { error: "L'URL n'est pas valide." } }
  const nomFinal = nom || (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Lien' } })()

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('solution_communautes').insert({
    solution_id: input.solutionId,
    type,
    nom: nomFinal,
    url,
    description,
    statut: 'approuve',
    approved_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/communautes')
  revalidatePath(`/admin/solutions/${input.solutionId}/modifier`)
  return { ok: true }
}

/**
 * Édition des champs d'une communauté (admin).
 */
export async function updateCommunaute(id: string, patch: {
  type?: string
  nom?: string
  url?: string
  description?: string | null
}): Promise<{ ok: true } | { error: string }> {
  await assertAdmin()

  const updates: Record<string, unknown> = {}
  if (patch.type !== undefined) {
    const type = patch.type.trim().toLowerCase()
    if (!VALID_TYPES.includes(type as TypeCommunaute)) return { error: 'Type invalide.' }
    updates.type = type
  }
  if (patch.nom !== undefined) updates.nom = patch.nom.trim()
  if (patch.url !== undefined) {
    const url = patch.url.trim()
    if (!url) return { error: "L'URL est requise." }
    try { new URL(url) } catch { return { error: "L'URL n'est pas valide." } }
    updates.url = url
  }
  if (patch.description !== undefined) updates.description = patch.description?.trim() || null
  if (Object.keys(updates).length === 0) return { ok: true }

  const admin = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('solution_communautes').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/communautes')
  return { ok: true }
}
