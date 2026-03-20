import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — 100000médecins.org",
  description: "Conditions générales d'utilisation du site 100000medecins.org",
}

export default function CGUPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-navy mb-8">
            Conditions générales d&apos;utilisation du site 100000medecins.org
          </h1>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
            {/* Préambule */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Préambule</h2>
              <p>
                Le site internet 100000medecins.org (ci-après « le Site ») est une plateforme indépendante dédiée à l&apos;évaluation, à la comparaison et à la présentation de solutions logicielles destinées aux professionnels de santé. Il est édité par l&apos;association 100 000 Médecins.
              </p>
              <p className="mt-2">
                Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions d&apos;utilisation du Site, ainsi que les droits et obligations des utilisateurs et de l&apos;éditeur.
              </p>
              <p className="mt-2">
                En accédant au Site et en l&apos;utilisant, l&apos;utilisateur reconnaît avoir pris connaissance des présentes CGU et les accepte sans réserve.
              </p>
            </section>

            {/* Article 1 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 1 – Principes</h2>
              <p>
                Le site 100000medecins.org a pour vocation de fournir aux professionnels de santé un espace indépendant et transparent leur permettant de :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Consulter des fiches descriptives et des évaluations de solutions logicielles de santé</li>
                <li>Déposer des avis et évaluations fondés sur leur expérience professionnelle</li>
                <li>Comparer les solutions logicielles entre elles</li>
                <li>Accéder à des contenus éditoriaux (articles, vidéos, analyses)</li>
              </ul>
              <p className="mt-2">
                Le site est indépendant et n&apos;est lié par aucun accord commercial avec les éditeurs de solutions logicielles référencées.
              </p>
            </section>

            {/* Article 2 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 2 – Définition et durée des CGU</h2>
              <p>
                Les présentes CGU s&apos;appliquent à tout utilisateur accédant au Site, qu&apos;il soit inscrit ou non. Elles sont applicables dès leur mise en ligne et pour toute la durée d&apos;utilisation du Site.
              </p>
              <p className="mt-2">
                L&apos;association 100 000 Médecins se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication sur le Site. L&apos;utilisateur est invité à consulter régulièrement cette page.
              </p>
            </section>

            {/* Article 3 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 3 – Accès au site</h2>
              <p>
                Le site est accessible gratuitement à toute personne disposant d&apos;un accès à internet.
              </p>
              <p className="mt-2">
                L&apos;association 100 000 Médecins s&apos;efforce d&apos;assurer la disponibilité du Site 24h/24 et 7j/7, mais ne saurait garantir un accès continu et sans interruption. Le Site peut être temporairement indisponible en raison d&apos;opérations de maintenance, de mises à jour techniques ou de circonstances indépendantes de la volonté de l&apos;association.
              </p>
              <p className="mt-2">
                L&apos;association ne saurait être tenue responsable de tout dommage résultant de l&apos;indisponibilité temporaire du Site.
              </p>
            </section>

            {/* Article 4 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 4 – Inscription et compte utilisateur</h2>
              <p>
                L&apos;accès à certaines fonctionnalités du Site (notamment le dépôt d&apos;évaluations et la gestion du profil utilisateur) nécessite la création d&apos;un compte.
              </p>
              <p className="mt-2">
                L&apos;inscription est réservée aux professionnels de santé. L&apos;authentification s&apos;effectue via Pro Santé Connect, service d&apos;identification de l&apos;Agence du Numérique en Santé, permettant de vérifier le statut de professionnel de santé.
              </p>
              <p className="mt-2">L&apos;utilisateur s&apos;engage à :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Fournir des informations exactes, complètes et à jour</li>
                <li>Ne pas usurper l&apos;identité d&apos;un tiers</li>
                <li>Maintenir la confidentialité de ses identifiants de connexion</li>
                <li>Informer immédiatement l&apos;association de toute utilisation non autorisée de son compte</li>
              </ul>
              <p className="mt-2">
                L&apos;association se réserve le droit de suspendre ou de supprimer tout compte en cas de non-respect des présentes CGU, sans préavis ni indemnité.
              </p>
            </section>

            {/* Article 5 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 5 – Responsabilités</h2>

              <h3 className="font-semibold text-navy mt-4 mb-2">Responsabilité de l&apos;utilisateur :</h3>
              <p>
                L&apos;utilisateur est seul responsable de l&apos;utilisation qu&apos;il fait du Site et des contenus qu&apos;il y publie (évaluations, avis, commentaires).
              </p>
              <p className="mt-2">L&apos;utilisateur s&apos;engage notamment à :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Utiliser le Site conformément à sa destination et aux présentes CGU</li>
                <li>Ne pas publier de contenus illicites, diffamatoires, injurieux, discriminatoires ou portant atteinte aux droits des tiers</li>
                <li>Ne pas publier de contenus à caractère publicitaire ou promotionnel</li>
                <li>Ne pas tenter de porter atteinte au bon fonctionnement technique du Site</li>
                <li>Publier des évaluations sincères, honnêtes et fondées sur son expérience réelle d&apos;utilisation</li>
              </ul>

              <h3 className="font-semibold text-navy mt-4 mb-2">Responsabilité de l&apos;association :</h3>
              <p>
                L&apos;association 100 000 Médecins agit en qualité d&apos;hébergeur des contenus publiés par les utilisateurs au sens de l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique.
              </p>
              <p className="mt-2">À ce titre, l&apos;association ne saurait être tenue responsable :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Des contenus publiés par les utilisateurs</li>
                <li>De l&apos;exactitude, la pertinence ou l&apos;exhaustivité des informations présentes sur le Site</li>
                <li>Des dommages directs ou indirects résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utilisation du Site</li>
              </ul>
              <p className="mt-2">
                L&apos;association se réserve le droit de modérer, modifier ou supprimer tout contenu qui ne respecterait pas les présentes CGU ou la législation en vigueur.
              </p>
            </section>

            {/* Article 6 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 6 – Propriété intellectuelle</h2>
              <p>
                L&apos;ensemble des éléments constituant le Site (structure, design, textes, logos, marques, images, bases de données, code source) est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
              </p>
              <p className="mt-2">
                Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, de ces éléments, par quelque moyen que ce soit, sans l&apos;autorisation préalable et écrite de l&apos;association 100 000 Médecins, est strictement interdite et constitue un acte de contrefaçon sanctionné par le Code de la propriété intellectuelle.
              </p>
              <p className="mt-2">
                Les évaluations et avis publiés par les utilisateurs restent la propriété intellectuelle de leurs auteurs. En publiant un contenu sur le Site, l&apos;utilisateur accorde à l&apos;association une licence non exclusive, gratuite, mondiale et pour la durée de publication, d&apos;utilisation, de reproduction et de diffusion dudit contenu dans le cadre du fonctionnement et de la promotion du Site.
              </p>
            </section>

            {/* Article 7 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 7 – Liens hypertextes</h2>
              <p>
                Le Site peut contenir des liens hypertextes renvoyant vers des sites internet tiers. L&apos;association 100 000 Médecins n&apos;exerce aucun contrôle sur le contenu de ces sites et décline toute responsabilité les concernant, notamment en matière de protection des données personnelles.
              </p>
              <p className="mt-2">
                La création de liens hypertextes vers le Site est autorisée, sous réserve de ne pas porter atteinte à l&apos;image du Site ou de l&apos;association.
              </p>
            </section>

            {/* Article 8 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 8 – Protection des données personnelles</h2>
              <p>
                L&apos;association 100 000 Médecins s&apos;engage à protéger les données personnelles de ses utilisateurs, conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.
              </p>

              <h3 className="font-semibold text-navy mt-4 mb-2">Utilisation des données personnelles</h3>
              <p>Dans le cadre de l&apos;utilisation du Site, les données personnelles suivantes peuvent être collectées et traitées :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Données d&apos;identification (nom, prénom, email professionnel, numéro RPPS)</li>
                <li>Données de connexion (adresse IP, logs de connexion)</li>
                <li>Données professionnelles (spécialité médicale, lieu d&apos;exercice)</li>
                <li>Données d&apos;évaluation (notes, avis, commentaires)</li>
              </ul>
              <p className="mt-2">Ces données sont traitées sur la base :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Du consentement de l&apos;utilisateur</li>
                <li>De l&apos;exécution du contrat (gestion du compte)</li>
                <li>De l&apos;intérêt légitime de l&apos;association (amélioration du site, statistiques)</li>
              </ul>

              <h3 className="font-semibold text-navy mt-4 mb-2">Partage des données personnelles avec des tiers</h3>
              <p>Les données personnelles ne sont jamais vendues, louées ou cédées à des tiers à des fins commerciales. Elles peuvent être communiquées à :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Nos sous-traitants techniques : Supabase (base de données, authentification) et Vercel (hébergement)</li>
                <li>L&apos;Agence du Numérique en Santé (authentification Pro Santé Connect)</li>
                <li>Les autorités judiciaires ou administratives si la loi l&apos;exige</li>
              </ul>

              <h3 className="font-semibold text-navy mt-4 mb-2">Protection des données personnelles des mineurs</h3>
              <p>
                Le Site est exclusivement destiné aux professionnels de santé. Nous ne collectons pas sciemment de données personnelles de mineurs. Si nous prenons connaissance de la collecte de données d&apos;un mineur, nous les supprimerons dans les meilleurs délais.
              </p>

              <h3 className="font-semibold text-navy mt-4 mb-2">Droits en matière de données à caractère personnel</h3>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Droit d&apos;accès, de rectification et d&apos;effacement de vos données</li>
                <li>Droit à la limitation du traitement</li>
                <li>Droit à la portabilité de vos données</li>
                <li>Droit d&apos;opposition</li>
              </ul>
              <p className="mt-2">
                Pour exercer ces droits, contactez-nous à l&apos;adresse : <a href="mailto:contact@100000medecins.org" className="text-accent-blue underline">contact@100000medecins.org</a>
              </p>
              <p className="mt-2">
                Vous pouvez également adresser une réclamation à la CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-accent-blue underline">www.cnil.fr</a>
              </p>

              <h3 className="font-semibold text-navy mt-4 mb-2">Mise à jour de la politique de confidentialité</h3>
              <p>
                La présente section relative à la protection des données peut être mise à jour à tout moment. Pour plus de détails, consultez notre <a href="/rgpd" className="text-accent-blue underline">Politique de confidentialité complète (RGPD / Cookies)</a>.
              </p>
            </section>

            {/* Article 9 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 9 – Cookies</h2>
              <p>
                Le Site utilise des cookies nécessaires à son fonctionnement. Pour plus d&apos;informations sur la gestion des cookies, veuillez consulter notre <a href="/rgpd" className="text-accent-blue underline">Politique de confidentialité (RGPD / Cookies)</a>.
              </p>
            </section>

            {/* Article 10 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">Article 10 – Loi applicable</h2>
              <p>
                Les présentes CGU sont soumises au droit français. Tout litige relatif à l&apos;interprétation ou à l&apos;exécution des présentes CGU sera soumis à la compétence exclusive des tribunaux français.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
