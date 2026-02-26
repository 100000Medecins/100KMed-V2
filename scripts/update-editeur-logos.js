const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const dir = "public/images/editeurs";
  const files = fs.readdirSync(dir);

  const { data: editeurs } = await supabase
    .from("editeurs")
    .select("id, nom")
    .order("nom");

  // Build map: lowercase base name -> filename
  const fileMap = {};
  for (const f of files) {
    const base = path.parse(f).name.toLowerCase();
    fileMap[base] = f;
  }

  let updated = 0;
  for (const ed of editeurs) {
    const idLower = ed.id.toLowerCase();
    const nomLower = ed.nom.toLowerCase().replace(/[^a-z0-9]/g, "");

    let match = fileMap[idLower] || fileMap[nomLower];

    // Partial match
    if (!match) {
      for (const [base, file] of Object.entries(fileMap)) {
        if (
          base.includes(idLower) ||
          idLower.includes(base) ||
          base.includes(nomLower) ||
          nomLower.includes(base)
        ) {
          match = file;
          break;
        }
      }
    }

    if (match) {
      const newUrl = "/images/editeurs/" + match;
      const { error } = await supabase
        .from("editeurs")
        .update({ logo_url: newUrl })
        .eq("id", ed.id);
      if (error) {
        console.log("ERREUR " + ed.nom + ": " + error.message);
      } else {
        console.log("OK " + ed.id + " (" + ed.nom + ") -> " + newUrl);
        updated++;
      }
    } else {
      console.log("PAS DE MATCH: " + ed.id + " (" + ed.nom + ")");
    }
  }
  console.log("\nTotal: " + updated + "/" + editeurs.length);
}

main();
