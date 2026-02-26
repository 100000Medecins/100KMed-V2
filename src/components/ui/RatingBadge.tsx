interface RatingBadgeProps {
  rating: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
};

export default function RatingBadge({ rating, size = "md" }: RatingBadgeProps) {
  return (
    <span className={`inline-flex items-center bg-rating-green text-white font-bold rounded-full ${sizeClasses[size]}`}>
      {rating.toFixed(1)}
    </span>
  );
}
