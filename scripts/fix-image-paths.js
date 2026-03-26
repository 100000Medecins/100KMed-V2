const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const SOLUTIONS_DIR = "public/images/solutions";
const EDITEURS_DIR = "public/images/editeurs";

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(f));
}

function findLogoFile(files) {
  return files.find((f) => /logo/i.test(f)) || null;
}

function getGalleryFiles(files) {
  return files
    .filter((f) => !/logo/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/-(\d+)/)?.[1] || "0");
      const numB = parseInt(b.match(/-(\d+)/)?.[1] || "0");
      return numA - numB;
    });
}

// Map old Firebase folder names to local folder names (case-insensitive)
function findLocalFolder(firebasePath) {
  if (!firebasePath) return null;

  // Extract folder name from path like "logiciels-metiers/FolderName/file.ext"
  const parts = firebasePath.split("/");
  let folderName;
  if (parts[0] === "logiciels-metiers" && parts.length >= 2) {
    folderName = parts[1];
  } else if (parts[0] === "editeurs") {
    // TAMM case: logo_url = "editeurs/TAMM.png" -> folder is Tamm
    return null; // Will handle separately
  } else {
    folderName = parts[0];
  }

  // Find matching folder (case-insensitive)
  const folders = fs
    .readdirSync(SOLUTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  return (
    folders.find((f) => f.toLowerCase() === folderName.toLowerCase()) || null
  );
}

async function main() {
  // 1. Get all solutions from DB
  const { data: solutions } = await supabase
    .from("solutions")
    .select("id, nom, slug, logo_url")
    .order("nom");

  console.log("=== CORRECTION DES LOGOS SOLUTIONS ===\n");

  // Build slug-to-folder mapping
  const folders = fs
    .readdirSync(SOLUTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let logoUpdated = 0;

  for (const sol of solutions) {
    // Find local folder matching this solution
    let folder = findLocalFolder(sol.logo_url);

    // Fallback: match by slug
    if (!folder) {
      folder =
        folders.find((f) => f.toLowerCase() === sol.slug?.toLowerCase()) ||
        null;
    }

    // Special case: TAMM (logo was in editeurs/)
    if (!folder && sol.slug === "tamm") {
      folder = folders.find((f) => f.toLowerCase() === "tamm") || null;
    }

    if (!folder) {
      console.log("  PAS DE DOSSIER LOCAL: " + sol.nom + " (slug=" + sol.slug + ")");
      continue;
    }

    const folderPath = path.join(SOLUTIONS_DIR, folder);
    const files = listImageFiles(folderPath);
    const logoFile = findLogoFile(files);

    if (logoFile) {
      const newLogoUrl = "/images/solutions/" + folder + "/" + logoFile;
      if (newLogoUrl !== sol.logo_url) {
        const { error } = await supabase
          .from("solutions")
          .update({ logo_url: newLogoUrl })
          .eq("id", sol.id);
        if (error) {
          console.log("  ERREUR " + sol.nom + ": " + error.message);
        } else {
          console.log(
            "  OK " + sol.nom + ": " + (sol.logo_url || "NULL") + " -> " + newLogoUrl
          );
          logoUpdated++;
        }
      } else {
        console.log("  DEJA OK " + sol.nom);
      }
    } else {
      console.log("  PAS DE LOGO dans " + folderPath);
    }
  }

  console.log("\nLogos solutions mis à jour: " + logoUpdated);

  // 2. Fix editeurs logos
  console.log("\n=== CORRECTION DES LOGOS EDITEURS ===\n");

  const { data: editeurs } = await supabase
    .from("editeurs")
    .select("id, nom, logo_url")
    .order("nom");

  const editeurFiles = listImageFiles(EDITEURS_DIR);
  let editeurUpdated = 0;

  for (const ed of editeurs) {
    if (!ed.logo_url) {
      console.log("  PAS DE LOGO: " + ed.nom);
      continue;
    }

    // Current path is like "editeurs/ADSion.png"
    // Extract filename
    const filename = ed.logo_url.split("/").pop();

    // Check if this file exists locally
    const localPath = path.join(EDITEURS_DIR, filename);
    let newUrl;

    if (fs.existsSync(localPath)) {
      newUrl = "/images/editeurs/" + filename;
    } else {
      // Try case-insensitive match
      const match = editeurFiles.find(
        (f) => f.toLowerCase() === filename.toLowerCase()
      );
      if (match) {
        newUrl = "/images/editeurs/" + match;
      } else {
        console.log(
          "  FICHIER MANQUANT " + ed.nom + ": " + filename
        );
        continue;
      }
    }

    if (newUrl !== ed.logo_url) {
      const { error } = await supabase
        .from("editeurs")
        .update({ logo_url: newUrl })
        .eq("id", ed.id);
      if (error) {
        console.log("  ERREUR " + ed.nom + ": " + error.message);
      } else {
        console.log("  OK " + ed.nom + ": " + ed.logo_url + " -> " + newUrl);
        editeurUpdated++;
      }
    } else {
      console.log("  DEJA OK " + ed.nom);
    }
  }

  console.log("\nLogos éditeurs mis à jour: " + editeurUpdated);

  // 3. Fix galerie - replace all entries with actual local files
  console.log("\n=== CORRECTION DE LA GALERIE ===\n");

  let galerieDeleted = 0;
  let galerieInserted = 0;

  for (const sol of solutions) {
    let folder = findLocalFolder(sol.logo_url);
    if (!folder) {
      folder =
        folders.find((f) => f.toLowerCase() === sol.slug?.toLowerCase()) ||
        null;
    }
    if (!folder && sol.slug === "tamm") {
      folder = folders.find((f) => f.toLowerCase() === "tamm") || null;
    }

    if (!folder) continue;

    const folderPath = path.join(SOLUTIONS_DIR, folder);
    const files = listImageFiles(folderPath);
    const galleryFiles = getGalleryFiles(files);

    // Delete old galerie entries for this solution
    const { data: oldEntries } = await supabase
      .from("solutions_galerie")
      .select("id")
      .eq("id_solution", sol.id);

    if (oldEntries && oldEntries.length > 0) {
      const { error: delError } = await supabase
        .from("solutions_galerie")
        .delete()
        .eq("id_solution", sol.id);
      if (delError) {
        console.log("  ERREUR DELETE " + sol.nom + ": " + delError.message);
        continue;
      }
      galerieDeleted += oldEntries.length;
    }

    // Insert new galerie entries from local files
    if (galleryFiles.length > 0) {
      const rows = galleryFiles.map((f, i) => ({
        id_solution: sol.id,
        url: "/images/solutions/" + folder + "/" + f,
        titre: f.replace(/\.[^.]+$/, ""), // filename without extension
        ordre: i + 1,
      }));

      const { error: insError } = await supabase
        .from("solutions_galerie")
        .insert(rows);
      if (insError) {
        console.log("  ERREUR INSERT " + sol.nom + ": " + insError.message);
      } else {
        console.log(
          "  OK " + sol.nom + ": " + galleryFiles.length + " images"
        );
        galerieInserted += galleryFiles.length;
      }
    } else {
      console.log("  " + sol.nom + ": aucune image galerie");
    }
  }

  console.log(
    "\nGalerie: " +
      galerieDeleted +
      " anciennes supprimées, " +
      galerieInserted +
      " nouvelles insérées"
  );

  console.log("\n🎉 Correction terminée !");
}

main().catch(console.error);
