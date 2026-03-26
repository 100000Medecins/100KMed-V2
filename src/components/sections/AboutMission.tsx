import { missionItems } from "@/lib/data";
import MissionCard from "@/components/ui/MissionCard";

export default function AboutMission() {
  return (
    <section className="py-20 md:py-28" id="about">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-navy leading-snug">
            <span className="text-accent-blue">10000médecins.org</span>,
            <br className="hidden md:block" />
            pour vous accompagner dans l&apos;ère numérique.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {missionItems.map((item) => (
            <MissionCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
