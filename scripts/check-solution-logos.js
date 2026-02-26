const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: solutions, error } = await supabase
    .from("solutions")
    .select("id, nom, logo_url, id_editeur")
    .order("nom");

  if (error) {
    console.log("ERREUR:", error.message);
    return;
  }

  console.log("=== TOUTES LES SOLUTIONS ===\n");
  for (const s of solutions) {
    console.log(
      s.id +
        " | " +
        s.nom +
        " | editeur=" +
        (s.id_editeur || "null") +
        " | logo=" +
        (s.logo_url || "VIDE")
    );
  }
  console.log("\nTotal:", solutions.length);
}

main();
