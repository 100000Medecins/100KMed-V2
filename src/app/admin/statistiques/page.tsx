export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { resolveSpecialite } from '@/lib/auth/psc-specialites'
import {
  MessageSquare,
  Users,
  Package,
  Star,
  TrendingUp,
  BarChart3,
  Activity,
  Clock,
  Stethoscope,
  Briefcase,
  UserX,
} from 'lucide-react'

/* ================================================================== */
/*  DATA FETCHING                                                      */
/* ================================================================== */

/** Récupère toutes les lignes d'une requête en paginant par lots de 1000. */
async function fetchAll<T>(
  query: ReturnType<ReturnType<typeof createServiceRoleClient>['from']>['select'] extends (...args: infer _A) => infer R ? R : never,
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = query as any
  const PAGE = 1000
  const all: T[] = []
  let offset = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await q.range(offset, offset + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as T[]))
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

async function getStats() {
  const supabase = createServiceRoleClient()

  // ── Evaluations (finalisées) ──
  const allEvals = await fetchAll<{
    id: string; solution_id: string | null; user_id: string | null
    moyenne_utilisateur: number | null; last_date_note: string | null
    scores: Record<string, number | null> | null; created_at: string | null
  }>(
    supabase
      .from('evaluations')
      .select('id, solution_id, user_id, moyenne_utilisateur, last_date_note, scores, created_at')
      .not('last_date_note', 'is', null)
  )
  const totalAvis = allEvals.length

  // ── Users ──
  const allUsers = await fetchAll<{
    id: string; specialite: string | null; mode_exercice: string | null
    densite_population: string | null; annee_naissance: number | null
    is_actif: boolean; is_complete: boolean; created_at: string | null
  }>(
    supabase
      .from('users')
      .select('id, specialite, mode_exercice, densite_population, annee_naissance, is_actif, is_complete, created_at')
  )
  const totalUsers = allUsers.length
  const completedProfiles = allUsers.filter((u) => u.is_complete).length

  // ── Solutions ──
  const { data: solutions } = await supabase
    .from('solutions')
    .select('id, nom, slug, logo_url, evaluation_redac_note, categorie:categories(id, nom), id_editeur')

  const allSolutions = solutions ?? []
  const totalSolutions = allSolutions.length

  // ── Categories ──
  const { data: categories } = await supabase
    .from('categories')
    .select('id, nom, actif')
    .eq('actif', true)

  const totalCategories = (categories ?? []).length

  // ── Editeurs ──
  const { data: editeurs } = await supabase
    .from('editeurs')
    .select('id, nom')

  const editeurMap = new Map<string, string>()
  for (const ed of editeurs ?? []) editeurMap.set(ed.id, ed.nom ?? '')

  // ── Note moyenne ──
  const ratings = allEvals
    .map((e) => e.moyenne_utilisateur as number)
    .filter((v): v is number => v != null && !isNaN(v))
  const avgRating = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0

  // ── Fraîcheur des notes ──
  const now = new Date()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
  const evalsWithDate = allEvals.filter((e) => e.last_date_note)
  const evalsRecentes = evalsWithDate.filter((e) => (e.last_date_note as string) >= oneYearAgo).length
  const evalsAnciennes = evalsWithDate.length - evalsRecentes
  const pctRecentes = evalsWithDate.length > 0 ? Math.round((evalsRecentes / evalsWithDate.length) * 100) : 0

  // ── Activité récente ──
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const recentCount = allEvals.filter(
    (e) => e.last_date_note && (e.last_date_note as string) >= sevenDaysAgo
  ).length

  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // ── Suppressions de comptes ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: suppressions } = await (supabase as any)
    .from('compte_suppressions')
    .select('deleted_at')
  const allSuppressions: { deleted_at: string }[] = suppressions ?? []
  const totalSuppressions = allSuppressions.length
  const suppressionsCeMois = allSuppressions.filter(
    (s) => s.deleted_at.startsWith(thisMonthKey)
  ).length

  const thisMonthCount = allEvals.filter(
    (e) => e.last_date_note && (e.last_date_note as string).startsWith(thisMonthKey)
  ).length

  // ── Evaluations par mois (12 derniers mois) ──
  const evalMonths: { label: string; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const count = allEvals.filter(
      (e) => e.last_date_note && (e.last_date_note as string).startsWith(monthKey)
    ).length
    evalMonths.push({ label, count })
  }

  // ── Inscriptions par mois (12 derniers mois) ──
  const signupMonths: { label: string; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const count = allUsers.filter(
      (u) => u.created_at && (u.created_at as string).startsWith(monthKey)
    ).length
    signupMonths.push({ label, count })
  }

  // ── Distribution des notes (1-5) ──
  const ratingDistribution = [0, 0, 0, 0, 0]
  for (const r of ratings) {
    const bucket = Math.min(Math.max(Math.round(r) - 1, 0), 4)
    ratingDistribution[bucket]++
  }

  // ── Avis par catégorie ──
  const solutionCatMap = new Map<string, string>()
  for (const sol of allSolutions) {
    const cat = sol.categorie as unknown as { id: string; nom: string } | null
    solutionCatMap.set(sol.id, cat?.nom ?? 'Sans catégorie')
  }

  const parCategorie: Record<string, number> = {}
  for (const ev of allEvals) {
    const catNom = ev.solution_id ? solutionCatMap.get(ev.solution_id) ?? 'Sans catégorie' : 'Sans catégorie'
    parCategorie[catNom] = (parCategorie[catNom] || 0) + 1
  }
  const avisByCategorie = Object.entries(parCategorie)
    .map(([nom, count]) => ({ nom, count }))
    .sort((a, b) => b.count - a.count)

  // ── Top solutions par nombre d'avis ──
  const avisPerSolution: Record<string, number> = {}
  for (const ev of allEvals) {
    if (ev.solution_id) avisPerSolution[ev.solution_id] = (avisPerSolution[ev.solution_id] || 0) + 1
  }
  const topSolutions = Object.entries(avisPerSolution)
    .map(([id, count]) => {
      const sol = allSolutions.find((s) => s.id === id)
      return { id, nom: sol?.nom ?? 'Inconnue', count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // ── Top solutions par note ──
  const avgPerSolution: Record<string, { sum: number; n: number }> = {}
  for (const ev of allEvals) {
    const m = ev.moyenne_utilisateur as number
    if (ev.solution_id && m != null && !isNaN(m)) {
      if (!avgPerSolution[ev.solution_id]) avgPerSolution[ev.solution_id] = { sum: 0, n: 0 }
      avgPerSolution[ev.solution_id].sum += m
      avgPerSolution[ev.solution_id].n++
    }
  }
  const topRated = Object.entries(avgPerSolution)
    .filter(([, v]) => v.n >= 1)
    .map(([id, v]) => {
      const sol = allSolutions.find((s) => s.id === id)
      return { id, nom: sol?.nom ?? 'Inconnue', avg: v.sum / v.n, count: v.n }
    })
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8)

  // ── Utilisateurs par spécialité ──
  // SM26, SM53, SM54 → tous résolus en 'Médecin généraliste' via SM_SPECIALITES
  const specCount: Record<string, number> = {}
  for (const u of allUsers) {
    const spec = resolveSpecialite(u.specialite as string) || 'Non renseignée'
    specCount[spec] = (specCount[spec] || 0) + 1
  }
  const usersBySpecialite = Object.entries(specCount)
    .map(([nom, count]) => ({ nom, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Utilisateurs par mode d'exercice ──
  const modeCount: Record<string, number> = {}
  for (const u of allUsers) {
    const mode = (u.mode_exercice as string) || 'Non renseigné'
    modeCount[mode] = (modeCount[mode] || 0) + 1
  }
  const usersByMode = Object.entries(modeCount)
    .map(([nom, count]) => ({ nom, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalAvis,
    totalUsers,
    completedProfiles,
    totalSolutions,
    totalCategories,
    avgRating,
    recentCount,
    thisMonthCount,
    evalMonths,
    signupMonths,
    ratingDistribution,
    avisByCategorie,
    topSolutions,
    topRated,
    usersBySpecialite,
    usersByMode,
    evalsRecentes,
    evalsAnciennes,
    pctRecentes,
    totalSuppressions,
    suppressionsCeMois,
  }
}

/* ================================================================== */
/*  SVG CHART COMPONENTS                                               */
/* ================================================================== */

const CHART_COLORS = ['#1B2A4A', '#2A3F66', '#4A90D9', '#6BA3E0', '#8DB8E8', '#A8C8EE', '#C3D9F4', '#DEEAFA', '#EEF1F8', '#F7F8FC']

/* ── Line Chart ────────────────────────────────────────────────────── */
function LineChart({
  data,
  color = '#4A90D9',
  height = 220,
}: {
  data: { label: string; count: number }[]
  color?: string
  height?: number
}) {
  const w = 640
  const h = height
  const padX = 48
  const padY = 28
  const padBottom = 36
  const chartW = w - padX * 2
  const chartH = h - padY - padBottom
  const max = Math.max(...data.map((d) => d.count), 1)

  const points = data.map((d, i) => ({
    x: padX + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padY + chartH - (d.count / max) * chartH,
    ...d,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padY + chartH} L${points[0].x},${padY + chartH} Z`

  const gridCount = 4
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = Math.round((max / gridCount) * i)
    const y = padY + chartH - (val / max) * chartH
    return { y, val }
  })

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padX} y1={g.y} x2={w - padX} y2={g.y} stroke="#f0f0f5" strokeWidth="1" />
          <text x={padX - 10} y={g.y + 4} textAnchor="end" fill="#9ca3af" fontSize="11" fontFamily="inherit">
            {g.val}
          </text>
        </g>
      ))}
      {/* Area gradient */}
      <defs>
        <linearGradient id={`areaGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#areaGrad-${color.replace('#', '')})`} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points + Labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={color} strokeWidth="2.5" />
          {p.count > 0 && (
            <text x={p.x} y={p.y - 12} textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="inherit">
              {p.count}
            </text>
          )}
          <text x={p.x} y={h - 8} textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="inherit">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

/* ── Bar Chart Horizontal ──────────────────────────────────────────── */
function BarChartHorizontal({
  data,
  colors,
}: {
  data: { label: string; value: number; extra?: string }[]
  colors?: string[]
}) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-start gap-3 pt-0.5">
          <span className="text-xs text-gray-600 w-36 shrink-0 text-right font-medium leading-tight">{d.label}</span>
          <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative">
            <div
              className="h-full rounded-lg"
              style={{
                width: `${Math.max((d.value / max) * 100, 2)}%`,
                backgroundColor: colors?.[i] ?? CHART_COLORS[i % CHART_COLORS.length],
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span className="text-sm font-bold text-navy w-14 text-right">{d.extra ?? d.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Rating Distribution (Vertical Bars) ───────────────────────────── */
function RatingDistributionChart({ distribution }: { distribution: number[] }) {
  const max = Math.max(...distribution, 1)
  const colors = ['#C3D9F4', '#8DB8E8', '#6BA3E0', '#4A90D9', '#1B2A4A']

  return (
    <div className="flex items-end gap-4 h-44 px-2">
      {distribution.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <span className="text-xs font-bold text-navy">{count}</span>
          <div className="w-full bg-gray-50 rounded-t-xl overflow-hidden flex flex-col justify-end" style={{ height: '110px' }}>
            <div
              className="w-full rounded-t-xl"
              style={{
                height: `${Math.max((count / max) * 100, 3)}%`,
                backgroundColor: colors[i],
                transition: 'height 0.6s ease',
              }}
            />
          </div>
          <div className="flex items-center gap-0.5">
            <Star className="w-3.5 h-3.5 fill-navy text-navy" />
            <span className="text-xs font-semibold text-gray-600">{i + 1}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Donut Chart ───────────────────────────────────────────────────── */
function DonutChart({
  data,
  size = 140,
  label,
}: {
  data: { nom: string; count: number }[]
  size?: number
  label?: string
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 10
  const innerR = r * 0.62

  let cumAngle = -Math.PI / 2
  const slices = data.map((d, i) => {
    const angle = (d.count / total) * Math.PI * 2
    const startAngle = cumAngle
    const endAngle = cumAngle + angle
    cumAngle = endAngle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(endAngle)
    const iy1 = cy + innerR * Math.sin(endAngle)
    const ix2 = cx + innerR * Math.cos(startAngle)
    const iy2 = cy + innerR * Math.sin(startAngle)
    const largeArc = angle > Math.PI ? 1 : 0

    const path = `M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} L${ix1},${iy1} A${innerR},${innerR} 0 ${largeArc} 0 ${ix2},${iy2} Z`
    return { path, color: CHART_COLORS[i % CHART_COLORS.length], ...d }
  })

  return (
    <div className="flex items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1B2A4A" fontSize="24" fontWeight="800" fontFamily="inherit">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily="inherit">
          {label ?? 'total'}
        </text>
      </svg>
      <div className="space-y-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600 truncate">{s.nom}</span>
            <span className="text-xs font-bold text-navy ml-auto shrink-0">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── KPI Card ──────────────────────────────────────────────────────── */
function KpiCard({
  icon,
  label,
  value,
  sub,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  suffix?: string
}) {
  return (
    <div className="bg-white rounded-card shadow-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center">{icon}</div>
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className="text-3xl font-extrabold text-navy tracking-tight">
        {value}
        {suffix && <span className="text-base font-normal text-gray-400 ml-0.5">{suffix}</span>}
      </p>
      <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
    </div>
  )
}

/* ── Section Panel ─────────────────────────────────────────────────── */
function Panel({
  icon,
  title,
  children,
  className = '',
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-card shadow-card p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-sm font-bold text-navy">{title}</h2>
      </div>
      {children}
    </div>
  )
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

export default async function AdminStatistiquesPage() {
  const stats = await getStats()

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Statistiques</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vue d&apos;ensemble &mdash; mis à jour en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {new Date().toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  ROW 1 — KPI CARDS                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<MessageSquare className="w-5 h-5 text-navy" />}
          label="Total avis"
          value={stats.totalAvis.toLocaleString('fr-FR')}
          sub={`+${stats.recentCount} cette semaine · +${stats.thisMonthCount} ce mois`}
        />
        <KpiCard
          icon={<Users className="w-5 h-5 text-navy" />}
          label="Utilisateurs"
          value={stats.totalUsers.toLocaleString('fr-FR')}
          sub={`${stats.completedProfiles} profils complétés (${stats.totalUsers > 0 ? Math.round((stats.completedProfiles / stats.totalUsers) * 100) : 0}%)`}
        />
        <KpiCard
          icon={<Package className="w-5 h-5 text-navy" />}
          label="Solutions"
          value={String(stats.totalSolutions)}
          sub={`${stats.totalCategories} catégorie${stats.totalCategories > 1 ? 's' : ''} actives`}
        />
        <KpiCard
          icon={<Star className="w-5 h-5 text-navy" />}
          label="Note moyenne"
          value={stats.avgRating.toFixed(1)}
          sub={`sur ${stats.totalAvis} évaluations`}
          suffix="/5"
        />
      </div>

      {/* Comptes supprimés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          icon={<UserX className="w-5 h-5 text-red-400" />}
          label="Comptes supprimés"
          value={String(stats.totalSuppressions)}
          sub={`+${stats.suppressionsCeMois} ce mois-ci`}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  ROW 1b — FRAÎCHEUR DES AVIS                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Panel icon={<Clock className="w-5 h-5 text-navy" />} title="Fraîcheur des avis">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Barre de progression */}
          <div className="flex-1 w-full">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Moins d&apos;1 an — <span className="font-bold text-green-600">{stats.evalsRecentes}</span></span>
              <span>Plus d&apos;1 an — <span className="font-bold text-amber-500">{stats.evalsAnciennes}</span></span>
            </div>
            <div className="h-5 w-full bg-amber-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${stats.pctRecentes}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              <span className="font-bold text-navy text-sm">{stats.pctRecentes}%</span> des avis datent de moins d&apos;un an
            </p>
          </div>
          {/* Chiffres clés */}
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-green-600">{stats.evalsRecentes}</p>
              <p className="text-xs text-gray-400 mt-0.5">Récents (&lt; 1 an)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-amber-500">{stats.evalsAnciennes}</p>
              <p className="text-xs text-gray-400 mt-0.5">Anciens (&gt; 1 an)</p>
            </div>
          </div>
        </div>
      </Panel>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  ROW 2 — EVAL TREND + DISTRIBUTION                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          icon={<TrendingUp className="w-5 h-5 text-navy" />}
          title="Évaluations par mois"
          className="lg:col-span-2"
        >
          <LineChart data={stats.evalMonths} color="#1B2A4A" />
        </Panel>

        <Panel
          icon={<BarChart3 className="w-5 h-5 text-navy" />}
          title="Distribution des notes"
        >
          <RatingDistributionChart distribution={stats.ratingDistribution} />
        </Panel>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  ROW 3 — CATEGORIES + TOP SOLUTIONS                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel
          icon={<Activity className="w-5 h-5 text-navy" />}
          title="Avis par catégorie"
        >
          <DonutChart data={stats.avisByCategorie} label="avis" />
        </Panel>

        <Panel
          icon={<MessageSquare className="w-5 h-5 text-navy" />}
          title="Top solutions (nb avis)"
        >
          {stats.topSolutions.length > 0 ? (
            <BarChartHorizontal
              data={stats.topSolutions.map((s) => ({ label: s.nom, value: s.count }))}
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
          )}
        </Panel>

        <Panel
          icon={<Star className="w-5 h-5 text-navy" />}
          title="Meilleures notes"
        >
          {stats.topRated.length > 0 ? (
            <BarChartHorizontal
              data={stats.topRated.map((s) => ({
                label: s.nom,
                value: s.avg,
                extra: `${s.avg.toFixed(1)}/5`,
              }))}
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
          )}
        </Panel>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  ROW 4 — USERS DEMOGRAPHICS                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          icon={<Stethoscope className="w-5 h-5 text-navy" />}
          title="Spécialités (top 10)"
        >
          {stats.usersBySpecialite.length > 0 ? (
            <BarChartHorizontal
              data={stats.usersBySpecialite.map((s) => ({ label: s.nom, value: s.count }))}
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>
          )}
        </Panel>

        <Panel
          icon={<Briefcase className="w-5 h-5 text-navy" />}
          title="Mode d'exercice"
        >
          <DonutChart data={stats.usersByMode} label="users" size={130} />
        </Panel>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  ROW 5 — SIGNUPS TREND                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Panel
        icon={<TrendingUp className="w-5 h-5 text-navy" />}
        title="Inscriptions par mois"
      >
        <LineChart data={stats.signupMonths} color="#4A90D9" />
      </Panel>
    </div>
  )
}
