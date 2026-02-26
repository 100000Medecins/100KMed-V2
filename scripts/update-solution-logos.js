const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
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

async function main() {
  // 1. Check real columns
  const { data: colSample } = await supabase
    .from("solutions")
    .select("*")
    .limit(1);
  if (colSample && colSample[0]) {
    console.log("=== COLONNES SOLUTIONS ===");
    console.log(Object.keys(colSample[0]).join(", "));
    console.log("");
  }

  // 2. List all solution folders
  const baseDir = "public/images/solutions";
  const folders = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // 3. Get all solutions from DB
  const { data: solutions } = await supabase
    .from("solutions")
    .select("id, nom")
    .order("nom");

  console.log("Dossiers:", folders.length);
  console.log("Solutions:", solutions.length);
  console.log("");

  // 4. Update logos only (galerie column TBD)
  let updated = 0;
  for (const folder of folders) {
    const folderLower = folder.toLowerCase();
    const files = fs
      .readdirSync(path.join(baseDir, folder))
      .filter((f) => /\.(png|jpg|jpeg|svg|webp)$/i.test(f));

    const logoFile = files.find((f) => /logo/i.test(f));
    const galleryFiles = files
      .filter((f) => !/logo/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/-(\d+)/)?.[1] || "0");
        const numB = parseInt(b.match(/-(\d+)/)?.[1] || "0");
        return numA - numB;
      });

    const sol = solutions.find((s) => s.id.toLowerCase() === folderLower);

    if (!sol) {
      console.log("PAS DE MATCH pour dossier: " + folder);
      continue;
    }

    const logoUrl = logoFile
      ? "/images/solutions/" + folder + "/" + logoFile
      : null;
    const galerie = galleryFiles.map(
      (f) => "/images/solutions/" + folder + "/" + f
    );

    // Update logo_url only
    const { error } = await supabase
      .from("solutions")
      .update({ logo_url: logoUrl })
      .eq("id", sol.id);

    if (error) {
      console.log("ERREUR LOGO " + sol.id + ": " + error.message);
    } else {
      console.log(
        "OK " +
          sol.id +
          " -> logo=" +
          (logoUrl || "aucun") +
          " | galerie=" +
          galerie.length +
          " images (non sauvé)"
      );
      updated++;
    }
  }

  console.log("\nLogos mis à jour: " + updated + "/" + solutions.length);
}

main();
