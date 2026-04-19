import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import RecommendedSoftware from "@/components/sections/RecommendedSoftware";
import AboutMission from "@/components/sections/AboutMission";
import StoriesSection from "@/components/sections/StoriesSection";
import EditorCTA from "@/components/sections/EditorCTA";
import BlogPreview from "@/components/sections/BlogPreview";
import CommunautePreview from "@/components/sections/CommunautePreview";
import { getCategories } from "@/lib/db/categories";
import { getSolutions, getNotesUtilisateursGlobales, getNotesRedacGlobales, getSiteStats } from "@/lib/db/solutions";
import { getVideos } from "@/lib/db/misc";

export const revalidate = 1800;

export default async function Home() {
  const [categories, siteStats, videos] = await Promise.all([
    getCategories(),
    getSiteStats(),
    getVideos({ isVideosPrincipales: true, onlyPublished: true, limit: 6 }),
  ]);

  const categoriesData = await Promise.all(
    categories.map(async (cat) => {
      const solutions = await getSolutions({ categorieId: cat.id });
      const solutionIds = solutions.map((s) => s.id);
      const [notesUtilisateurs, notesRedac] = await Promise.all([
        getNotesUtilisateursGlobales(solutionIds),
        getNotesRedacGlobales(solutionIds),
      ]);

      const solutionsAvecNotes = solutions
        .map((s) => ({
          id: s.id,
          nom: s.nom,
          slug: s.slug,
          logo_url: s.logo_url,
          noteUtilisateurs: notesUtilisateurs[s.id] ?? null,
          noteRedac: notesRedac[s.id] ?? null,
          categorieSlug: cat.slug || "",
        }))
        .filter((s) => s.noteUtilisateurs !== null || s.noteRedac !== null)
        .sort((a, b) => (b.noteUtilisateurs || 0) - (a.noteUtilisateurs || 0))
        .slice(0, 6);

      const SLUGS_SANS_NOTES_REDAC = ['intelligence-artificielle-medecine', 'ia-documentaires', 'agenda-medical']

      return {
        id: cat.id,
        nom: cat.nom,
        slug: cat.slug || "",
        hasNoteRedac: !SLUGS_SANS_NOTES_REDAC.includes(cat.slug || ""),
        solutions: solutionsAvecNotes,
      };
    })
  );

  return (
    <>
      <Navbar />
      <main>
        <HeroSection nbSolutions={siteStats.nbSolutions} nbEvaluations={siteStats.nbEvaluations} nbInscrits={siteStats.nbInscrits} />
        <RecommendedSoftware categories={categoriesData} />
        <AboutMission />
        <BlogPreview />
        <CommunautePreview />
        <StoriesSection videos={videos} />
        <EditorCTA />
      </main>
      <Footer />
    </>
  );
}
