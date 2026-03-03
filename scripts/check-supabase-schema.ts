import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSchema() {
  // List all tables and their columns by trying to select from each
  const tables = [
    'editeurs', 'categories', 'solutions', 'tags', 'solutions_tags',
    'solution_galerie', 'solutions_galerie', 'criteres', 'resultats',
    'evaluations', 'users', 'preferences', 'users_preferences',
    'solutions_utilisees', 'solutions_favorites', 'avatars', 'videos',
    'actualites', 'documents', 'pages_statiques', 'notes_redac'
  ]

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(0)
    if (error) {
      console.log(`❌ ${table}: ${error.message}`)
    } else {
      // Get column names from a real row
      const { data: sample } = await supabase.from(table).select('*').limit(1)
      if (sample && sample.length > 0) {
        const cols = Object.keys(sample[0])
        console.log(`✅ ${table}: ${cols.join(', ')}`)
      } else {
        console.log(`✅ ${table}: (vide, colonnes inconnues)`)
      }
    }
  }
}

checkSchema().catch(console.error)
