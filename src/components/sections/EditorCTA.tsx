import Link from "next/link";
import Button from "@/components/ui/Button";

export default function EditorCTA() {
  return (
    <section className="bg-cta-gradient pt-10 pb-6 md:pt-14 md:pb-8">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
          Vous êtes éditeur ?
        </h2>
        <p className="text-white/75 text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Référencez votre logiciel et faites-le découvrir à des milliers
          de professionnels de santé à la recherche de la meilleure solution.
        </p>
        <Link href="/contact">
          <Button variant="primary" showArrow>
            Nous contacter
          </Button>
        </Link>
      </div>
    </section>
  );
}
