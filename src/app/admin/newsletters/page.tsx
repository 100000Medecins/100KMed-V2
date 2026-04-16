import { createServiceRoleClient } from '@/lib/supabase/server'
import NewslettersClient from './NewslettersClient'

export const dynamic = 'force-dynamic'

export type Newsletter = {
  id: string
  mois: string
  sujet: string | null
  contenu_html: string | null
  status: 'draft' | 'sent'
  created_at: string
  sent_at: string | null
  recipient_count: number | null
  notified_at: string | null
  reminded_at: string | null
}

export default async function AdminNewslettersPage() {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newsletters } = await (supabase as any)
    .from('newsletters')
    .select('id, mois, sujet, contenu_html, status, created_at, sent_at, recipient_count, notified_at, reminded_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Newsletters</h1>
        <p className="text-sm text-gray-500 mt-1">
          Brouillons générés automatiquement le 22 de chaque mois. Relisez, ajustez si besoin, puis envoyez.
        </p>
      </div>
      <NewslettersClient newsletters={(newsletters as Newsletter[]) ?? []} />
    </div>
  )
}
