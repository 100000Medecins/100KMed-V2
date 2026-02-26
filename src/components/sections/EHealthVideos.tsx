import { videoItems } from "@/lib/data";
import VideoCard from "@/components/ui/VideoCard";
import Button from "@/components/ui/Button";

export default function EHealthVideos() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-extrabold text-navy mb-2">
            Les enjeux de l&apos;e-santé
          </h2>
          <p className="text-sm text-gray-400 font-medium">
            Les conseils du Dr Azerty
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {videoItems.map((item) => (
            <VideoCard key={item.title} item={item} />
          ))}
        </div>

        <div className="text-center mt-14">
          <Button variant="primary" showArrow>
            Accéder aux articles
          </Button>
        </div>
      </div>
    </section>
  );
}
