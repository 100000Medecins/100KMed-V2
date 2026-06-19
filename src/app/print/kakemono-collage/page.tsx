/**
 * Page d'export — kakemono salon.
 *
 * Réutilise EXACTEMENT le composant <HeroIllustration /> du site (même
 * disposition, mêmes couleurs glassmorphism), scalé x4 et posé sur le
 * `bg-hero-gradient` du hero d'accueil. Les animations float sont
 * désactivées pour avoir une frame stable au screenshot.
 *
 * URL : http://localhost:3000/print/kakemono-collage
 *
 * Variantes via query string :
 *   - ?bg=transparent   → fond transparent (par défaut : dégradé du hero)
 *   - ?scale=3|4|5      → facteur d'échelle (défaut 4 → 1680×1280)
 *   - ?debug=1          → cadre de debug visible
 *
 * Export : voir scripts/export-kakemono-collage.ts (Puppeteer, PNG + PDF).
 */
import HeroIllustrationStatic from './HeroIllustrationStatic'

// force-dynamic obligatoire : la page lit ?bg=transparent et ?scale=N côté serveur.
// Avec force-static, Next 16 ignore les query strings → bug silencieux du 2026-06-11.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kakemono collage',
  robots: { index: false, follow: false },
}

// Valeurs figées pour l'export (alignées sur la prod au 2026-06-11).
// Ajuster ici si les chiffres ont bougé avant un nouvel export.
const LABELS = {
  solutions:   '94+ logiciels',
  evaluations: '672 avis',
  inscrits:    '5 995 inscrits',
  acronymes:   '78 acronymes',
}

export default async function KakemonoCollagePage({
  searchParams,
}: {
  // Next 16 : searchParams est une Promise (doit être await).
  searchParams: Promise<{ bg?: string; scale?: string; debug?: string }>
}) {
  const params = await searchParams
  const debug = params?.debug === '1'
  const transparent = params?.bg === 'transparent'
  const scale = Math.max(1, Math.min(6, Number(params?.scale) || 4))

  // HeroIllustrationStatic mesure 480×400 (canvas agrandi pour ne plus raboter les badges du haut).
  const baseW = 480
  const baseH = 400
  const scaledW = baseW * scale
  const scaledH = baseH * scale

  return (
    <main
      style={{
        background: transparent ? 'transparent' : undefined,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
      }}
      className={transparent ? '' : 'bg-hero-gradient'}
    >
      {/* Désactive toutes les animations float pour figer le rendu au screenshot.
          Si bg=transparent : force html/body à transparent (globals.css met un fond
          bleu pâle + trame de points sur body qui empêcherait le PNG d'être transparent). */}
      <style>{`
        .kakemono-stage *, .kakemono-stage *::before, .kakemono-stage *::after {
          animation: none !important;
          transition: none !important;
        }
        ${transparent ? `
          html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
          }
        ` : ''}
      `}</style>

      <div
        className="kakemono-stage"
        style={{
          width: scaledW,
          height: scaledH,
          outline: debug ? '2px dashed #ff00ff' : 'none',
          position: 'relative',
        }}
      >
        {/* Wrapper qui scale le HeroIllustration depuis son coin haut-gauche */}
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: baseW,
            height: baseH,
          }}
        >
          <HeroIllustrationStatic
            nbSolutionsLabel={LABELS.solutions}
            nbEvaluationsLabel={LABELS.evaluations}
            nbInscritsLabel={LABELS.inscrits}
            nbAcronymesLabel={LABELS.acronymes}
          />
        </div>
      </div>
    </main>
  )
}
