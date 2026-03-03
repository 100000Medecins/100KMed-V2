import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as crypto from 'crypto'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

// ─── Firebase init ───────────────────────────────────────────
const serviceAccount = require(path.resolve(__dirname, 'medecins-7a4ed-firebase-adminsdk-setys-436f7cbc9c.json'))
initializeApp({ credential: cert(serviceAccount) })
const firestore = getFirestore()

// ─── Supabase init (service role = bypass RLS) ──────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── ID Mapping: Firebase string ID → Supabase UUID ─────────
const idMap: Record<string, Record<string, string>> = {}

function getUuid(collection: string, firebaseId: string): string {
  if (!idMap[collection]) idMap[collection] = {}
  if (!idMap[collection][firebaseId]) {
    idMap[collection][firebaseId] = crypto.randomUUID()
  }
  return idMap[collection][firebaseId]
}

// ─── Helpers ─────────────────────────────────────────────────
function toISOString(val: any): string | null {
  if (!val) return null
  if (val._seconds !== undefined) return new Date(val._seconds * 1000).toISOString()
  if (typeof val === 'string' && val.length > 0) {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

function toDate(val: any): string | null {
  if (!val) return null
  if (val._seconds !== undefined) return new Date(val._seconds * 1000).toISOString().split('T')[0]
  if (typeof val === 'string' && val.length >= 10) return val.slice(0, 10)
  return null
}

function toNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

async function insertBatch(tableName: string, rows: any[], conflictKey = 'id') {
  if (rows.length === 0) { console.log(`  ⏭️  Aucune donnée pour ${tableName}`); return }
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: conflictKey })
    if (error) {
      console.error(`  ❌ Erreur ${tableName} (batch ${i}):`, error.message)
      console.error('  Premier row:', JSON.stringify(batch[0]).slice(0, 500))
      throw error
    }
  }
  console.log(`  ✅ ${rows.length} lignes dans ${tableName}`)
}

async function fetchCollection(name: string) {
  const snapshot = await firestore.collection(name).get()
  return snapshot.docs.map(doc => ({ _fid: doc.id, ...doc.data() }))
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('🚀 Début de la migration Firebase → Supabase\n')

  // ─── Nettoyage ─────────────────────────────────────────────
  console.log('🧹 Nettoyage...')
  // Tables avec UUID id
  for (const t of ['resultats', 'solutions_utilisees', 'evaluations', 'criteres', 'tags', 'solutions', 'preferences', 'categories', 'editeurs', 'avatars', 'videos']) {
    await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }
  // Tables avec serial id ou composite PK
  await supabase.from('solutions_tags').delete().gt('id', 0)
  await supabase.from('solutions_galerie').delete().gt('id', 0)
  await supabase.from('notes_redac').delete().gt('id', 0)
  // Users (cascade from auth) — paginate to get ALL users
  let totalDeleted = 0
  let page = 0
  while (true) {
    const { data: batch } = await supabase.from('users').select('id').range(page * 1000, (page + 1) * 1000 - 1)
    if (!batch || batch.length === 0) break
    for (const u of batch) await supabase.auth.admin.deleteUser(u.id)
    totalDeleted += batch.length
    page++
  }
  if (totalDeleted > 0) console.log(`  🗑️ ${totalDeleted} users supprimés`)
  console.log('  ✅ OK\n')

  // ─── Fetch Firebase ────────────────────────────────────────
  console.log('📥 Chargement Firebase...')
  const fbEditeurs = await fetchCollection('editeurs')
  const fbCategories = await fetchCollection('categories')
  const fbSolutions = await fetchCollection('solutions')
  const fbTags = await fetchCollection('tags')
  const fbCriteres = await fetchCollection('criteres')
  const fbResultats = await fetchCollection('resultats')
  const fbEvaluations = await fetchCollection('evaluations')
  const fbUsers = await fetchCollection('users')
  const fbSolutionsFavorites = await fetchCollection('solutionsFavorites')
  const fbSolutionsUtilisees = await fetchCollection('solutionsUtilisees')
  const fbAvatars = await fetchCollection('avatars')
  const fbVideos = await fetchCollection('videos')
  const fbPreferences = await fetchCollection('preferences')
  console.log('  ✅ OK\n')

  const critereIdToTech: Record<string, string> = {}
  for (const c of fbCriteres) {
    const d = c as any
    if (d.identifiantTech) critereIdToTech[c._fid] = d.identifiantTech
  }

  // Build sets of known Firebase IDs for FK validation
  const knownEditeurs = new Set(fbEditeurs.map(e => e._fid))
  const knownCategories = new Set(fbCategories.map(c => c._fid))
  const knownSolutions = new Set(fbSolutions.map(s => s._fid))
  const knownCriteres = new Set(fbCriteres.map(c => c._fid))

  // ═══════════════════════════════════════════════════════════
  // 1. EDITEURS
  // Colonnes: id, nom, nom_commercial, siret, creation, nb_employes,
  //   description, culture, gouvernance, mot_editeur, website,
  //   logo_titre, logo_url, contact_*
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 1/13 — Editeurs...')
  const editeurs = fbEditeurs.map((e: any) => ({
    id: getUuid('editeurs', e._fid),
    nom: e.nom || '',
    nom_commercial: e.nomCommercial || null,
    siret: e.siret || null,
    creation: toDate(e.creation),
    nb_employes: toNumber(e.nbEmployes),
    description: e.description || null,
    culture: e.culture || null,
    gouvernance: e.gouvernance || null,
    mot_editeur: e.motEditeur || null,
    website: e.website?.url || null,
    logo_url: e.logo?.url || null,
    logo_titre: e.logo?.titre || null,
    contact_email: e.contact?.email || null,
    contact_telephone: e.contact?.telephone || null,
    contact_adresse: e.contact?.adresse || null,
    contact_cp: e.contact?.cp || null,
    contact_ville: e.contact?.ville || null,
    contact_pays: e.contact?.pays || null,
  }))
  await insertBatch('editeurs', editeurs)

  // ═══════════════════════════════════════════════════════════
  // 2. CATEGORIES
  // Colonnes: id, nom, position, actif, intro, icon,
  //   categorie_defaut, criteres_recherche, schema_evaluation, slug
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 2/13 — Catégories...')
  const categories = fbCategories.map((c: any) => ({
    id: getUuid('categories', c._fid),
    nom: c.nom || '',
    position: toNumber(c.position) ?? 0,
    actif: c.actif ?? true,
    intro: c.intro || null,
    icon: c.icon || null,
    categorie_defaut: c.categorieDefaut ?? false,
    schema_evaluation: c.schemaEvaluation || null,
    criteres_recherche: c.criteresRecherche || null,
    slug: c._fid.toLowerCase(),
  }))
  await insertBatch('categories', categories)

  // ═══════════════════════════════════════════════════════════
  // 3. AVATARS (id, url)
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 3/13 — Avatars...')
  const avatars = fbAvatars.map((a: any) => ({
    id: getUuid('avatars', a._fid),
    url: a.url || '',
  }))
  await insertBatch('avatars', avatars)

  // ═══════════════════════════════════════════════════════════
  // 4. PREFERENCES (id, libelle)
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 4/13 — Préférences...')
  const preferences = fbPreferences.map((p: any) => ({
    id: getUuid('preferences', p._fid),
    libelle: p.libelle || '',
  }))
  await insertBatch('preferences', preferences)

  // ═══════════════════════════════════════════════════════════
  // 5. SOLUTIONS
  // Colonnes: id, nom, id_editeur, id_categorie, version,
  //   description, logo_titre, logo_url, website, mot_editeur,
  //   lancement, fin_vie, nb_utilisateurs, duree_engagement,
  //   prix_ttc, prix_devise, prix_frequence,
  //   prix_duree_engagement_mois, prix_created, nb_discussions,
  //   date_publication, date_maj, date_debut, date_fin,
  //   evaluation_redac_avis, evaluation_redac_points_forts,
  //   evaluation_redac_points_faibles, segments, meta,
  //   evaluation_redac_note, slug
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 5/13 — Solutions...')
  const solutions = fbSolutions.map((s: any) => ({
    id: getUuid('solutions', s._fid),
    nom: s.nom || '',
    id_editeur: s.idEditeur && knownEditeurs.has(s.idEditeur) ? getUuid('editeurs', s.idEditeur) : null,
    id_categorie: s.idCategorie && knownCategories.has(s.idCategorie) ? getUuid('categories', s.idCategorie) : null,
    version: s.version || null,
    description: s.description || null,
    logo_titre: s.logo?.titre || null,
    logo_url: s.logo?.url || null,
    website: s.website?.url || null,
    mot_editeur: s.motEditeur || null,
    lancement: toDate(s.lancement),
    fin_vie: toDate(s.finVie),
    nb_utilisateurs: s.nbUtilisateurs || null,
    duree_engagement: s.dureeEngagement || null,
    prix_ttc: toNumber(s.prix?.prix_ttc),
    prix_devise: s.prix?.devise || null,
    prix_frequence: s.prix?.frequence || null,
    prix_duree_engagement_mois: toNumber(s.prix?.dureeEngagementMois),
    prix_created: toDate(s.prix?.created),
    nb_discussions: toNumber(s.nbDiscussions) ?? 0,
    date_publication: toISOString(s.datePublication) || null,
    date_maj: toISOString(s.dateMaj) || null,
    evaluation_redac_avis: s.evaluationRedac?.avis || null,
    evaluation_redac_points_forts: s.evaluationRedac?.pointsForts || null,
    evaluation_redac_points_faibles: s.evaluationRedac?.pointsFaibles || null,
    segments: s.segments || null,
    meta: s.meta || null,
    slug: s._fid.toLowerCase(),
  }))
  await insertBatch('solutions', solutions)

  // ═══════════════════════════════════════════════════════════
  // 6. TAGS (id, libelle, id_categorie, ordre, is_tag_principal)
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 6/13 — Tags...')
  const tags = fbTags.map((t: any) => ({
    id: getUuid('tags', t._fid),
    libelle: t.libelle || '',
    id_categorie: t.idCategorie && knownCategories.has(t.idCategorie) ? getUuid('categories', t.idCategorie) : null,
    ordre: toNumber(t.ordre) ?? 0,
    is_tag_principal: t.isTagPrincipal ?? false,
  }))
  await insertBatch('tags', tags)

  // ═══════════════════════════════════════════════════════════
  // 7. SOLUTIONS_TAGS (serial id, id_solution, id_tag, ...)
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 7/13 — Solutions-Tags...')
  const solutionsTags: any[] = []
  for (const s of fbSolutions) {
    const sol = s as any
    if (Array.isArray(sol.tags)) {
      for (const t of sol.tags) {
        if (t.id && idMap['tags']?.[t.id]) {
          solutionsTags.push({
            id_solution: getUuid('solutions', s._fid),
            id_tag: getUuid('tags', t.id),
            ordre: toNumber(t.ordre) ?? 0,
            is_tag_principal: t.isTagPrincipal ?? false,
          })
        }
      }
    }
  }
  if (solutionsTags.length > 0) {
    const { error } = await supabase.from('solutions_tags').insert(solutionsTags)
    if (error) console.error('  ❌ solutions_tags:', error.message)
    else console.log(`  ✅ ${solutionsTags.length} solutions_tags`)
  }

  // ═══════════════════════════════════════════════════════════
  // 8. SOLUTIONS_GALERIE (serial id, solution_id, url, titre, ordre)
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 8/13 — Galerie...')
  const galerieRows: any[] = []
  for (const s of fbSolutions) {
    const sol = s as any
    if (Array.isArray(sol.galerie)) {
      sol.galerie.forEach((img: any, idx: number) => {
        galerieRows.push({
          id_solution: getUuid('solutions', s._fid),
          url: img.url || '',
          titre: img.titre || null,
          ordre: img.ordre ?? idx,
        })
      })
    }
  }
  if (galerieRows.length > 0) {
    for (let i = 0; i < galerieRows.length; i += 500) {
      const batch = galerieRows.slice(i, i + 500)
      const { error } = await supabase.from('solutions_galerie').insert(batch)
      if (error) { console.error('  ❌ solutions_galerie:', error.message); break }
    }
    console.log(`  ✅ ${galerieRows.length} images galerie (tentative)`)
  }

  // ═══════════════════════════════════════════════════════════
  // 9. CRITERES
  // Colonnes: id, identifiant_tech, id_categorie, nom_court,
  //   nom_long, nom_capital, question, information, type,
  //   is_parent, is_enfant, reponse_type, reponse_min, reponse_max
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 9/13 — Critères...')
  const criteres = fbCriteres.map((c: any) => ({
    id: getUuid('criteres', c._fid),
    identifiant_tech: c.identifiantTech || null,
    id_categorie: c.idCategorie && knownCategories.has(c.idCategorie) ? getUuid('categories', c.idCategorie) : null,
    nom_court: c.nomCourt || null,
    nom_long: c.nomLong || null,
    nom_capital: c.nomCapital || null,
    question: c.question || null,
    information: c.information || null,
    type: c.type || null,
    is_parent: c.parent ?? false,
    is_enfant: c.enfant ?? false,
    reponse_type: c.reponse?.type || null,
    reponse_min: toNumber(c.reponse?.min),
    reponse_max: toNumber(c.reponse?.max),
  }))
  await insertBatch('criteres', criteres)

  // ═══════════════════════════════════════════════════════════
  // 10. RESULTATS
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 10/13 — Résultats...')
  const resultats = fbResultats.map((r: any) => ({
    id: getUuid('resultats', r._fid),
    solution_id: r.idSolution && knownSolutions.has(r.idSolution) ? getUuid('solutions', r.idSolution) : null,
    critere_id: r.idCritere && knownCriteres.has(r.idCritere) ? getUuid('criteres', r.idCritere) : null,
    moyenne_utilisateurs: toNumber(r.moyenneUtilisateurs),
    moyenne_utilisateurs_base5: r.moyenneUtilisateurs ? toNumber((r.moyenneUtilisateurs / 2).toFixed(2)) : null,
    nb_notes: toNumber(r.nbNotes) ?? 0,
    note_redac: toNumber(r.noteRedac),
    note_redac_base5: r.noteRedac ? toNumber((r.noteRedac / 2).toFixed(2)) : null,
    avis_redac: r.avisRedac || null,
    nps: toNumber(r.nps),
    notes: r.notes || null,
    notes_critere: r.notesCriteres || null,
    repartition: r.repartition || null,
  }))
  await insertBatch('resultats', resultats)

  // ═══════════════════════════════════════════════════════════
  // 11. VIDEOS
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 11/13 — Vidéos...')
  const videos = fbVideos.map((v: any) => ({
    id: getUuid('videos', v._fid),
    type: v.type || null,
    titre: v.titre || null,
    url: v.url || null,
    vignette: v.vignette || null,
    description: v.description || null,
    is_videos_principales: v.isVideosPrincipales ?? false,
    ordre: toNumber(v.ordre) ?? 0,
  }))
  await insertBatch('videos', videos)

  // ═══════════════════════════════════════════════════════════
  // 12. USERS (auth + public)
  // ═══════════════════════════════════════════════════════════
  console.log('⏳ 12/13 — Utilisateurs...')
  console.log(`  ℹ️  ${fbUsers.length} users...`)
  let userCount = 0, userErrors = 0

  for (const u of fbUsers) {
    const d = u as any
    const rpps = d.rpps || u._fid
    const email = d.contact?.email || `rpps_${rpps}@placeholder.100kmed.local`

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { rpps },
    })

    if (authError) {
      // Si l'email existe déjà, chercher l'user existant
      if (authError.message?.includes('already been registered')) {
        const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
        // Recherche directe par email
        const { data: userData } = await supabase.from('users').select('id').eq('rpps', rpps).maybeSingle()
        if (userData) {
          idMap['users'] = idMap['users'] || {}
          idMap['users'][u._fid] = userData.id
          userCount++
          if (userCount % 500 === 0) console.log(`  ... ${userCount}/${fbUsers.length}`)
          continue
        }
      }
      userErrors++
      if (userErrors <= 5) console.error(`  ⚠️ ${rpps}: ${authError.message}`)
      continue
    }

    const authUserId = authData.user.id
    idMap['users'] = idMap['users'] || {}
    idMap['users'][u._fid] = authUserId

    const { error: profileError } = await supabase.from('users').upsert({
      id: authUserId,
      rpps,
      nom: d.nom || null,
      prenom: d.prenom || null,
      pseudo: d.pseudo || null,
      email: d.contact?.email || null,
      role: (d.role || 'USER').toLowerCase() === 'user' ? 'medecin' : d.role?.toLowerCase(),
      annee_naissance: d.anneeNaissance || null,
      specialite: d.specialite || null,
      mode_exercice: d.modeExercice || null,
      densite_population: d.densitePopulation || null,
      niveau_outils_numeriques: d.niveauOutilsNumeriques || null,
      portrait: d.portrait || null,
      is_actif: d.isActif ?? true,
      is_complete: d.isComplete ?? false,
      gestion_accueil: d.gestionAccueil || null,
      contact_email: d.contact?.email || null,
      contact_telephone: d.contact?.telephone || null,
      contact_adresse: d.contact?.adresse || null,
      contact_cp: d.contact?.cp || null,
      contact_ville: d.contact?.ville || null,
      contact_pays: d.contact?.pays || null,
    })

    if (profileError) {
      if (userErrors <= 5) console.error(`  ⚠️ Profil ${rpps}: ${profileError.message}`)
      userErrors++
    }

    userCount++
    if (userCount % 500 === 0) console.log(`  ... ${userCount}/${fbUsers.length}`)
  }
  console.log(`  ✅ ${userCount} users (${userErrors} erreurs)`)

  // ═══════════════════════════════════════════════════════════
  // 13. USER-RELATED DATA
  // ═══════════════════════════════════════════════════════════

  // 13a. Evaluations
  console.log('⏳ 13a — Évaluations...')
  const evaluations: any[] = []
  for (const e of fbEvaluations) {
    const ev = e as any
    const userId = idMap['users']?.[ev.idUser]
    const solutionId = ev.idSolution ? idMap['solutions']?.[ev.idSolution] : null
    if (!userId || !solutionId) continue

    const remapped: Record<string, number | null> = {}
    if (ev.scores && typeof ev.scores === 'object') {
      for (const [cid, score] of Object.entries(ev.scores)) {
        const tech = critereIdToTech[cid]
        if (tech) remapped[tech] = toNumber(score)
      }
    }

    evaluations.push({
      id: getUuid('evaluations', e._fid),
      user_id: userId,
      solution_id: solutionId,
      scores: Object.keys(remapped).length > 0 ? remapped : (ev.scores || {}),
      moyenne_utilisateur: Math.min(toNumber(ev.moyenneUtilisateur) ?? 0, 9.99),
      temps_precedente_solution: ev.tempsPrecedenteSolution || null,
      last_date_note: toISOString(ev.lastDateNote) || toISOString(ev.creation),
      created_at: toISOString(ev.creation),
    })
  }
  // Dédupliquer: garder la dernière évaluation par (user_id, solution_id)
  const evalMap = new Map<string, any>()
  for (const ev of evaluations) {
    const key = `${ev.user_id}__${ev.solution_id}`
    evalMap.set(key, ev)
  }
  const dedupedEvals = [...evalMap.values()]
  console.log(`  ℹ️  ${evaluations.length} → ${dedupedEvals.length} après déduplication`)
  await insertBatch('evaluations', dedupedEvals)

  // 13b. Solutions utilisées
  console.log('⏳ 13b — Solutions utilisées...')
  const solUtil: any[] = []
  for (const su of fbSolutionsUtilisees) {
    const d = su as any
    const userId = idMap['users']?.[d.idUser]
    const solutionId = d.idSolution ? idMap['solutions']?.[d.idSolution] : null
    if (!userId || !solutionId) continue
    solUtil.push({
      id: getUuid('solUtil', su._fid),
      user_id: userId,
      solution_id: solutionId,
      statut_evaluation: d.statutEvaluation || null,
      date_debut: toDate(d.dateDebut),
    })
  }
  // Dédupliquer par (user_id, solution_id)
  const suMap = new Map<string, any>()
  for (const su of solUtil) { suMap.set(`${su.user_id}__${su.solution_id}`, su) }
  const dedupedSU = [...suMap.values()]
  console.log(`  ℹ️  ${solUtil.length} → ${dedupedSU.length} après déduplication`)
  await insertBatch('solutions_utilisees', dedupedSU)

  // 13c. Solutions favorites
  console.log('⏳ 13c — Favorites...')
  const favs: any[] = []
  for (const sf of fbSolutionsFavorites) {
    const d = sf as any
    const userId = idMap['users']?.[d.idUser]
    const solutionId = d.idSolution ? idMap['solutions']?.[d.idSolution] : null
    if (!userId || !solutionId) continue
    favs.push({ user_id: userId, solution_id: solutionId })
  }
  if (favs.length > 0) {
    const { error } = await supabase.from('solutions_favorites').upsert(favs, { onConflict: 'user_id,solution_id' })
    if (error) console.error('  ❌', error.message)
    else console.log(`  ✅ ${favs.length} favorites`)
  }

  // 13d. Users preferences
  console.log('⏳ 13d — Préférences users...')
  const uPrefs: any[] = []
  for (const u of fbUsers) {
    const d = u as any
    const userId = idMap['users']?.[u._fid]
    if (!userId || !Array.isArray(d.preferences)) continue
    for (const prefId of d.preferences) {
      const pid = idMap['preferences']?.[prefId]
      if (pid) uPrefs.push({ user_id: userId, preference_id: pid })
    }
  }
  if (uPrefs.length > 0) {
    const { error } = await supabase.from('users_preferences').upsert(uPrefs, { onConflict: 'user_id,preference_id' })
    if (error) console.error('  ❌', error.message)
    else console.log(`  ✅ ${uPrefs.length} prefs users`)
  }

  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60))
  console.log('🎉 Migration terminée !')
  console.log('='.repeat(60))
  console.log(`
  Éditeurs:       ${editeurs.length}
  Catégories:     ${categories.length}
  Solutions:      ${solutions.length}
  Tags:           ${tags.length}
  Solutions-Tags: ${solutionsTags.length}
  Galerie:        ${galerieRows.length}
  Critères:       ${criteres.length}
  Résultats:      ${resultats.length}
  Utilisateurs:   ${userCount} (${userErrors} erreurs)
  Évaluations:    ${evaluations.length}
  Sol. utilisées: ${solUtil.length}
  Favorites:      ${favs.length}
  Vidéos:         ${videos.length}
  Avatars:        ${avatars.length}
  `)
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale:', err)
  process.exit(1)
})
