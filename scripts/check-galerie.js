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
  const { data, error, count } = await supabase
    .from("solutions_galerie")
    .select("*", { count: "exact" })
    .limit(5);

  console.log("Total rows:", count);
  if (data) {
    for (const row of data) {
      console.log(JSON.stringify(row));
    }
  }
  if (error) console.log("Error:", error.message);
}

main();
