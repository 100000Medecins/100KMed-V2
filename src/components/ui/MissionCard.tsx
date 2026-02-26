import { ArrowRight } from "lucide-react";
import type { MissionItem } from "@/types";

interface MissionCardProps {
  item: MissionItem;
}

export default function MissionCard({ item }: MissionCardProps) {
  return (
    <a href={item.href} className="group block">
      <div
        className="w-full aspect-[4/3] rounded-2xl mb-5 overflow-hidden"
        style={{ backgroundColor: item.color }}
      >
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent group-hover:from-white/30 transition-all duration-300" />
        )}
      </div>

      <h3 className="text-base font-semibold text-navy mb-2 group-hover:text-accent-blue transition-colors">
        {item.title}
      </h3>

      <p className="text-sm text-gray-500 leading-relaxed mb-4">
        {item.description}
      </p>

      <span className="inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded-full group-hover:bg-accent-blue transition-colors duration-300">
        Lire cet article
        <ArrowRight className="w-4 h-4" />
      </span>
    </a>
  );
}
