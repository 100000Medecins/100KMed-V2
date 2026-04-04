import Button from "@/components/ui/Button";

export default function ContributeCTA() {
  return (
    <section className="bg-cta-gradient">
      <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-extrabold text-navy mb-3">
          Contribuez et notez vos logiciels
        </h2>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-gray-500 mb-8">
          Partagez votre retour d&apos;expérience en notant vos outils numériques !
        </p>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Vous répondrez au triple objectif :
        </p>

        <ul className="space-y-2.5 mb-10">
          <li className="flex items-start gap-2.5 text-sm text-gray-600">
            <span className="text-accent-orange mt-0.5">›</span>
            Aider vos collègues à faire les bons choix pour leurs outils numériques
          </li>
          <li className="flex items-start gap-2.5 text-sm text-gray-600">
            <span className="text-accent-orange mt-0.5">›</span>
            Promouvoir des logiciels estimés bien conçus, respectueux des bonnes pratiques et pérennes
          </li>
          <li className="flex items-start gap-2.5 text-sm text-gray-600">
            <span className="text-accent-orange mt-0.5">›</span>
            Orienter les éditeurs de logiciels vers les objectifs que vous souhaitez atteindre
          </li>
        </ul>

        <Button variant="primary" showArrow href="/solution/noter">
          Évaluer un logiciel
        </Button>
      </div>
    </section>
  );
}
