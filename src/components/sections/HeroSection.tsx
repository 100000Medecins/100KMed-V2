import { createServerClient } from '@/lib/supabase/server'

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
}

export default async function HeroSection({ nbSolutions = 0, nbEvaluations = 0 }: HeroSectionProps) {
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

          {/* Right: image uploadée ou illustration par défaut */}
          <div className="hidden lg:flex items-center justify-center">
            {heroImage ? (
              <img
                src={heroImage}
                alt="Illustration hero"
                className="w-[440px] h-[320px] object-contain drop-shadow-2xl"
              />
            ) : (
              <div className="relative w-[420px] h-[320px]">

                {/* Badge Ségur — haut gauche */}
                <div className="absolute top-[2px] left-[12px] z-10 bg-emerald-500/25 backdrop-blur border border-emerald-400/40 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg rotate-[-2deg]">
                  <span className="text-emerald-400 text-sm">✓</span>
                  <span className="text-white/90 text-xs font-medium">Ségur certifié</span>
                </div>

                {/* Badge RPPS — haut droite */}
                <div className="absolute top-[0px] right-[8px] z-10 bg-blue-500/20 backdrop-blur border border-blue-400/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg rotate-[2deg]">
                  <span className="text-blue-300 text-sm">⚡</span>
                  <span className="text-white/90 text-xs font-medium">RPPS connecté</span>
                </div>

                {/* Carte — derrière gauche */}
                <div className="absolute top-[48px] left-[4px] w-48 backdrop-blur-sm border border-white/15 rounded-2xl p-3 shadow-xl rotate-[-5deg]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex gap-0.5 mb-1.5">
                    {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">"Gain de temps considérable sur la télétransmission."</p>
                  <p className="text-white/35 text-[10px] mt-1">Dr. C. — Péd. · Nantes</p>
                </div>

                {/* Carte — derrière droite */}
                <div className="absolute top-[42px] right-[4px] w-44 backdrop-blur-sm border border-white/15 rounded-2xl p-3 shadow-xl rotate-[4deg]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex gap-0.5 mb-1.5">
                    {[1,2,3,4].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
                    <span className="text-white/30 text-xs">★</span>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">"Interface intuitive, prise en main en 20 min."</p>
                  <p className="text-white/35 text-[10px] mt-1">Dr. L. — MG · Bordeaux</p>
                </div>

                {/* Carte centrale principale */}
                <div className="absolute top-[82px] left-1/2 -translate-x-1/2 w-56 backdrop-blur-md border border-white/25 rounded-2xl p-4 shadow-2xl z-20" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-accent-blue/40 flex items-center justify-center text-base">🩺</div>
                    <div>
                      <p className="text-white text-sm font-semibold">Logiciel de gestion</p>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-xs">★</span>)}
                      </div>
                    </div>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">"Enfin un outil qui s'adapte vraiment à notre flux de patients."</p>
                  <p className="text-white/40 text-[10px] mt-1.5">Dr. M. — MG · Strasbourg</p>
                </div>

                {/* Badge nb solutions — chevauche la carte centrale en bas-droite */}
                {nbSolutionsLabel && (
                  <div className="absolute bottom-[55px] right-[6px] z-30 bg-purple-500/25 backdrop-blur border border-purple-400/35 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg rotate-[-2deg]">
                    <span className="text-purple-300 text-sm">🛠</span>
                    <span className="text-white/90 text-xs font-medium">{nbSolutionsLabel}</span>
                  </div>
                )}

                {/* Badge avis — bas centre */}
                {nbEvaluationsLabel && (
                  <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 z-20 bg-yellow-500/20 backdrop-blur border border-yellow-400/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
                    <span className="text-yellow-400 text-sm">★</span>
                    <span className="text-white/90 text-xs font-medium">{nbEvaluationsLabel}</span>
                  </div>
                )}

                {/* Mini citation — bas gauche */}
                <div className="absolute bottom-[52px] left-[6px] z-20 backdrop-blur border border-white/15 rounded-xl px-2.5 py-1.5 shadow-lg rotate-[2deg]" style={{ background: 'rgba(255,255,255,0.09)' }}>
                  <p className="text-white/70 text-[10px] leading-relaxed">"Parfait pour ma maison de santé."</p>
                  <p className="text-white/35 text-[10px]">Dr. A. — MG · Lyon</p>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Partners bar */}
      {partenaires.length > 0 && (
        <div className="border-t border-white/15" style={{ background: 'rgba(255,255,255,0.18)' }}>
          <div className="max-w-7xl mx-auto px-6 py-6">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/60 text-center mb-5">
              {labelPartenaires}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {partenaires.map((p) => {
                const inner = (
                  <div className="px-3 py-2 md:px-4 md:py-2.5 rounded-xl border border-white/30 hover:border-white/50 hover:shadow-lg flex items-center justify-center bg-white/40 transition-all duration-200 ease-out hover:scale-110 hover:-translate-y-0.5">
                    {p.logo_url
                      ? <img src={p.logo_url} alt={p.nom} className="h-4 max-w-[55px] md:h-6 md:max-w-[85px] object-contain opacity-85 hover:opacity-100 transition-opacity" />
                      : <span className="text-[10px] md:text-xs font-semibold text-white/80">{p.nom}</span>
                    }
                  </div>
                )
                return p.lien_url ? (
                  <a key={p.id} href={p.lien_url} target="_blank" rel="noopener noreferrer">{inner}</a>
                ) : (
                  <div key={p.id}>{inner}</div>
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
