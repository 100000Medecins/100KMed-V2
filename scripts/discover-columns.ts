import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as crypto from 'crypto'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function discoverColumns(table: string) {
  // Insert a minimal row to discover columns from the error/returned data
  const testId = crypto.randomUUID()
  const { data, error } = await supabase.from(table).insert({ id: testId }).select('*')

  if (data && data.length > 0) {
    const cols = Object.keys(data[0])
    console.log(`✅ ${table}: ${cols.join(', ')}`)
    // Clean up
    await supabase.from(table).delete().eq('id', testId)
    return
  }

  if (error) {
    // If error mentions a missing required field, try with that field
    if (error.message.includes('null value in column')) {
      const match = error.message.match(/column "(\w+)"/)
      if (match) {
        const col = match[1]
        const { data: d2 } = await supabase.from(table).insert({ id: testId, [col]: 'test' }).select('*')
        if (d2 && d2.length > 0) {
          console.log(`✅ ${table}: ${Object.keys(d2[0]).join(', ')}`)
          await supabase.from(table).delete().eq('id', testId)
          return
        }
      }
    }
    console.log(`❌ ${table}: ${error.message}`)
  }
}

async function main() {
  const tables = [
    'editeurs', 'categories', 'solutions', 'tags', 'solutions_tags',
    'solutions_galerie', 'criteres', 'resultats', 'evaluations',
    'preferences', 'solutions_utilisees', 'avatars', 'videos',
    'notes_redac',
  ]

  for (const t of tables) {
    await discoverColumns(t)
  }
}

main().catch(console.error)
