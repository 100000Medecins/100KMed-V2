/**
 * Audit slugs Firebase vs Supabase — pour valider l'hypothèse :
 *   « slug Supabase == firebaseId.toLowerCase() »
 *
 * Si l'hypothèse est vraie partout, la normalisation casse-only dans
 * src/app/solutions/[idCategorie]/[idSolution]/page.tsx couvre 100 % des
 * anciennes URLs Firebase et aucun mapping par slug n'est nécessaire.
 *
 * Si elle est fausse pour certaines solutions/catégories, on découvre
 * ici les renommages qu'il faudra rediriger un par un dans next.config.mjs.
 *
 * Lecture seule des 2 côtés. Aucune écriture.
 *
 * Usage : npx tsx scripts/audit-slugs-firebase-vs-supabase.ts
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// ─── Firebase ───────────────────────────────────────────────
const serviceAccount = require(path.resolve(
  __dirname,
  '../../CloudStation/medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'
))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()

// ─── Supabase ───────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface FirebaseDoc {
  id: string
  nom?: string
  idCategorie?: string
  actif?: boolean
}

interface SbSolution {
  slug: string | null
  nom: string | null
  actif: boolean | null
}

interface SbCategorie {
  slug: string | null
  nom: string | null
}

async function main() {
  console.log('Lecture Firebase...')
  const [fbSolutionsSnap, fbCategoriesSnap, fbEditeursSnap] = await Promise.all([
    firestore.collection('solutions').get(),
    firestore.collection('categories').get(),
    firestore.collection('editeurs').get(),
  ])
  const fbSolutions: FirebaseDoc[] = fbSolutionsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  })) as FirebaseDoc[]
  const fbCategories: FirebaseDoc[] = fbCategoriesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  })) as FirebaseDoc[]
  const fbEditeurs: FirebaseDoc[] = fbEditeursSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  })) as FirebaseDoc[]

  console.log(`  ${fbSolutions.length} solutions Firebase`)
  console.log(`  ${fbCategories.length} categories Firebase`)
  console.log(`  ${fbEditeurs.length} editeurs Firebase`)

  console.log('Lecture Supabase...')
  const [{ data: sbSolRaw }, { data: sbCatRaw }, { data: sbEdRaw }] = await Promise.all([
    supabase.from('solutions').select('slug, nom, actif'),
    supabase.from('categories').select('slug, nom'),
    supabase.from('editeurs').select('slug, nom'),
  ])
  const sbSolutions = (sbSolRaw ?? []) as SbSolution[]
  const sbCategories = (sbCatRaw ?? []) as SbCategorie[]
  const sbEditeurs = (sbEdRaw ?? []) as Array<{ slug: string | null; nom: string | null }>

  console.log(`  ${sbSolutions.length} solutions Supabase`)
  console.log(`  ${sbCategories.length} categories Supabase`)
  console.log(`  ${sbEditeurs.length} editeurs Supabase`)
  console.log('')

  const sbSolSlugs = new Set(
    sbSolutions.filter((s) => s.slug).map((s) => s.slug as string)
  )
  const sbCatSlugs = new Set(
    sbCategories.filter((c) => c.slug).map((c) => c.slug as string)
  )
  const sbEdSlugs = new Set(
    sbEditeurs.filter((e) => e.slug).map((e) => e.slug as string)
  )
  // Pour les editeurs, on doit aussi pouvoir matcher par nom (puisque slug != id Firebase)
  const sbEdByNomLc = new Map(
    sbEditeurs.filter((e) => e.nom).map((e) => [e.nom!.toLowerCase().trim(), e.slug])
  )

  // ─── Audit catégories ───
  console.log('═══ AUDIT CATEGORIES ═══')
  const catMismatches: Array<{ firebaseId: string; attenduSb: string; trouveSb: boolean; noms: string }> = []
  for (const fb of fbCategories) {
    const attenduSb = fb.id.toLowerCase()
    const trouveSb = sbCatSlugs.has(attenduSb)
    if (!trouveSb) {
      catMismatches.push({
        firebaseId: fb.id,
        attenduSb,
        trouveSb,
        noms: fb.nom ?? '(sans nom)',
      })
    }
  }
  if (catMismatches.length === 0) {
    console.log(`  OK ${fbCategories.length}/${fbCategories.length} categories Firebase trouvees en Supabase avec slug = firebaseId.toLowerCase()`)
  } else {
    console.log(`  KO ${catMismatches.length} categories non matchees (renommees ou supprimees) :`)
    for (const m of catMismatches) {
      console.log(`    - Firebase id="${m.firebaseId}" (nom="${m.noms}")`)
      console.log(`      Slug Supabase attendu : "${m.attenduSb}" -> ABSENT`)
    }
  }
  console.log('')

  // ─── Audit solutions ───
  console.log('═══ AUDIT SOLUTIONS ═══')
  const solMismatches: Array<{ firebaseId: string; attenduSb: string; nom: string; idCategorie?: string }> = []
  for (const fb of fbSolutions) {
    const attenduSb = fb.id.toLowerCase()
    if (!sbSolSlugs.has(attenduSb)) {
      solMismatches.push({
        firebaseId: fb.id,
        attenduSb,
        nom: fb.nom ?? '(sans nom)',
        idCategorie: fb.idCategorie,
      })
    }
  }
  if (solMismatches.length === 0) {
    console.log(`  OK ${fbSolutions.length}/${fbSolutions.length} solutions Firebase trouvees en Supabase avec slug = firebaseId.toLowerCase()`)
  } else {
    console.log(`  KO ${solMismatches.length} solutions non matchees :`)
    console.log(`     (probables causes : solution supprimee/depubliee OU slug renomme)`)
    console.log('')
    for (const m of solMismatches) {
      console.log(`    - Firebase id="${m.firebaseId}" (nom="${m.nom}", cat="${m.idCategorie ?? '?'}")`)
      console.log(`      Slug Supabase attendu : "${m.attenduSb}" -> ABSENT`)
    }
  }
  console.log('')

  // ─── Audit editeurs ───
  console.log('═══ AUDIT EDITEURS ═══')
  console.log('  (slug Supabase = slugify(nom), donc != firebaseId.toLowerCase()')
  console.log('   On match par NOM en cherchant lequel Supabase correspond au nom Firebase)')
  console.log('')
  const edMismatches: Array<{ firebaseId: string; nomFb: string; suggestionSb?: string }> = []
  const edMatches: Array<{ firebaseId: string; slugSb: string; nomFb: string }> = []
  for (const fb of fbEditeurs) {
    const nomFb = (fb.nom ?? '').trim()
    const idLc = fb.id.toLowerCase()
    // Tentative 1 : slug Supabase = firebaseId.toLowerCase() (peu probable mais on teste)
    if (sbEdSlugs.has(idLc)) {
      edMatches.push({ firebaseId: fb.id, slugSb: idLc, nomFb })
      continue
    }
    // Tentative 2 : match par nom
    if (nomFb) {
      const slugFromNom = sbEdByNomLc.get(nomFb.toLowerCase())
      if (slugFromNom) {
        edMismatches.push({
          firebaseId: fb.id,
          nomFb,
          suggestionSb: slugFromNom,
        })
        continue
      }
    }
    // Sinon : pas de match
    edMismatches.push({ firebaseId: fb.id, nomFb })
  }
  console.log(`  OK ${edMatches.length} editeurs Firebase ont meme slug = firebaseId.toLowerCase() en Supabase`)
  if (edMismatches.length > 0) {
    console.log(`  KO ${edMismatches.length} editeurs Firebase ne sont PAS au meme slug en Supabase :`)
    for (const m of edMismatches) {
      const sugg = m.suggestionSb
        ? ` -> Supabase slug = "${m.suggestionSb}" (match par nom)`
        : ` -> AUCUN editeur Supabase avec nom "${m.nomFb}"`
      console.log(`    - Firebase id="${m.firebaseId}" (nom="${m.nomFb}")${sugg}`)
    }
  }
  console.log('')

  // ─── Conclusion ───
  console.log('═══ CONCLUSION ═══')
  if (catMismatches.length === 0 && solMismatches.length === 0 && edMismatches.length === 0) {
    console.log('  La normalisation casse-only suffit : 100 % des anciennes URLs Firebase')
    console.log('  sont redirigees vers les bonnes URLs Supabase.')
  } else {
    console.log(`  ${catMismatches.length} categorie(s) + ${solMismatches.length} solution(s) + ${edMismatches.length} editeur(s)`)
    console.log('  ne sont PAS couvert(e)s par la normalisation casse-only.')
    console.log('  Pour ces cas, il faut soit :')
    console.log('  - rediriger explicitement dans next.config.mjs (si la cible existe)')
    console.log('  - laisser en 404 (si la solution/editeur a ete depublie volontairement)')
  }
}

main().catch((err) => {
  console.error('ERREUR :', err)
  process.exit(1)
})
