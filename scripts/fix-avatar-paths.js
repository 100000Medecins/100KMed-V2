const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

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

const PORTRAITS_DIR = "public/images/portraits";

async function main() {
  const localFiles = fs
    .readdirSync(PORTRAITS_DIR)
    .filter((f) => /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(f));
  console.log("Fichiers locaux:", localFiles.length);

  const { data: avatars } = await supabase
    .from("avatars")
    .select("id, url")
    .order("id");

  console.log("Avatars en BDD:", avatars.length);
  let updated = 0;
  let missing = 0;

  for (const av of avatars) {
    const filename = av.url.split("/").pop();
    const localMatch =
      localFiles.find((f) => f === filename) ||
      localFiles.find((f) => f.toLowerCase() === filename.toLowerCase());

    if (localMatch) {
      const newUrl = "/images/portraits/" + localMatch;
      if (newUrl !== av.url) {
        const { error } = await supabase
          .from("avatars")
          .update({ url: newUrl })
          .eq("id", av.id);
        if (error) {
          console.log("  ERREUR", av.id, error.message);
        } else {
          console.log("  OK", av.url, "->", newUrl);
          updated++;
        }
      } else {
        console.log("  DEJA OK", av.url);
      }
    } else {
      console.log("  MANQUANT:", filename);
      missing++;
    }
  }

  console.log("\nMis a jour:", updated);
  console.log("Manquants:", missing);
}

main().catch(console.error);
