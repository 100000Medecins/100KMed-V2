import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeEuro, CalendarClock, FileCheck2, FileText, Mail } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { CONTACT_EDITEURS, DOCUMENTS_PORTABILITE, EDITEURS_ENGAGES } from '@/lib/data/portabilite'
import { getDonneesPortabilite } from '@/lib/db/portabilite'

// Page publique statique (ISR) : la liste vient de src/lib/data/portabilite.ts, les logos et les
// liens de la base par le client public, sans cookies.
export const revalidate = 3600

const CHEMIN = '/portabilite'
const TITRE = 'Portabilité des données : les éditeurs engagés'
const NOMS_EDITEURS = EDITEURS_ENGAGES.map((e) => e.nom)
const DESCRIPTION =
  `${NOMS_EDITEURS.slice(0, -1).join(', ')} et ${NOMS_EDITEURS[NOMS_EDITEURS.length - 1]} s'engagent sans attendre 2027 : ` +
  "export des données du médecin gratuit, remis sous 30 jours, complet et documenté."

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

const ENGAGEMENTS = [
  {
    icon: BadgeEuro,
    titre: 'Gratuit',
    texte: 'Aucun frais facturé au médecin pour l’export de ses données.',
  },
  {
    icon: CalendarClock,
    titre: '30 jours maximum',
    texte:
      'Pour remettre ses données au médecin, à compter de sa demande, sans condition liée à la date de fin de son contrat.',
  },
  {
    icon: FileCheck2,
    titre: 'Complet et documenté',
    texte:
      'Toutes les données nécessaires à la continuité des soins de ses patients, avec le mode d’emploi qui permet au logiciel suivant de les reprendre.',
  },
]

const ETAPES: { date: string; texte: string; temps: 'passe' | 'fait' | 'futur' }[] = [
  {
    date: 'Début juillet 2026',
    texte:
      'Fin des travaux du groupe de travail réunissant la Délégation au numérique en santé (DNS), la FEIMA et l’association : un export gratuit, sous 30 jours et documenté, puis un format interopérable.',
    temps: 'passe',
  },
  {
    date: '20 juillet 2026',
    texte:
      'Appel de l’association, avec la CSMF, Avenir Spé, Le Bloc, le SML, Jeunes Médecins et le SNJMG : « n’attendons pas 2027 ! »',
    temps: 'passe',
  },
  {
    date: '19 octobre 2026',
    texte: 'Doctolib, MadeForMed, Orisha Care, Semble et VIDAL Group s’engagent publiquement.',
    temps: 'fait',
  },
  {
    date: '12 janvier 2027',
    texte:
      'Règlement européen sur les données (Data Act) : les frais de changement de fournisseur deviennent totalement interdits.',
    temps: 'futur',
  },
  {
    date: 'Février 2027 (prévu)',
    texte: 'Le référentiel de portabilité devient opposable à tous les éditeurs.',
    temps: 'futur',
  },
]

function dateLongue(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  })
}

function initiales(nom: string): string {
  return nom.replace(/[^A-Za-zÀ-ÿ ]/g, '').trim().slice(0, 2).toUpperCase()
}

/** Cadre blanc commun aux logos (certains logos ont un fond blanc opaque). */
function Logo({ src, nom, className }: { src: string | null; nom: string; className: string }) {
  return (
    <div className={`${className} rounded-button bg-[#ffffff] ring-1 ring-gray-100 flex items-center justify-center p-2 shrink-0`}>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={nom} className="max-h-full max-w-full object-contain" loading="lazy" />
      ) : (
        <span className="text-lg font-bold text-accent-blue" aria-hidden="true">
          {initiales(nom)}
        </span>
      )}
    </div>
  )
}

function Titre({ children, sousTitre }: { children: React.ReactNode; sousTitre?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-navy">{children}</h2>
      {sousTitre && <p className="mt-1 text-sm text-gray-500">{sousTitre}</p>}
    </div>
  )
}

export default async function PortabilitePage() {
  const { editeurs, logiciels } = await getDonneesPortabilite(
    EDITEURS_ENGAGES.map((e) => e.slug),
    EDITEURS_ENGAGES.flatMap((e) => e.logiciels.flatMap((l) => (l.slug ? [l.slug] : []))),
  )

  const cartesLogiciels = EDITEURS_ENGAGES.flatMap((e) =>
    e.logiciels.map((l) => {
      const fiche = l.slug ? logiciels.get(l.slug) : undefined
      return {
        cle: `${e.slug}-${l.slug ?? l.nom}`,
        nom: fiche?.nom ?? l.nom,
        editeur: e.nom,
        logo: fiche?.logo_url ?? null,
        href: fiche?.href ?? null,
      }
    }),
  )

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-light">
        {/* En-tête */}
        <section className="bg-hero-gradient pb-12">
          <div className="max-w-7xl mx-auto px-6 pt-4 pb-0 min-[1150px]:pl-[200px]">
            <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Portabilité des données' }]} variant="light" />
          </div>
          <div className="max-w-4xl mx-auto px-6 text-center mt-8">
            <p className="inline-flex rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white mb-5">
              19 octobre 2026
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
              Portabilité des données : cinq éditeurs répondent à notre appel
            </h1>
            <p className="text-white/85 text-base md:text-lg">
              Le 20 juillet, l’association 100 000 Médecins et six syndicats de médecins appelaient les éditeurs de
              logiciels médicaux à remettre ses données à tout médecin qui le demande, sans attendre 2027. Doctolib,
              MadeForMed, Orisha Care, Semble et VIDAL Group ont confirmé publiquement qu’ils appliquent dès maintenant
              les trois engagements issus du groupe de travail piloté par la Délégation au numérique en santé.
            </p>
            <p className="text-white font-semibold mt-4">
              Merci à eux. Nous comptons sur les autres éditeurs pour les rejoindre.
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-14">
          {/* Éditeurs */}
          <section aria-labelledby="editeurs">
            <Titre sousTitre="Liste tenue à jour par l’association au fil des engagements.">
              <span id="editeurs">Les éditeurs engagés</span>
            </Titre>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {EDITEURS_ENGAGES.map((e) => {
                const base = editeurs.get(e.slug)
                return (
                  <li key={e.slug}>
                    <Link href={`/editeur/${e.slug}`} className="block h-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40">
                      <Card padding="sm" hoverable className="h-full flex flex-col items-center text-center">
                        <Logo src={e.logo ?? base?.logo_url ?? null} nom={e.nom} className="w-full h-20" />
                        <p className="mt-4 font-semibold text-navy leading-tight">{e.nom}</p>
                        <p className="mt-1 text-xs text-gray-500">Engagé le {dateLongue(e.dateEngagement)}</p>
                      </Card>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Engagements */}
          <section aria-labelledby="engagements">
            <Titre sousTitre="Pour tout médecin client qui en fait la demande.">
              <span id="engagements">Leurs trois engagements</span>
            </Titre>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ENGAGEMENTS.map(({ icon: Icon, titre, texte }) => (
                <li key={titre}>
                  <Card padding="sm" className="h-full border-t-4 border-accent-yellow">
                    <div className="w-11 h-11 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-lg font-bold text-navy">{titre}</p>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{texte}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          {/* Logiciels */}
          <section aria-labelledby="logiciels">
            <Titre sousTitre="Vous utilisez l’un de ces logiciels ? Vous pouvez demander dès maintenant l’export de vos données à votre éditeur.">
              <span id="logiciels">Les logiciels concernés</span>
            </Titre>
            <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {cartesLogiciels.map((l) => {
                const contenu = (
                  <>
                    <Logo src={l.logo} nom={l.nom} className="w-full h-16" />
                    <p className="mt-3 font-semibold text-navy leading-tight">{l.nom}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{l.editeur}</p>
                    {l.href ? (
                      <span className="mt-auto pt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-blue">
                        Voir la fiche <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="mt-auto pt-2 text-xs text-gray-400">Pas encore de fiche sur le site</span>
                    )}
                  </>
                )
                const classes = 'h-full flex flex-col items-center text-center p-4 sm:p-5'
                return (
                  <li key={l.cle}>
                    {l.href ? (
                      <Link href={l.href} className="block h-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40">
                        <Card padding="none" hoverable className={classes}>
                          {contenu}
                        </Card>
                      </Link>
                    ) : (
                      <Card padding="none" className={classes}>
                        {contenu}
                      </Card>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Contexte */}
          <section aria-labelledby="contexte" className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div>
              <Titre>
                <span id="contexte">Pourquoi c’est important</span>
              </Titre>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Un médecin qui hésite à changer de logiciel par crainte de perdre l’historique de ses patients reste
                  avec un outil qui ne lui convient plus. Et quand la migration a lieu, un export incomplet ou mal
                  documenté se paie en consultations sans antécédents ni comptes-rendus, et en jours de ressaisie pris
                  sur le temps médical.
                </p>
                <p>
                  Le référentiel de portabilité élaboré par le groupe de travail ne s’imposera à tous les éditeurs
                  qu’en 2027. Les éditeurs engagés appliquent dès maintenant ce qui avait été décidé ensemble.
                </p>
              </div>
            </div>
            <ol className="relative ml-2 border-l-2 border-navy/15 space-y-6 self-start">
              {ETAPES.map((etape) => (
                <li key={etape.date} className="relative pl-6">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-surface-light ${
                      etape.temps === 'fait'
                        ? 'bg-rating-green'
                        : etape.temps === 'passe'
                          ? 'bg-navy'
                          : 'bg-surface-light border-2 border-navy/40'
                    }`}
                  />
                  <p className={`text-sm font-semibold ${etape.temps === 'fait' ? 'text-green-700' : 'text-navy'}`}>
                    {etape.date}
                  </p>
                  <p className={`mt-0.5 text-sm leading-relaxed ${etape.temps === 'futur' ? 'text-gray-500' : 'text-gray-700'}`}>
                    {etape.texte}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Communiqués */}
          <section aria-labelledby="communiques">
            <Titre>
              <span id="communiques">Les communiqués</span>
            </Titre>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCUMENTS_PORTABILITE.map((d) => (
                <li key={d.url}>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40"
                  >
                    <Card padding="sm" hoverable className="h-full flex items-start gap-4">
                      <div className="w-11 h-11 rounded-button bg-accent-orange/10 text-accent-orange flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-navy leading-snug">{d.titre}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {d.auteur}, {dateLongue(d.date)}
                        </p>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-blue">
                          Lire le PDF <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Card>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Appel aux autres éditeurs */}
          <section className="bg-navy text-white rounded-card p-6 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold">Vous êtes éditeur de logiciel médical ?</h2>
              <p className="mt-2 text-white/80 leading-relaxed">
                Confirmez publiquement les mêmes engagements : export gratuit, remis sous 30 jours, complet et
                documenté. Nous ajouterons votre nom et vos logiciels à cette page.
              </p>
            </div>
            <Button
              href={`mailto:${CONTACT_EDITEURS}?subject=${encodeURIComponent('Engagement portabilité des données')}`}
              variant="cta"
              size="md"
              leftIcon={<Mail className="w-4 h-4" />}
              className="shrink-0 self-start md:self-auto"
            >
              Nous écrire
            </Button>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
