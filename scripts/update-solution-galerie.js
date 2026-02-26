const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

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
  const baseDir = "public/images/solutions";
  const folders = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  // Get all solutions from DB
  const { data: solutions } = await supabase
    .from("solutions")
    .select("id")
    .order("id");
  const solutionIds = new Set(solutions.map((s) => s.id));

  // Delete all existing gallery entries
  const { error: delErr } = await supabase
    .from("solutions_galerie")
    .delete()
    .gte("id", 0);
  if (delErr) {
    console.log("Erreur suppression:", delErr.message);
    return;
  }
  console.log("Anciennes entrées supprimées.\n");

  // Insert new entries for each solution folder
  let totalInserted = 0;
  for (const folder of folders) {
    // Check if this folder matches a solution ID
    if (!solutionIds.has(folder)) {
      console.log("SKIP dossier " + folder + " (pas de solution correspondante)");
      continue;
    }

    const files = fs
      .readdirSync(path.join(baseDir, folder))
      .filter((f) => /\.(png|jpg|jpeg|svg|webp)$/i.test(f))
      .filter((f) => !/logo/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/-(\d+)/)?.[1] || "0");
        const numB = parseInt(b.match(/-(\d+)/)?.[1] || "0");
        return numA - numB;
      });

    if (files.length === 0) continue;

    const rows = files.map((f, i) => ({
      id_solution: folder,
      type: "IMAGE",
      url: "/images/solutions/" + folder + "/" + f,
      ordre: i,
      is_videos_principales: false,
    }));

    const { error } = await supabase.from("solutions_galerie").insert(rows);
    if (error) {
      console.log("ERREUR " + folder + ": " + error.message);
    } else {
      console.log("OK " + folder + " -> " + files.length + " images");
      totalInserted += files.length;
    }
  }

  console.log("\nTotal images insérées: " + totalInserted);
}

main();
