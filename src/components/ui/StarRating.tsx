import { Star, StarHalf } from "lucide-react";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number | "sm" | "lg";
  color?: "gold" | "green";
}

const sizeMap = { sm: 12, lg: 18 };

const colorClasses = {
  gold: "text-rating-star fill-rating-star",
  green: "text-rating-green fill-rating-green",
};

export default function StarRating({ rating, max = 5, size = 14, color = "gold" }: StarRatingProps) {
  const pixelSize = typeof size === "string" ? sizeMap[size] : size;
  const activeClass = colorClasses[color];
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.3;

  for (let i = 0; i < max; i++) {
    if (i < fullStars) {
      stars.push(
        <Star
          key={i}
          className={activeClass}
          style={{ width: pixelSize, height: pixelSize }}
        />
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <div key={i} className="relative" style={{ width: pixelSize, height: pixelSize }}>
          <Star
            className="absolute text-gray-200 fill-gray-200"
            style={{ width: pixelSize, height: pixelSize }}
          />
          <div className="absolute overflow-hidden" style={{ width: pixelSize / 2, height: pixelSize }}>
            <Star
              className={activeClass}
              style={{ width: pixelSize, height: pixelSize }}
            />
          </div>
        </div>
      );
    } else {
      stars.push(
        <Star
          key={i}
          className="text-gray-200 fill-gray-200"
          style={{ width: pixelSize, height: pixelSize }}
        />
      );
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
}
