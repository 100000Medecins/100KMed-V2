import { Wrench, Settings } from "lucide-react";
import Button from "@/components/ui/Button";

export default function SoftwareCategories() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 text-center">
        {/* 3D Icon */}
        <div className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-surface-light to-surface-muted shadow-card flex items-center justify-center mb-4">
          <div className="relative">
            <Wrench className="w-10 h-10 text-accent-blue" />
            <Settings className="w-5 h-5 text-accent-orange absolute -bottom-1 -right-2" />
          </div>
        </div>

        {/* Tab */}
        <div className="inline-flex items-center gap-2 bg-surface-light rounded-full px-5 py-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          <span className="text-sm font-semibold text-navy">Logiciels métier</span>
        </div>

        {/* Gradient title */}
        <h2 className="gradient-title text-3xl md:text-4xl lg:text-5xl font-extrabold mb-3">
          Évaluez, échangez, proposez.
        </h2>
        <p className="text-xl md:text-2xl font-bold text-navy mb-10">
          Orientons l&apos;évolution de nos outils.
        </p>

        <Button variant="primary" showArrow>
          Donnez votre avis
        </Button>
      </div>
    </section>
  );
}
