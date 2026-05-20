import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import GlossaireSuggestForm from '@/components/GlossaireSuggestForm'

export const dynamic = 'force-dynamic'

async function getUserEmail(): Promise<string | null> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const serviceClient = createServiceRoleClient()
    const { data: profile } = await serviceClient
      .from('users')
      .select('contact_email')
      .eq('id', user.id)
      .single()
    return (profile as { contact_email?: string } | null)?.contact_email || user.email || null
  } catch {
    return null
  }
}

export default async function ProposerAcronymePage() {
  const userEmail = await getUserEmail()
  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        Un acronyme manque dans le glossaire ? Proposez-le ici, il sera examiné avant publication.
      </p>
      <GlossaireSuggestForm userEmail={userEmail} defaultOpen />
    </div>
  )
}
