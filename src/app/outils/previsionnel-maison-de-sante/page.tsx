import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import OutilPrevisionnel from '@/components/outils/OutilPrevisionnel'
import { OUTIL_HTML } from './outil-html'
import './outil.css'

// Page 100 % statique : le balisage de l'outil est rendu ici, son script (public/outils/
// previsionnel-msp/outil.js) le fait vivre dans le navigateur. L'enregistrement dans le compte, le
// partage et les exports passent par l'API /api/outils/*, donc cette page ne lit jamais la session.

const CHEMIN = '/outils/previsionnel-maison-de-sante'
const TITRE = 'Prévisionnel Maison de Santé – simulateur de business-plan'
const DESCRIPTION =
  "Simulez les charges mensuelles, le revenu net par praticien, l'investissement et le plan de financement de votre cabinet de groupe ou de votre MSP."

export const metadata: Metadata = {
  title: TITRE, // complété par « | 100 000 Médecins » (gabarit du layout racine)
  description: DESCRIPTION,
  alternates: { canonical: CHEMIN },
  // Une route qui redéfinit openGraph ne reçoit plus l'image racine : on la redonne.
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: '100 000 Médecins',
    title: `${TITRE} | 100 000 Médecins`,
    description: DESCRIPTION,
    url: CHEMIN,
    images: ['/opengraph-image.png'],
  },
}

export default function PrevisionnelMaisonDeSantePage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        <section className="bg-hero-gradient pb-10">
          <div className="max-w-7xl mx-auto px-6 pt-4 pb-0 min-[1150px]:pl-[200px]">
            <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Prévisionnel maison de santé' }]} variant="light" />
          </div>
          <div className="max-w-4xl mx-auto px-6 text-center mt-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-7">Prévisionnel Maison de Santé</h1>
            <p className="text-white/80 text-base md:text-lg">
              Cet outil reprend le business-plan Excel que le jeune David Azérad avait conçu pour son propre projet de
              cabinet pluriprofessionnel sur Paris 20e, généralisé à toutes les professions d&apos;une maison de santé. Il simule les
              charges mensuelles, le revenu net par praticien, l&apos;investissement et le plan de financement de votre
              projet. Les valeurs pré-remplies sont des ordres de grandeur 2026, à adapter et à finaliser avec un
              expert-comptable.
            </p>
            <p className="text-white/70 text-sm mt-3">
              Connecté à votre compte, vous pouvez enregistrer jusqu&apos;à 5 prévisionnels, les partager par un lien en
              lecture seule et les exporter en Excel ou en PDF.
            </p>
          </div>
        </section>

        <section className="bg-[#F3F6F8] pb-10">
          <div id="msp" className="msp" dangerouslySetInnerHTML={{ __html: OUTIL_HTML }} />
          <OutilPrevisionnel />
          <p className="max-w-[1280px] mx-auto px-4 text-center text-sm text-gray-500">
            Vos saisies restent dans votre navigateur ; rien n&apos;est envoyé au serveur, sauf les prévisionnels que vous
            enregistrez dans votre compte.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
