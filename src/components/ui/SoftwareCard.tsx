import StarRating from "./StarRating";
import RatingBadge from "./RatingBadge";
import type { SoftwareItem } from "@/types";

interface SoftwareCardProps {
  software: SoftwareItem;
}

export default function SoftwareCard({ software }: SoftwareCardProps) {
  return (
    <div className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-all duration-300 p-6 flex flex-col items-center text-center group cursor-pointer">
      <div className="mb-4">
        <span className="text-xs font-semibold text-gray-800">{software.name}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <RatingBadge rating={software.rating} />
        <StarRating rating={software.rating} />
        <span className="text-xs text-gray-400">({software.reviewCount})</span>
      </div>

      <div
        className="w-full h-20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
        style={{ backgroundColor: `${software.color}15` }}
      >
        <span
          className="text-2xl font-bold"
          style={{ color: software.color }}
        >
          {software.initials}
        </span>
      </div>
    </div>
  );
}
