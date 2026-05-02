export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import PlanningCalendar, { type PlanningEvent } from './PlanningCalendar'

async function getScheduledContent(): Promise<PlanningEvent[]> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  const limit = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString()

  const [{ data: articles }, { data: newsletters }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('articles')
      .select('id, titre, scheduled_at')
      .eq('statut', 'brouillon')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', limit),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('newsletters')
      .select('id, sujet, scheduled_at')
      .eq('status', 'draft')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', limit),
  ])

  const events: PlanningEvent[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(articles ?? []).map((a: any) => ({
      id: a.id,
      titre: a.titre ?? '(Article sans titre)',
      date: a.scheduled_at,
      type: 'article' as const,
      href: `/admin/blog/${a.id}/modifier`,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(newsletters ?? []).map((n: any) => ({
      id: n.id,
      titre: n.sujet ?? '(Newsletter sans sujet)',
      date: n.scheduled_at,
      type: 'newsletter' as const,
      href: '/admin/newsletters',
    })),
  ]

  return events
}

export default async function PlanningPage() {
  const events = await getScheduledContent()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Planning éditorial</h1>
        <p className="text-sm text-gray-500 mt-1">
          Contenu programmé sur les 3 prochains mois —{' '}
          {events.length === 0
            ? 'aucun événement'
            : `${events.length} événement${events.length > 1 ? 's' : ''}`}
        </p>
      </div>

      <PlanningCalendar events={events} />
    </div>
  )
}
