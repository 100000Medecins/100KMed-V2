'use client'

import Link from 'next/link'
import { FileText, Mail } from 'lucide-react'

export type PlanningEvent = {
  id: string
  titre: string
  date: string
  type: 'article' | 'newsletter'
  href: string
}

const TYPE_CONFIG = {
  article: {
    label: 'Article',
    bg: 'bg-accent-blue/10',
    text: 'text-accent-blue',
    dot: 'bg-accent-blue',
    badge: 'bg-accent-blue/10 text-accent-blue',
    Icon: FileText,
  },
  newsletter: {
    label: 'Newsletter',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    dot: 'bg-accent-orange',
    badge: 'bg-orange-100 text-orange-600',
    Icon: Mail,
  },
} as const

const DAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function sameDay(dateObj: Date, year: number, month: number, day: number) {
  return dateObj.getFullYear() === year && dateObj.getMonth() === month && dateObj.getDate() === day
}

function EventRow({ event, overdue = false }: { event: PlanningEvent & { dateObj: Date }; overdue?: boolean }) {
  const config = TYPE_CONFIG[event.type]
  const Icon = config.Icon
  const dateStr = event.dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })
  const timeStr = event.dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

  return (
    <Link href={event.href} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-light transition-colors group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${overdue ? 'bg-red-50' : config.bg}`}>
        <Icon className={`w-4 h-4 ${overdue ? 'text-red-400' : config.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-navy truncate group-hover:text-accent-blue transition-colors">{event.titre}</p>
        <p className={`text-xs font-medium mt-0.5 inline-flex px-2 py-0.5 rounded-full ${config.badge}`}>{config.label}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold capitalize ${overdue ? 'text-red-400' : 'text-navy'}`}>{dateStr}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeStr}</p>
      </div>
    </Link>
  )
}

export default function PlanningCalendar({ events }: { events: PlanningEvent[] }) {
  const now = new Date()
  const today = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }

  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const parsed = events.map(e => ({ ...e, dateObj: new Date(e.date) }))

  const overdue = [...parsed]
    .filter(e => e.dateObj < now)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

  const upcoming = [...parsed]
    .filter(e => e.dateObj >= now)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

  return (
    <div className="space-y-8">

      {/* Légende */}
      <div className="flex items-center gap-5 flex-wrap">
        {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, (typeof TYPE_CONFIG)[keyof typeof TYPE_CONFIG]][]).map(([type, config]) => (
          <div key={type} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
            <span className="text-sm text-gray-500">{config.label}</span>
          </div>
        ))}
        <span className="text-sm text-gray-400">·</span>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center text-white text-xs font-bold">1</span>
          <span className="text-sm text-gray-500">Aujourd'hui</span>
        </div>
      </div>

      {/* Grilles 3 mois */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {months.map(({ year, month }) => {
          const cells = getMonthGrid(year, month)
          return (
            <div key={`${year}-${month}`} className="bg-white rounded-card shadow-card p-5">
              <h3 className="text-sm font-semibold text-navy text-center mb-4">
                {MONTHS_FR[month]} {year}
              </h3>

              {/* En-têtes jours */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS_FR.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-gray-300 uppercase">
                    {d}
                  </div>
                ))}
              </div>

              {/* Cellules */}
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} />
                  const dayEvents = parsed.filter(e => sameDay(e.dateObj, year, month, day))
                  const isToday = year === today.y && month === today.m && day === today.d
                  const hasEvents = dayEvents.length > 0

                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium transition-colors ${
                        isToday
                          ? 'bg-accent-blue text-white font-bold'
                          : hasEvents
                            ? 'text-navy font-semibold'
                            : 'text-gray-400'
                      }`}>
                        {day}
                      </span>
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-0.5 justify-center flex-wrap max-w-[24px]">
                          {dayEvents.map(e => (
                            <span
                              key={e.id}
                              className={`w-1.5 h-1.5 rounded-full ${TYPE_CONFIG[e.type].dot}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* En retard */}
      {overdue.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
            ⚠ En attente de publication (heure passée)
          </h2>
          <div className="bg-white rounded-card shadow-card divide-y divide-gray-50 border border-red-100">
            {overdue.map(event => <EventRow key={event.id} event={event} overdue />)}
          </div>
        </div>
      )}

      {/* Liste chronologique */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Événements programmés
        </h2>

        {upcoming.length === 0 ? (
          <div className="bg-white rounded-card shadow-card px-6 py-16 text-center text-gray-400 text-sm">
            Aucun contenu à venir sur les 3 prochains mois.
          </div>
        ) : (
          <div className="bg-white rounded-card shadow-card divide-y divide-gray-50">
            {upcoming.map(event => <EventRow key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </div>
  )
}
