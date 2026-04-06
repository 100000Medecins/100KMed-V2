import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import RecommendedSoftware from "@/components/sections/RecommendedSoftware";
import AboutMission from "@/components/sections/AboutMission";
import EHealthVideos from "@/components/sections/EHealthVideos";
import EditorCTA from "@/components/sections/EditorCTA";
import { getCategories } from "@/lib/db/categories";
import { getSolutions, getNotesUtilisateursGlobales } from "@/lib/db/solutions";

export const revalidate = 1800;

export default async function Home() {
  const categories = await getCategories();

  const categoriesData = await Promise.all(
    categories.map(async (cat) => {
      const solutions = await getSolutions({ categorieId: cat.id });
      const solutionIds = solutions.map((s) => s.id);
      const notesUtilisateurs = await getNotesUtilisateursGlobales(solutionIds);

      const solutionsAvecNotes = solutions
        .map((s) => ({
          id: s.id,
          nom: s.nom,
          slug: s.slug,
          logo_url: s.logo_url,
          noteRedacBase5: notesUtilisateurs[s.id] || null,
          categorieSlug: cat.slug || "",
        }))
        .filter((s) => s.noteRedacBase5 !== null)
        .sort((a, b) => (b.noteRedacBase5 || 0) - (a.noteRedacBase5 || 0))
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
        <HeroSection />
        <RecommendedSoftware categories={categoriesData} />
        <AboutMission />
        <EHealthVideos />
        <EditorCTA />
      </main>
      <Footer />
    </>
  );
}
