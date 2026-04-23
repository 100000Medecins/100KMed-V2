import { createServerClient } from '@/lib/supabase/server'
import HeroIllustration from './HeroIllustration'

async function getPartenaires() {
  try {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('partenaires')
      .select('id, nom, logo_url, lien_url')
      .eq('actif', true)
      .order('position', { ascending: true })
    return data ?? []
  } catch {
    return []
  }
}

async function getSiteConfig(cles: string[]): Promise<Record<string, string>> {
  try {
    const supabase = await createServerClient()
    const { data } = await (supabase as any)
      .from('site_config')
      .select('cle, valeur')
      .in('cle', cles)
    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.cle] = row.valeur
    return map
  } catch {
    return {}
  }
}

interface HeroSectionProps {
  nbSolutions?: number
  nbEvaluations?: number
  nbInscrits?: number
}

export default async function HeroSection({ nbSolutions = 0, nbEvaluations = 0, nbInscrits = 0 }: HeroSectionProps) {
  const [partenaires, config] = await Promise.all([
    getPartenaires(),
    getSiteConfig(['hero_titre', 'hero_sous_titre', 'label_partenaires', 'hero_image']),
  ])

  const heroTitre = config['hero_titre'] ?? '<p>Mieux exercer,<br>avec les bons outils.</p>'
  const heroSousTitre = config['hero_sous_titre'] ?? 'Grâce aux avis de vos confrères, trouvez les logiciels les plus adaptés à votre pratique au quotidien.'
  const labelPartenaires = config['label_partenaires'] ?? 'Le premier mouvement intersyndical autour de la e-santé'
  const heroImage = config['hero_image'] ?? ''

  const nbEvaluationsLabel = nbEvaluations > 0
    ? `${nbEvaluations.toLocaleString('fr-FR')} avis`
    : null
  const nbSolutionsLabel = nbSolutions > 0
    ? `${nbSolutions}+ logiciels`
    : null
  const nbInscritsLabel = nbInscrits > 0
    ? `${nbInscrits.toLocaleString('fr-FR')} inscrits`
    : null

  return (
    <section className="bg-hero-gradient pt-[72px] relative overflow-hidden">
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <div>
            <h1
              className="text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-white leading-[1.15] tracking-tight [&_p]:m-0 [&_br]:block"
              dangerouslySetInnerHTML={{ __html: heroTitre }}
            />
            <div
              className="mt-5 text-white/70 text-base md:text-lg leading-relaxed max-w-lg [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: heroSousTitre }}
            />
          </div>

          {/* Right: image uploadée ou illustration animée par défaut */}
          <div className="hidden lg:flex items-center justify-center">
            {heroImage ? (
              <img
                src={heroImage}
                alt="Illustration hero"
                className="w-[440px] h-[320px] object-contain drop-shadow-2xl"
              />
            ) : (
              <HeroIllustration
                nbSolutionsLabel={nbSolutionsLabel}
                nbEvaluationsLabel={nbEvaluationsLabel}
                nbInscritsLabel={nbInscritsLabel}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile : illustration animée + label partenaires (sans logos) */}
      <div className="lg:hidden border-t border-white/15" style={{ background: 'rgba(255,255,255,0.10)' }}>
        <div className="flex flex-col items-center py-6 px-6 gap-4">
          {!heroImage && (
            <div className="scale-75 origin-top -mb-20">
              <HeroIllustration
                nbSolutionsLabel={nbSolutionsLabel}
                nbEvaluationsLabel={nbEvaluationsLabel}
                nbInscritsLabel={nbInscritsLabel}
              />
            </div>
          )}
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60 text-center">
            {labelPartenaires}
          </p>
        </div>
      </div>

      {/* Partners bar — desktop uniquement */}
      {partenaires.length > 0 && (
        <div className="hidden md:block border-t border-white/15" style={{ background: 'rgba(255,255,255,0.18)' }}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60 text-center mb-5">
              {labelPartenaires}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {partenaires.map((p) => {
                return (
                  <div key={p.id} className="px-3 py-2 md:px-4 md:py-2.5 rounded-xl border border-white/30 flex items-center justify-center bg-white/40">
                    {p.logo_url
                      ? <img src={p.logo_url} alt={p.nom} className={`object-contain opacity-85 ${['SML', 'Le Bloc'].includes(p.nom) ? 'h-6 max-w-[70px] md:h-6 md:max-w-[85px]' : 'h-4 max-w-[55px] md:h-6 md:max-w-[85px]'}`} />
                      : <span className="text-[10px] md:text-xs font-semibold text-white/80">{p.nom}</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fondu de sortie vers le fond du site */}
      <div className="pointer-events-none h-8" style={{ background: 'linear-gradient(to bottom, transparent 0%, #E8EDF8 100%)' }} />
    </section>
  );
}
