import type { VideoItem } from "@/types";

interface VideoCardProps {
  item: VideoItem;
}

export default function VideoCard({ item }: VideoCardProps) {
  return (
    <div className="group">
      <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300">
        {/* YouTube Shorts embed */}
        <div className="w-full aspect-[9/16]">
          <iframe
            src={`https://www.youtube.com/embed/${item.youtubeId}`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Title below */}
      <h4 className="mt-4 text-xs font-bold tracking-widest text-navy uppercase text-center">
        {item.title}
      </h4>
    </div>
  );
}
