interface ArticleHeroProps {
  src?: string;
  alt?: string;
}

export default function ArticleHero({
  src = "/images/articles/cab-devices.jpg",
  alt = "Illustration article",
}: ArticleHeroProps) {
  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-card">
      <img
        src={src}
        alt={alt}
        className="w-full aspect-[16/9] object-cover"
      />
    </div>
  );
}
