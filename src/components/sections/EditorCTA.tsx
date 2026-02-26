import Button from "@/components/ui/Button";

export default function EditorCTA() {
  return (
    <section className="bg-cta-gradient py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-navy mb-4">
          Vous êtes éditeur ?
        </h2>
        <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Référencez votre logiciel et faites-le découvrir à des milliers
          de professionnels de santé à la recherche de la meilleure solution.
        </p>
        <Button variant="primary" showArrow>
          Demander une démo
        </Button>
      </div>
    </section>
  );
}
