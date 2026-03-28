import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getPageBySlug } from '@/lib/db/pages'

export const metadata: Metadata = {
  title: 'RGPD / Cookies — 100000médecins.org',
  description: 'Politique de confidentialité et gestion des cookies du site 100000medecins.org',
}

export default async function RGPDPage() {
  let dbPage = null
  try {
    dbPage = await getPageBySlug('rgpd')
  } catch {
    // Page non encore en DB, on affiche le contenu codé en dur
  }

  if (dbPage) {
    return (
      <>
        <Navbar />
        <main className="pt-[72px]">
          <article className="max-w-3xl mx-auto px-6 py-16">
            <h1 className="text-2xl font-bold text-navy mb-8">{dbPage.titre}</h1>
            <div
              className="space-y-8 text-sm text-gray-700 leading-relaxed prose-custom"
              dangerouslySetInnerHTML={{ __html: dbPage.contenu || '' }}
            />
          </article>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-navy mb-8">
            RGPD / Cookies
          </h1>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
            <div className="space-y-4">
              <p>
                Le site internet 100000medecins.org accorde une grande importance à la protection et au respect de la vie privée de ses utilisateurs. La présente politique vise à vous informer de la manière dont vos données personnelles sont recueillies et traitées sur le site.
              </p>
              <p>
                En naviguant sur le site 100000medecins.org et en utilisant nos services, vous acceptez les pratiques décrites dans la présente politique de confidentialité. Si vous n&apos;acceptez pas les termes de cette politique, nous vous invitons à ne pas utiliser notre site.
              </p>
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD) – Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 – nous nous engageons à garantir un niveau élevé de protection de vos données personnelles.
              </p>
            </div>

            {/* ARTICLE 1 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 1 – DÉFINITIONS</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>« Donnée personnelle » : toute information relative à une personne physique identifiée ou identifiable, directement ou indirectement.</li>
                <li>« Traitement de données » : toute opération ou tout ensemble d&apos;opérations effectuées ou non à l&apos;aide de procédés automatisés, appliqués à des données personnelles.</li>
                <li>« Utilisateur » : toute personne physique naviguant sur le site 100000medecins.org.</li>
                <li>« Responsable du traitement » : personne physique ou morale qui détermine les finalités et les moyens du traitement des données personnelles.</li>
                <li>« Cookie » : petit fichier texte stocké sur le terminal de l&apos;utilisateur lors de la visite d&apos;un site web.</li>
              </ul>
            </section>

            {/* ARTICLE 2 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 2 – OBJET DE L&apos;AVIS</h2>
              <p>
                Le présent avis a pour objet de définir les conditions dans lesquelles le site 100000medecins.org collecte et traite les données personnelles de ses utilisateurs, dans le respect de leur vie privée et conformément à la législation en vigueur.
              </p>
            </section>

            {/* ARTICLE 3 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 3 – IDENTITÉ DU SITE</h2>
              <p>Le site 100000medecins.org est édité par l&apos;association 100 000 Médecins.</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Siège social : [à compléter]</li>
                <li>Directeur de la publication : [à compléter]</li>
                <li>Hébergeur : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA</li>
              </ul>
            </section>

            {/* ARTICLE 4 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 4 – DONNÉES COLLECTÉES</h2>
              <p>Dans le cadre de l&apos;utilisation du site 100000medecins.org, les catégories de données personnelles suivantes peuvent être collectées :</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Données d&apos;identification</strong> : nom, prénom, adresse email professionnelle, numéro RPPS (Répertoire Partagé des Professionnels de Santé)</li>
                <li><strong>Données de connexion</strong> : identifiants de connexion, logs de connexion, adresse IP, type et version du navigateur, système d&apos;exploitation</li>
                <li><strong>Données de navigation</strong> : pages visitées, durée des visites, parcours de navigation, données de cookies</li>
                <li><strong>Données professionnelles</strong> : spécialité médicale, mode d&apos;exercice, département d&apos;exercice</li>
                <li><strong>Données d&apos;évaluation</strong> : notes, avis, commentaires déposés sur les solutions logicielles référencées sur le site</li>
              </ul>
              <p className="mt-2">
                Ces données sont collectées directement auprès de l&apos;utilisateur lors de la création de son compte, de la navigation sur le site et du dépôt d&apos;évaluations.
              </p>
            </section>

            {/* ARTICLE 5 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 5 – RESPONSABLE DU TRAITEMENT</h2>
              <p>
                Le responsable du traitement des données personnelles collectées sur le site est l&apos;association 100 000 Médecins, joignable à l&apos;adresse email suivante : contact@100000medecins.org
              </p>
              <p className="mt-2">
                Conformément au RGPD, le responsable du traitement s&apos;engage à protéger les données personnelles collectées, à ne pas les transmettre sans que l&apos;utilisateur en soit informé et à respecter les finalités pour lesquelles ces données ont été collectées.
              </p>
            </section>

            {/* ARTICLE 6 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 6 – FINALITÉ DES DONNÉES</h2>
              <p>Les données personnelles collectées sur le site 100000medecins.org sont utilisées aux fins suivantes :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Création et gestion du compte utilisateur</li>
                <li>Authentification via Pro Santé Connect (service d&apos;identification de l&apos;Agence du Numérique en Santé)</li>
                <li>Publication et gestion des évaluations de solutions logicielles de santé</li>
                <li>Amélioration de l&apos;expérience utilisateur et du fonctionnement du site</li>
                <li>Réalisation de statistiques anonymisées d&apos;utilisation du site</li>
                <li>Communication avec les utilisateurs (notifications relatives à leur compte)</li>
                <li>Respect des obligations légales et réglementaires</li>
              </ul>
              <p className="mt-3">Le traitement des données est fondé sur :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Le consentement de l&apos;utilisateur (article 6.1.a du RGPD) pour le dépôt d&apos;évaluations</li>
                <li>L&apos;exécution d&apos;un contrat (article 6.1.b du RGPD) pour la gestion du compte</li>
                <li>L&apos;intérêt légitime (article 6.1.f du RGPD) pour l&apos;amélioration du site et les statistiques</li>
              </ul>
            </section>

            {/* ARTICLE 7 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 7 – PARTAGE ET CONFIDENTIALITÉ DES DONNÉES</h2>
              <p>
                Les données personnelles collectées sur le site ne sont jamais vendues, échangées ou louées à des tiers à des fins commerciales.
              </p>
              <p className="mt-2">Elles peuvent être partagées avec :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Les sous-traitants techniques nécessaires au fonctionnement du site : Supabase (base de données et authentification), Vercel (hébergement)</li>
                <li>L&apos;Agence du Numérique en Santé dans le cadre de l&apos;authentification via Pro Santé Connect</li>
                <li>Les autorités compétentes en cas d&apos;obligation légale</li>
              </ul>
              <p className="mt-2">
                Tous les sous-traitants sont soumis à des obligations contractuelles strictes en matière de confidentialité et de sécurité des données, conformément à l&apos;article 28 du RGPD.
              </p>
              <p className="mt-2">
                Les avis et évaluations publiés par les utilisateurs sont visibles publiquement sur le site. Le nom ou prénom de l&apos;utilisateur peut apparaître associé à son évaluation, selon les paramètres choisis par l&apos;utilisateur.
              </p>
            </section>

            {/* ARTICLE 8 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 8 – DURÉE DE CONSERVATION DES DONNÉES</h2>
              <p>Les données personnelles sont conservées pour la durée strictement nécessaire aux finalités pour lesquelles elles sont collectées :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Données de compte utilisateur : pendant toute la durée de l&apos;inscription, puis 3 ans après la dernière activité</li>
                <li>Données de navigation et logs : 13 mois maximum</li>
                <li>Évaluations et avis : pendant toute la durée de publication sur le site, et 1 an après suppression du compte</li>
                <li>Cookies : voir les durées spécifiques à l&apos;article 10</li>
              </ul>
              <p className="mt-2">
                Au-delà de ces durées, les données sont supprimées ou anonymisées de manière irréversible.
              </p>
            </section>

            {/* ARTICLE 9 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 9 – EXERCICE DES DROITS ET MODALITÉS</h2>
              <p>Conformément aux articles 15 à 22 du RGPD, tout utilisateur dispose des droits suivants sur ses données personnelles :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Droit d&apos;accès</strong> (art. 15) : obtenir la confirmation que des données vous concernant sont traitées et en recevoir une copie</li>
                <li><strong>Droit de rectification</strong> (art. 16) : demander la correction de données inexactes ou incomplètes</li>
                <li><strong>Droit à l&apos;effacement</strong> (art. 17) : demander la suppression de vos données dans les cas prévus par le RGPD</li>
                <li><strong>Droit à la limitation du traitement</strong> (art. 18) : demander la limitation du traitement de vos données</li>
                <li><strong>Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format structuré et couramment utilisé</li>
                <li><strong>Droit d&apos;opposition</strong> (art. 21) : vous opposer au traitement de vos données pour des motifs légitimes</li>
              </ul>
              <p className="mt-3">
                Pour exercer l&apos;un de ces droits, vous pouvez nous contacter à l&apos;adresse : <a href="mailto:contact@100000medecins.org" className="text-accent-blue underline">contact@100000medecins.org</a>
              </p>
              <p className="mt-2">
                Nous nous engageons à répondre à votre demande dans un délai de 30 jours. En cas de doute sur votre identité, nous pourrons vous demander de fournir un justificatif d&apos;identité.
              </p>
              <p className="mt-2">
                Vous disposez également du droit d&apos;introduire une réclamation auprès de la Commission Nationale de l&apos;Informatique et des Libertés (CNIL) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-accent-blue underline">www.cnil.fr</a>
              </p>
            </section>

            {/* ARTICLE 10 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 10 – GESTION DES COOKIES ET TECHNOLOGIES DE SUIVI</h2>

              <h3 className="font-semibold text-navy mt-4 mb-2">Qu&apos;est-ce qu&apos;un cookie ?</h3>
              <p>
                Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de votre visite sur un site web. Il permet au site de mémoriser des informations relatives à votre navigation.
              </p>

              <h3 className="font-semibold text-navy mt-4 mb-2">Types de cookies utilisés :</h3>
              <ol className="list-decimal pl-5 space-y-2 mt-2">
                <li>
                  <strong>Cookies strictement nécessaires</strong> : indispensables au fonctionnement du site (authentification, sécurité, préférences de session). Ces cookies ne nécessitent pas votre consentement.
                </li>
                <li>
                  <strong>Cookies analytiques / de mesure d&apos;audience</strong> : permettent de mesurer la fréquentation du site et d&apos;analyser les parcours de navigation afin d&apos;améliorer le fonctionnement et le contenu du site.
                </li>
                <li>
                  <strong>Cookies tiers</strong> : le site 100000medecins.org n&apos;utilise pas de cookies publicitaires ni de cookies de réseaux sociaux.
                </li>
              </ol>

              <h3 className="font-semibold text-navy mt-4 mb-2">Gestion des cookies :</h3>
              <p>
                Lors de votre première visite, un bandeau d&apos;information vous permet d&apos;accepter ou de refuser les cookies non essentiels. Vous pouvez à tout moment modifier vos préférences :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Via les paramètres de votre navigateur</li>
                <li>En supprimant les cookies stockés sur votre terminal</li>
              </ul>
              <p className="mt-2">
                La durée de vie des cookies est de 13 mois maximum, conformément aux recommandations de la CNIL.
              </p>
            </section>

            {/* ARTICLE 11 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 11 – MÉDIAS SOCIAUX</h2>
              <p>
                Le site 100000medecins.org peut contenir des liens vers des réseaux sociaux ou des plateformes tierces. L&apos;activation de ces liens peut permettre à des tiers de collecter des données vous concernant. Nous vous invitons à consulter les politiques de confidentialité de ces plateformes.
              </p>
              <p className="mt-2">
                Le site n&apos;intègre pas de modules sociaux (boutons « J&apos;aime », « Partager ») déposant des cookies sans votre consentement.
              </p>
            </section>

            {/* ARTICLE 12 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 12 – SÉCURITÉ</h2>
              <p>
                Le site 100000medecins.org met en œuvre des mesures techniques et organisationnelles appropriées pour garantir la sécurité et la confidentialité de vos données personnelles :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Chiffrement des communications via HTTPS/TLS</li>
                <li>Chiffrement des mots de passe</li>
                <li>Contrôle d&apos;accès aux données (Row Level Security via Supabase)</li>
                <li>Sauvegardes régulières des données</li>
                <li>Authentification renforcée via Pro Santé Connect pour les professionnels de santé</li>
              </ul>
              <p className="mt-2">
                Malgré ces mesures, aucun système n&apos;est totalement infaillible. En cas de violation de données susceptible d&apos;engendrer un risque élevé pour vos droits et libertés, nous vous en informerons dans les meilleurs délais, conformément à l&apos;article 34 du RGPD.
              </p>
            </section>

            {/* ARTICLE 13 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 13 – TRANSFERT DE DONNÉES PERSONNELLES HORS UE/EEE</h2>
              <p>
                Certains sous-traitants techniques (Vercel, Supabase) peuvent stocker ou traiter des données sur des serveurs situés en dehors de l&apos;Union européenne ou de l&apos;Espace économique européen.
              </p>
              <p className="mt-2">Dans ce cas, nous veillons à ce que des garanties appropriées soient mises en place, telles que :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Des clauses contractuelles types adoptées par la Commission européenne</li>
                <li>Le respect du Data Privacy Framework (DPF) UE-États-Unis, le cas échéant</li>
              </ul>
            </section>

            {/* ARTICLE 14 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 14 – PROTECTION DES DONNÉES PERSONNELLES DES MINEURS</h2>
              <p>
                Le site 100000medecins.org est destiné aux professionnels de santé. Il n&apos;est pas conçu pour collecter des données de personnes mineures. Si nous constatons que des données personnelles d&apos;un mineur ont été collectées par erreur, nous les supprimerons dans les meilleurs délais.
              </p>
            </section>

            {/* ARTICLE 15 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 15 – MODIFICATION DE LA POLITIQUE DE CONFIDENTIALITÉ</h2>
              <p>
                La présente politique de confidentialité peut être modifiée à tout moment afin de s&apos;adapter aux évolutions du site, de la législation ou de la jurisprudence.
              </p>
              <p className="mt-2">
                La date de la dernière mise à jour est indiquée en bas de cette page. Nous vous invitons à consulter régulièrement cette page pour prendre connaissance des éventuelles modifications.
              </p>
              <p className="mt-2 font-semibold">Dernière mise à jour : 20 mars 2026</p>
            </section>

            {/* ARTICLE 16 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 16 – LOI APPLICABLE</h2>
              <p>
                La présente politique de confidentialité est régie par la loi française. Tout litige relatif à l&apos;interprétation ou à l&apos;exécution de la présente politique sera soumis aux tribunaux compétents.
              </p>
            </section>

            {/* ARTICLE 17 */}
            <section>
              <h2 className="text-base font-bold text-navy mb-3">ARTICLE 17 – ACCEPTATION</h2>
              <p>
                En utilisant le site 100000medecins.org, l&apos;utilisateur reconnaît avoir pris connaissance de la présente politique de confidentialité et en accepte les conditions.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
