import { partnerLogos } from "@/lib/data";
import { Stethoscope, Wrench, Puzzle, Heart, Zap } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="bg-hero-gradient pt-[72px]">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text content */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-navy leading-[1.15] tracking-tight">
              Mieux exercer,
              <br />
              avec les bons outils.
            </h1>
            <p className="mt-5 text-gray-600 text-base md:text-lg leading-relaxed max-w-lg">
              Grâce aux avis de vos confrères, trouvez les logiciels
              les plus adaptés à votre pratique au quotidien.
            </p>
          </div>

          {/* Right: 3D toolbox illustration (placeholder) */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-[420px] h-[340px]">
              {/* Main toolbox body */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 via-accent-pink/15 to-accent-orange/20 rounded-3xl transform rotate-2" />
              <div className="absolute inset-2 bg-white/60 backdrop-blur-sm rounded-2xl shadow-card flex items-center justify-center">
                <div className="grid grid-cols-3 gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-accent-blue/15 flex items-center justify-center">
                    <Stethoscope className="w-8 h-8 text-accent-blue" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-accent-orange/15 flex items-center justify-center">
                    <Wrench className="w-8 h-8 text-accent-orange" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-accent-pink/15 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-accent-pink" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-accent-yellow/15 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-accent-yellow" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-rating-green/15 flex items-center justify-center">
                    <Puzzle className="w-8 h-8 text-rating-green" />
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent-blue">+</span>
                  </div>
                </div>
              </div>
              {/* Floating decorations */}
              <div className="absolute -top-4 -right-4 w-10 h-10 bg-accent-yellow rounded-xl rotate-12 shadow-soft" />
              <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-accent-pink rounded-lg -rotate-12 shadow-soft" />
              <div className="absolute top-1/2 -right-6 w-6 h-6 bg-accent-blue rounded-full shadow-soft" />
            </div>
          </div>
        </div>
      </div>

      {/* Partners bar */}
      <div className="border-t border-white/50 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400 text-center mb-5">
            Le premier mouvement intersyndical autour de la e-santé
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {partnerLogos.map((partner) => (
              <div
                key={partner.name}
                className="px-3 py-2 bg-white/70 rounded-lg border border-gray-100 hover:border-gray-200 transition-all cursor-default flex items-center justify-center"
              >
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-8 max-w-[100px] object-contain opacity-60 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
