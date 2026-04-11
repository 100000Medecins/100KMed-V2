import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import RecommendedSoftware from "@/components/sections/RecommendedSoftware";
import AboutMission from "@/components/sections/AboutMission";
import EHealthVideos from "@/components/sections/EHealthVideos";
import EditorCTA from "@/components/sections/EditorCTA";
import { getCategories } from "@/lib/db/categories";
import { getSolutions, getNotesUtilisateursGlobales, getNotesRedacGlobales, getSiteStats } from "@/lib/db/solutions";

export const revalidate = 1800;

export default async function Home() {
  const [categories, siteStats] = await Promise.all([
    getCategories(),
    getSiteStats(),
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

      return {
        id: cat.id,
        nom: cat.nom,
        slug: cat.slug || "",
        solutions: solutionsAvecNotes,
      };
    })
  );

  return (
    <>
      <Navbar />
      <main>
        <HeroSection nbSolutions={siteStats.nbSolutions} nbEvaluations={siteStats.nbEvaluations} />
        <RecommendedSoftware categories={categoriesData} />
        <AboutMission />
        <EHealthVideos />
        <EditorCTA />
      </main>
      <Footer />
    </>
  );
}
