import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

type Etude = { id: string; titre: string; description: string | null; date_fin: string | null }
type Questionnaire = { id: string; titre: string; description: string | null; date_fin: string | null }

async function getData() {
  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: etudes }, { data: questionnaires }, { data: config }] = await Promise.all([
    s.from('etudes_cliniques').select('id, titre, description, date_fin').or(`date_fin.is.null,date_fin.gte.${today}`).order('created_at', { ascending: false }).limit(2),
    s.from('questionnaires_these').select('id, titre, description, date_fin').eq('statut', 'publie').or(`date_fin.is.null,date_fin.gte.${today}`).order('created_at', { ascending: false }).limit(2),
    s.from('site_config').select('cle, valeur').eq('cle', 'section_communaute_visible').single(),
  ])

  const visible = config?.valeur !== 'false'
  return { etudes: etudes ?? [], questionnaires: questionnaires ?? [], visible }
}

function stripHtml(html: string | null) {
  if (!html) return null
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function dateFin(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function Carte({ emoji, couleur, badge, titre, description, date_fin, href, cta }: {
  emoji: string; couleur: string; badge: string; titre: string
  description: string | null; date_fin: string | null; href: string; cta: string
}) {
  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 h-full flex flex-col">
        <div className="h-1" style={{ background: couleur }} />
        <div className="px-4 py-4 flex flex-col flex-1 gap-2">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wide mb-1 block" style={{ color: couleur }}>{badge}</span>
              <h3 className="font-bold text-navy text-sm leading-snug group-hover:text-accent-blue transition-colors line-clamp-2">
                {titre}
              </h3>
            </div>
          </div>
          {description && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{description}</p>
          )}
          <div className="flex items-center justify-between mt-auto pt-1">
            {date_fin ? (
              <span className="text-xs text-gray-400">📅 Jusqu'au {dateFin(date_fin)}</span>
            ) : <span />}
            <span className="text-xs font-semibold" style={{ color: couleur }}>{cta} →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default async function CommunautePreview() {
  const { etudes, questionnaires, visible } = await getData()
  if (!visible) return null
  if (etudes.length === 0 && questionnaires.length === 0) return null

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-bold text-accent-blue uppercase tracking-widest mb-2">Communauté</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-navy leading-snug">
              Participez à la recherche
            </h2>
          </div>
          <Link href="/mon-compte/etudes-cliniques" className="shrink-0 text-sm font-semibold text-accent-blue hover:underline hidden sm:block">
            Voir tout →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {etudes.map((e: Etude) => (
            <Carte
              key={e.id}
              emoji="🔬"
              couleur="#10B981"
              badge="Étude clinique"
              titre={e.titre}
              description={stripHtml(e.description)}
              date_fin={e.date_fin}
              href="/mon-compte/etudes-cliniques"
              cta="En savoir plus"
            />
          ))}
          {questionnaires.map((q: Questionnaire) => (
            <Carte
              key={q.id}
              emoji="📋"
              couleur="#8A5CF6"
              badge="Questionnaire de thèse"
              titre={q.titre}
              description={stripHtml(q.description)}
              date_fin={q.date_fin}
              href="/mon-compte/questionnaires-these"
              cta="Participer"
            />
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link href="/mon-compte/etudes-cliniques" className="inline-flex items-center gap-2 px-6 py-3 rounded-button text-sm font-semibold bg-navy text-white hover:bg-navy/90 transition-colors">
            Voir tout
          </Link>
        </div>
      </div>
    </section>
  )
}
