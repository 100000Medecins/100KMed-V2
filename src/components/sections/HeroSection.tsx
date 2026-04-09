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

export default async function HeroSection() {
  const [partenaires, config] = await Promise.all([
    getPartenaires(),
    getSiteConfig(['hero_titre', 'hero_sous_titre', 'label_partenaires', 'hero_image']),
  ])

  const heroTitre = config['hero_titre'] ?? '<p>Mieux exercer,<br>avec les bons outils.</p>'
  const heroSousTitre = config['hero_sous_titre'] ?? 'Grâce aux avis de vos confrères, trouvez les logiciels les plus adaptés à votre pratique au quotidien.'
  const labelPartenaires = config['label_partenaires'] ?? 'Le premier mouvement intersyndical autour de la e-santé'
  const heroImage = config['hero_image'] ?? ''

  return (
    <section className="bg-hero-gradient pt-[72px]">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <div>
            <h1
              className="text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-white leading-[1.15] tracking-tight [&_p]:m-0 [&_br]:block"
              dangerouslySetInnerHTML={{ __html: heroTitre }}
            />
            <div
              className="mt-5 text-white/80 text-base md:text-lg leading-relaxed max-w-lg [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: heroSousTitre }}
            />
          </div>

          {/* Right: image uploadée ou illustration par défaut */}
          <div className="hidden lg:flex items-center justify-center">
            {heroImage ? (
              <img
                src={heroImage}
                alt="Illustration hero"
                className="w-[440px] h-[380px] object-contain drop-shadow-2xl"
              />
            ) : (
              <div className="relative w-[420px] h-[360px] flex items-center justify-center">
                <div className="text-[220px] leading-none select-none drop-shadow-2xl" style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}>
                  🧰
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Partners bar */}
      {partenaires.length > 0 && (
        <div className="bg-partners-gradient border-t border-gray-200/60">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 text-center mb-5">
              {labelPartenaires}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {partenaires.map((p) => {
                const inner = (
                  <div className="px-3 py-2 bg-white/80 rounded-lg border border-gray-100 hover:border-gray-300 transition-all flex items-center justify-center">
                    {p.logo_url
                      ? <img src={p.logo_url} alt={p.nom} className="h-8 max-w-[100px] object-contain opacity-60 hover:opacity-100 transition-opacity" />
                      : <span className="text-xs font-semibold text-gray-500">{p.nom}</span>
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
    </section>
  );
}
