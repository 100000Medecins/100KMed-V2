export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { markAllActivityRead } from '@/lib/actions/activity'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { ACTIVITY_TYPES } from '@/lib/activity/log'

type ActivityRow = {
  id: string
  type: string
  acteur_type: string | null
  acteur_label: string | null
  cible_type: string | null
  cible_id: string | null
  cible_label: string | null
  diff: Record<string, { avant: unknown; apres: unknown }> | null
  gravite: string
  lu: boolean
  created_at: string
}

type BadgeVariant = 'info' | 'warning' | 'success' | 'danger' | 'neutral' | 'dark'

const TYPE_META: Record<string, { label: string; variant: BadgeVariant }> = {
  [ACTIVITY_TYPES.INSCRIPTION_EMAIL]: { label: 'Inscription email', variant: 'info' },
  [ACTIVITY_TYPES.INSCRIPTION_PSC]: { label: 'Inscription PSC', variant: 'info' },
  [ACTIVITY_TYPES.EVALUATION_PUBLIEE]: { label: 'Évaluation publiée', variant: 'success' },
  [ACTIVITY_TYPES.EVALUATION_EN_ATTENTE_PSC]: { label: 'Éval. en attente PSC', variant: 'warning' },
  [ACTIVITY_TYPES.EVALUATION_A_COMPLETER]: { label: 'Éval. à compléter', variant: 'warning' },
  [ACTIVITY_TYPES.EDITEUR_MODIF_FICHE]: { label: 'Modif fiche éditeur', variant: 'neutral' },
  [ACTIVITY_TYPES.EDITEUR_MODIF_SOLUTION]: { label: 'Modif solution', variant: 'neutral' },
  [ACTIVITY_TYPES.PROPOSITION]: { label: 'Proposition', variant: 'warning' },
  [ACTIVITY_TYPES.REVENDICATION]: { label: 'Revendication', variant: 'warning' },
  [ACTIVITY_TYPES.DEMANDE_REFERENCEMENT]: { label: 'Demande référencement', variant: 'warning' },
  [ACTIVITY_TYPES.ADMIN_SUPPRESSION]: { label: 'Suppression admin', variant: 'danger' },
  [ACTIVITY_TYPES.ADMIN_PARAMETRE]: { label: 'Paramètre admin', variant: 'dark' },
}

const FILTRES: { key: string; label: string; types?: string[]; gravite?: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'a_moderer', label: 'À modérer', gravite: 'a_moderer' },
  { key: 'inscriptions', label: 'Inscriptions', types: [ACTIVITY_TYPES.INSCRIPTION_EMAIL, ACTIVITY_TYPES.INSCRIPTION_PSC] },
  {
    key: 'evaluations',
    label: 'Évaluations',
    types: [ACTIVITY_TYPES.EVALUATION_PUBLIEE, ACTIVITY_TYPES.EVALUATION_EN_ATTENTE_PSC, ACTIVITY_TYPES.EVALUATION_A_COMPLETER],
  },
  { key: 'modifs', label: 'Modifs éditeur', types: [ACTIVITY_TYPES.EDITEUR_MODIF_FICHE, ACTIVITY_TYPES.EDITEUR_MODIF_SOLUTION] },
]

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === '') return '∅'
  const s = String(v)
  return s.length > 60 ? s.slice(0, 60) + '…' : s
}

function cibleHref(row: ActivityRow): string | null {
  if (row.cible_type === 'editeur' && row.cible_id) return `/admin/editeurs/${row.cible_id}/modifier`
  if (row.cible_type === 'solution' && row.cible_id) return `/admin/solutions/${row.cible_id}/modifier`
  if (row.cible_type === 'proposition') return '/admin/propositions'
  if (row.cible_type === 'user') return '/admin/utilisateurs'
  return null
}

async function getActivity(filtreKey: string): Promise<ActivityRow[]> {
  const supabase = createServiceRoleClient()
  let q = supabase
    .from('activity_log')
    .select('id, type, acteur_type, acteur_label, cible_type, cible_id, cible_label, diff, gravite, lu, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const filtre = FILTRES.find((f) => f.key === filtreKey)
  if (filtre?.gravite) q = q.eq('gravite', filtre.gravite)
  if (filtre?.types) q = q.in('type', filtre.types)

  const { data } = await q
  return (data ?? []) as ActivityRow[]
}

export default async function AdminActivitePage(props: {
  searchParams: Promise<{ filtre?: string }>
}) {
  const searchParams = await props.searchParams
  const filtreKey = FILTRES.some((f) => f.key === searchParams.filtre) ? searchParams.filtre! : 'tous'
  const rows = await getActivity(filtreKey)
  const nbNonLus = rows.filter((r) => !r.lu).length

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy">Activité du site</h1>
          <p className="text-sm text-gray-500 mt-1">
            Flux de supervision (200 derniers événements). Le détail champ par champ des modifs éditeur reste sur{' '}
            <Link href="/admin/editeurs-log" className="text-accent-blue hover:underline">
              le journal éditeurs
            </Link>
            .
          </p>
        </div>
        {nbNonLus > 0 && (
          <form action={markAllActivityRead}>
            <button
              type="submit"
              className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy/90 transition-colors"
            >
              Tout marquer comme lu ({nbNonLus})
            </button>
          </form>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTRES.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'tous' ? '/admin/activite' : `/admin/activite?filtre=${f.key}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filtreKey === f.key
                ? 'bg-accent-blue text-white border-accent-blue'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-navy'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card padding="xl" className="text-center text-gray-400 text-sm">
          Aucun événement.
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-gray-50">
            {rows.map((row) => {
              const meta = TYPE_META[row.type] ?? { label: row.type, variant: 'neutral' as BadgeVariant }
              const href = cibleHref(row)
              const diffEntries = row.diff ? Object.entries(row.diff) : []
              return (
                <li
                  key={row.id}
                  className={`flex gap-3 px-4 py-3 ${row.lu ? '' : 'bg-accent-blue/5'}`}
                >
                  <div className="pt-0.5">
                    <span
                      className={`block w-2 h-2 rounded-full ${row.lu ? 'bg-transparent' : 'bg-accent-blue'}`}
                      aria-hidden
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={meta.variant} size="sm">
                        {meta.label}
                      </Badge>
                      <span className="text-sm text-navy font-medium">
                        {row.acteur_label || 'Inconnu'}
                      </span>
                      {row.cible_label && (
                        <span className="text-sm text-gray-500 truncate">
                          →{' '}
                          {href ? (
                            <Link href={href} className="text-accent-blue hover:underline">
                              {row.cible_label}
                            </Link>
                          ) : (
                            row.cible_label
                          )}
                        </span>
                      )}
                    </div>
                    {diffEntries.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                        {diffEntries.map(([champ, d]) => (
                          <div key={champ} className="font-mono">
                            <span className="text-gray-400">{champ} :</span> {fmtVal(d.avant)}{' '}
                            <span className="text-gray-400">→</span> <span className="text-navy">{fmtVal(d.apres)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <time className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {new Date(row.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
