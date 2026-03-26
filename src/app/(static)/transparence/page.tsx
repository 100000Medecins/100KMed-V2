import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Charte de transparence — 100000médecins.org',
  description: 'Charte de transparence de 100000medecins.org',
}

export default function TransparencePage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold text-navy mb-8">
            Charte de transparence
          </h1>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">
            <div>
              <p className="font-semibold">Charte de transparence de 100000medecins.org</p>
              <p className="mt-2 italic">Sans transparence, les notes ne valent rien.</p>
            </div>

            <div className="space-y-4">
              <p>
                Dès la création de l&apos;association « 100 000 Médecins », ses fondateurs se sont accordés sur le fait que la transparence la plus totale était indispensable pour garantir l&apos;intérêt même de ce que nous souhaitons proposer à la Profession.
              </p>
              <p>
                Cette transparence est ainsi devenue la clé de voûte de toutes nos actions, et nous avons à cœur de poursuivre dans cette voie en répondant à toutes les interrogations qui pourraient survenir et mettre en doute l&apos;intégrité de notre démarche.
              </p>
              <p>
                Comprenons-nous bien : sans transparence, les notes ne valent rien.
              </p>
              <p>
                Vous trouverez ici tous les éléments que nous pouvons vous partager afin d&apos;éviter de voir le travail bénévole et désintéressé des animateurs du site ruiné par la rumeur, la jalousie, ou des intérêts divergents.
              </p>
              <p>Notre charte s&apos;articule ainsi sur 5 axes :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Vie de l&apos;association</li>
                <li>Déclarations publiques d&apos;intérêts des représentants</li>
                <li>Modèle économique et rapport financier</li>
                <li>Grilles d&apos;évaluations</li>
                <li>Édition du site internet</li>
              </ul>
            </div>

            {/* 1 / Vie de l'association */}
            <section>
              <h2 className="text-lg font-bold text-navy mb-3">1 / Vie de l&apos;association :</h2>
              <p>Vous trouverez dans cette section nos statuts et le dernier PV d&apos;AG notable.</p>

              <h3 className="font-semibold text-navy mt-4 mb-2">Préambule</h3>
              <p>
                En raison de l&apos;accélération des changements dans l&apos;exercice des différentes professions de santé et en particulier de la médecine libérale, notamment liée à :
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>l&apos;introduction de logiciels métier et d&apos;outils numériques de plus en plus performants et complexes,</li>
                <li>la nécessité de créer et de maintenir un réseau de correspondants via des messageries sécurisées, plateformes sociales ou applications,</li>
                <li>l&apos;essor de la télémédecine,</li>
                <li>Les représentations syndicales nationales des médecins libéraux français, en dehors de toute considération de représentativité ou de statut conventionnel, ont décidé de se mobiliser et de créer une association régie par la loi du 1er juillet 1901, dans un souci d&apos;efficience, de confort d&apos;exercice, et d&apos;amélioration de la qualité des soins prodigués à la population.</li>
              </ul>

              <h3 className="font-semibold text-navy mt-4 mb-2">Principaux objets de l&apos;Association</h3>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Constituer un organe de réflexion et de communication commun sur le thème de la santé numérique et de ses bonnes pratiques</li>
                <li>Créer, développer et gérer un système de notation des outils numériques disponibles pour les médecins</li>
                <li>Informer sur les outils numériques existants</li>
                <li>Favoriser l&apos;émergence de toute autre initiative pouvant aller dans le sens de la bonne utilisation d&apos;outils numériques par les professionnels de santé</li>
              </ul>

              <div className="mt-4 flex flex-wrap gap-3">
                <span className="text-xs text-gray-500 italic">Bouton « voir les statuts »</span>
                <span className="text-xs text-gray-500 italic">Bouton « dernier PV d&apos;AG »</span>
              </div>
            </section>

            {/* 2 / Déclarations publiques d'intérêt */}
            <section>
              <h2 className="text-lg font-bold text-navy mb-3">2 / Déclarations publiques d&apos;intérêt des représentants</h2>
              <p>
                Vous trouverez dans cette rubrique les déclarations des représentants au sein du Bureau de l&apos;Association par structure, à date.
              </p>
              <p className="mt-2 font-semibold">Au 15 avril 2023 :</p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">Structure</th>
                      <th className="text-left px-4 py-2 border-b border-gray-200 font-semibold">Représentant</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">CSMF</td>
                      <td className="px-4 py-2">Jean-Michel Lemettre</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">SML</td>
                      <td className="px-4 py-2">Sophie Bauer</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">AvenirSpé</td>
                      <td className="px-4 py-2">Marc Villaceque</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">SML</td>
                      <td className="px-4 py-2">Sophie Bauer</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">UFML</td>
                      <td className="px-4 py-2">Jérôme Marty</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">Le Bloc</td>
                      <td className="px-4 py-2">Xavier Beauchamps</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">FMF</td>
                      <td className="px-4 py-2">Corinne Le Sauder</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">MG-France</td>
                      <td className="px-4 py-2">Isabelle Domenech-Bonet</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-2">Jeunes Médecins</td>
                      <td className="px-4 py-2">David « Dr.Azerty » Azérad</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">SNJMG</td>
                      <td className="px-4 py-2">Sayaka Oguchi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3 / Modèle économique et rapport financier */}
            <section>
              <h2 className="text-lg font-bold text-navy mb-3">3 / Modèle économique et rapport financier</h2>
              <p>Au 1er mars 2023, les revenus de l&apos;association proviennent uniquement :</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Des cotisations de ses membres (500€ annuels par structure)</li>
                <li>D&apos;une campagne de crowdfunding effectuée en 2020</li>
              </ul>
              <p className="mt-3">
                Le relevé montre la somme de 5500€ sur le compte au 1er mars 2023.
              </p>
              <p className="mt-2">Les dépenses de l&apos;association sont quasiment uniquement représentées par :</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>les frais d&apos;hébergement du site ;</li>
                <li>l&apos;achat ou l&apos;abonnement à des logiciels divers ;</li>
                <li>les frais bancaires.</li>
              </ul>
              <p className="mt-3">
                Après avoir échoué à obtenir un financement quelconque provenant des URPS, du CNOM, de la CNAM, de l&apos;ANS ou du Ministère, ce malgré leur soutien en paroles sur l&apos;intérêt évident de nos actions pour l&apos;ensemble de la profession, nous avons opté pour un autofinancement jusqu&apos;à la phase de lancement.
              </p>
              <p className="mt-2">
                Si vous êtes vous-même élu au sein ou salarié de ces instances ou y avez des contacts privilégiés, nous vous laissons appuyer cette demande, ou favoriser une reprise de contact.
              </p>
              <p className="mt-2">
                Nous ne nous interdisons pas dans une phase de consolidation de faire participer les éditeurs de logiciels médicaux, selon l&apos;avancée des discussions avec les acteurs de la filière e-santé française.
              </p>
            </section>

            {/* 4 / Grilles d'évaluations */}
            <section>
              <h2 className="text-lg font-bold text-navy mb-3">4 / Transparence des évaluations</h2>
              <p>
                L&apos;évaluation des logiciels métier en 2020, a réperié plus de 300 confrères ont répondu.
              </p>
              <p className="mt-2">
                Grâce aux retours, ces critères ont ensuite évolué avec un second groupe de travail, restreint aux médecins impliqués dans l&apos;édition du site internet 100000medecins.org, de 2021 à 2023.
              </p>
              <p className="mt-2">
                Pour les logiciels métier : 5 critères majeurs ont été retenus, eux-mêmes composés de 47 critères mineurs au total. Si renseigner ces derniers est optionnel lors de l&apos;évaluation d&apos;un logiciel métier, en cas de discordance entre leur moyenne et le critère majeur auxquels ils sont rattachés, une nouvelle note est proposée à l&apos;utilisateur – proposition qu&apos;il peut refuser pour conserver une note de &quot;critère majeur&quot; différente.
              </p>
              <p className="mt-2">
                Ces 5 critères majeurs sont complétés par une note de « recommandabilité » du logiciel, nommée « NPS » pour Net Promoter Score. Ce dernier est un outil simple mais puissant pour mesurer la satisfaction client avec la seule question &quot;recommanderiez-vous ce produit ?&quot;, de 0 à 10. Largement utilisé dans le milieu du marketing, il permet de classer les utilisateurs en trois catégories selon leur degré d&apos;enthousiasme : promoteurs (9 ou 10), passifs (7 ou 8) ou détracteurs (0 à 6). Le score NPS correspond à la différence entre le pourcentage de promoteurs et de détracteurs : un score supérieur à 20 est considéré comme satisfaisant, inférieur à 0 comme mauvais.
              </p>
              <p className="mt-2">
                Toute décision de modification des critères, ajout, suppression, pondération, seront datés et communiqués sur cette page.
              </p>
            </section>

            {/* 5 / Édition du site internet */}
            <section>
              <h2 className="text-lg font-bold text-navy mb-3">5 / Édition du site internet</h2>
              <p>
                Au 1er mars 2023, le site internet est hébergé en France par Gandi SAS, Société par Actions Simplifiée au capital de 630000 € ayant son siège social au 63-65 boulevard Masséna 75013 Paris (SIREN 423 093 459 RCS PARIS).
              </p>
              <p className="mt-2">
                Il a été conçu avec les frameworks VueJS, GraphQL et Firebase, et grâce au soutien de Twitter & Stack Overflow.
              </p>
              <p className="mt-2">
                La base de donnée est administrée par l&apos;association « 100 000 Médecins », et évidemment, aucune personne ou société tierce n&apos;y a eu, a ou aura accès.
              </p>
              <p className="mt-2">
                Enfin, le code source du site est disponible sur simple demande, répondant ainsi à l&apos;esprit de la communauté open-source.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
