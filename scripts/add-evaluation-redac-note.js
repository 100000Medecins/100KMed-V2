const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

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
  // Test if column exists
  const { data, error } = await supabase
    .from("solutions")
    .select("id, evaluation_redac_note")
    .limit(1);

  if (error) {
    console.log("La colonne n'existe pas:", error.message);
    console.log("\n>>> Tu dois exécuter ce SQL dans le SQL Editor de Supabase :");
    console.log("ALTER TABLE solutions ADD COLUMN evaluation_redac_note numeric;");
  } else {
    console.log("La colonne evaluation_redac_note existe deja.");
    console.log("Valeur actuelle:", JSON.stringify(data));

    // Test update
    const testId = data[0]?.id;
    if (testId) {
      const { error: updateErr } = await supabase
        .from("solutions")
        .update({ evaluation_redac_note: 3.5 })
        .eq("id", testId);
      if (updateErr) {
        console.log("Erreur update:", updateErr.message);
      } else {
        console.log("Update OK pour " + testId);
        // Remettre la valeur originale
        await supabase
          .from("solutions")
          .update({ evaluation_redac_note: data[0].evaluation_redac_note })
          .eq("id", testId);
        console.log("Valeur restauree.");
      }
    }
  }
}

main();
