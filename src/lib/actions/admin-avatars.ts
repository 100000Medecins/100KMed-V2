'use server'

import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'

// ────────────────────────────────────────────
// Auth (pattern dupliqué depuis admin.ts)
// ────────────────────────────────────────────

function generateToken(): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!).update('admin-session').digest('hex')
}

async function assertAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== generateToken()) {
    redirect('/admin')
  }
  // Pas de renouvellement de cookie ici : le set est interdit depuis un server component
  // (Next 16). Cookie a 7 jours, c'est largement suffisant. Le layout admin re-check à
  // chaque navigation.
}

// ────────────────────────────────────────────
// Lectures
// ────────────────────────────────────────────

export async function adminGetCatalogAvatars(): Promise<
  Array<{ id: string; url: string; display_order: number | null }>
> {
  await assertAdmin()
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('avatars')
    .select('id, url, display_order')
    .is('user_id', null)
    .order('display_order', { ascending: true, nullsFirst: false })
  return (data ?? []) as Array<{ id: string; url: string; display_order: number | null }>
}

export async function adminGetPersonalAvatarsCount(): Promise<number> {
  await assertAdmin()
  const admin = createServiceRoleClient()
  const { count } = await admin
    .from('avatars')
    .select('*', { count: 'exact', head: true })
    .not('user_id', 'is', null)
  return count ?? 0
}

// ────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────

export async function adminAddAvatar(formData: FormData): Promise<{
  avatarId: string
  url: string
  displayOrder: number
}> {
  await assertAdmin()

  const file = formData.get('photo') as File | null
  if (!file) throw new Error('Aucun fichier fourni')
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image')
  if (file.size > 5 * 1024 * 1024) throw new Error('Le fichier doit faire moins de 5 Mo')

  const admin = createServiceRoleClient()

  // Prochain display_order
  const { data: maxRow } = await admin
    .from('avatars')
    .select('display_order')
    .is('user_id', null)
    .order('display_order', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (maxRow?.display_order ?? 0) + 1

  // Upload Storage : timestamp pour éviter les collisions
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `portraits/avatar-${nextOrder}-${Date.now()}.png`
  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(filename, buffer, { contentType: 'image/png', upsert: false })
  if (uploadErr) throw new Error(`Upload échoué : ${uploadErr.message}`)

  const { data: pub } = admin.storage.from('avatars').getPublicUrl(filename)

  // INSERT BDD
  const { data: inserted, error: insertErr } = await admin
    .from('avatars')
    .insert({ url: pub.publicUrl, display_order: nextOrder })
    .select('id')
    .single()
  if (insertErr || !inserted) {
    // Cleanup Storage si BDD échoue
    await admin.storage.from('avatars').remove([filename])
    throw new Error('Échec de l\'enregistrement en BDD')
  }

  revalidatePath('/admin/utilisateurs/avatars')
  return { avatarId: inserted.id, url: pub.publicUrl, displayOrder: nextOrder }
}

export async function adminDeleteAvatar(avatarId: string): Promise<{ status: 'SUCCESS' }> {
  await assertAdmin()
  const admin = createServiceRoleClient()

  const { data: avatar } = await admin
    .from('avatars')
    .select('url, user_id')
    .eq('id', avatarId)
    .single()
  if (!avatar) throw new Error('Avatar introuvable')
  if (avatar.user_id !== null) {
    throw new Error('Cet avatar est personnel, il sera nettoyé automatiquement côté user')
  }

  // Storage
  const match = avatar.url.match(/\/avatars\/(portraits\/[^/]+\.png)$/)
  if (match) {
    await admin.storage.from('avatars').remove([match[1]])
  }

  // BDD (FK ON DELETE SET NULL → les users qui l'avaient choisi retombent sur NULL)
  await admin.from('avatars').delete().eq('id', avatarId)

  revalidatePath('/admin/utilisateurs/avatars')
  return { status: 'SUCCESS' }
}

export async function adminReorderAvatars(orderedIds: string[]): Promise<{ status: 'SUCCESS' }> {
  await assertAdmin()
  const admin = createServiceRoleClient()

  // Update chaque avatar avec son nouvel index (1-based)
  await Promise.all(
    orderedIds.map((id, idx) =>
      admin.from('avatars').update({ display_order: idx + 1 }).eq('id', id),
    ),
  )

  revalidatePath('/admin/utilisateurs/avatars')
  return { status: 'SUCCESS' }
}

/**
 * Garbage collector des fichiers Storage orphelins (`avatars/personal/**`).
 * Compare les fichiers du bucket avec les URLs en BDD. Supprime ce qui n'est plus référencé.
 * Logique identique à scripts/cleanup-avatar-storage.ts.
 */
export async function adminPurgeAvatarOrphans(): Promise<{
  scanned: number
  referenced: number
  deleted: number
}> {
  await assertAdmin()
  const admin = createServiceRoleClient()

  // Liste récursive de tous les fichiers dans avatars/personal/
  async function listFilesRecursive(prefix: string): Promise<string[]> {
    const { data } = await admin.storage.from('avatars').list(prefix, { limit: 1000 })
    if (!data) return []
    const files: string[] = []
    for (const item of data) {
      const fullPath = `${prefix}/${item.name}`
      if (item.metadata) {
        files.push(fullPath)
      } else {
        const sub = await listFilesRecursive(fullPath)
        files.push(...sub)
      }
    }
    return files
  }

  const storageFiles = await listFilesRecursive('personal')

  const { data: dbAvatars } = await admin
    .from('avatars')
    .select('url')
    .not('user_id', 'is', null)

  const dbPaths = new Set(
    (dbAvatars ?? [])
      .map((a) => {
        const m = a.url.match(/\/avatars\/(personal\/[^/]+\/[^/]+\.png)$/)
        return m ? m[1] : null
      })
      .filter((p): p is string => !!p),
  )

  const orphans = storageFiles.filter((f) => !dbPaths.has(f))

  if (orphans.length > 0) {
    const batchSize = 100
    for (let i = 0; i < orphans.length; i += batchSize) {
      const batch = orphans.slice(i, i + batchSize)
      await admin.storage.from('avatars').remove(batch)
    }
  }

  revalidatePath('/admin/utilisateurs/avatars')
  return {
    scanned: storageFiles.length,
    referenced: dbPaths.size,
    deleted: orphans.length,
  }
}
