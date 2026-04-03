'use server'

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import sgMail from '@sendgrid/mail'

interface CritereScore {
  id: string
  identifiantTech: string
  type: string // 'note', 'nps', etc.
  value: string | number
}

/**
 * Soumet les scores d'évaluation pour une solution.
 * Remplace : mutation setScoresSolution + updateEvaluation + updateResultats
 *
 * Logique métier clé :
 * 1. Stocke les scores de l'utilisateur dans `evaluations.scores` (JSONB)
 * 2. Pour chaque critère, met à jour le résultat agrégé dans `resultats`
 *    - Moyenne incrémentale : ((avg * n) - oldNote + newNote) / n
 *    - NPS : ((promoteurs/total) - (détracteurs/total)) * 100
 */
export async function submitScores(
  solutionId: string,
  step: string,
  criteres: CritereScore[]
) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // 1. Mettre à jour l'évaluation utilisateur
  const { data: evalRows } = await supabase
    .from('evaluations')
    .select('*')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  const existingEval = evalRows && evalRows.length > 0 ? evalRows[0] : null
  const existingScores = (existingEval?.scores as Record<string, string | number> | null) ?? {}

  // Fusionner les nouveaux scores
  const updatedScores = { ...existingScores }
  for (const critere of criteres) {
    updatedScores[critere.identifiantTech] = critere.value
  }

  if (existingEval) {
    await supabase
      .from('evaluations')
      .update({
        scores: updatedScores,
        last_date_note: new Date().toISOString(),
      })
      .eq('id', existingEval.id)
  } else {
    await supabase.from('evaluations').insert({
      user_id: user.id,
      solution_id: solutionId,
      scores: updatedScores,
      last_date_note: new Date().toISOString(),
    })
  }

  // 2. Mettre à jour les résultats agrégés pour chaque critère
  for (const critere of criteres) {
    await updateResultat(solutionId, user.id, critere, existingScores)
  }

  // 3. Si step === 'general', recalculer la moyenne globale utilisateurs
  if (step === 'general') {
    await updateMoyenneGlobale(solutionId, user.id)
  }

  revalidatePath(`/solutions`)
  return { status: 'SUCCESS' }
}

/**
 * Met à jour un résultat agrégé pour un critère.
 * Porte la logique de : Backend-main/.../Mutation/Resultat/updateResultats.ts
 */
async function updateResultat(
  solutionId: string,
  userId: string,
  critere: CritereScore,
  existingScores: Record<string, string | number>
) {
  const supabase = await createServerClient()

  // Chercher le résultat existant
  const { data: resultat } = await supabase
    .from('resultats')
    .select('*')
    .eq('solution_id', solutionId)
    .eq('critere_id', critere.id)
    .single()

  const notes = (resultat?.notes as Record<string, number>) || {}
  const oldNote = notes[userId]
  const newNote = typeof critere.value === 'string' ? parseFloat(critere.value) : critere.value

  if (isNaN(newNote)) return

  notes[userId] = newNote
  const nbNotes = Object.keys(notes).length

  if (critere.type === 'nps') {
    // Calcul NPS
    const repartition = (resultat?.repartition as Record<string, number>) || {}

    // Retirer l'ancienne valeur de la répartition
    if (oldNote !== undefined) {
      const oldKey = String(oldNote)
      if (repartition[oldKey]) repartition[oldKey]--
    }

    // Ajouter la nouvelle valeur
    const newKey = String(newNote)
    repartition[newKey] = (repartition[newKey] || 0) + 1

    // Calculer le NPS : ((promoteurs/total) - (détracteurs/total)) * 100
    const total = Object.values(repartition).reduce((sum, v) => sum + v, 0)
    let promoteurs = 0
    let detracteurs = 0

    for (const [score, count] of Object.entries(repartition)) {
      const s = parseInt(score)
      if (s >= 9) promoteurs += count
      else if (s <= 6) detracteurs += count
    }

    const nps = total > 0 ? ((promoteurs / total) - (detracteurs / total)) * 100 : 0

    const updateData = {
      solution_id: solutionId,
      critere_id: critere.id,
      notes,
      nb_notes: nbNotes,
      nps: Math.round(nps * 100) / 100,
      repartition,
    }

    if (resultat) {
      await supabase.from('resultats').update(updateData).eq('id', resultat.id)
    } else {
      await supabase.from('resultats').insert(updateData)
    }
  } else {
    // Calcul de la moyenne incrémentale pour les notes classiques
    let moyenne: number

    if (resultat && oldNote !== undefined) {
      // Mise à jour : ((avg * n) - oldNote + newNote) / n
      const currentMoyenne = resultat.moyenne_utilisateurs || 0
      moyenne = ((currentMoyenne * nbNotes) - oldNote + newNote) / nbNotes
    } else if (resultat) {
      // Nouvelle note : ((avg * (n-1)) + newNote) / n
      const currentMoyenne = resultat.moyenne_utilisateurs || 0
      const previousN = nbNotes - 1
      moyenne = previousN > 0 ? ((currentMoyenne * previousN) + newNote) / nbNotes : newNote
    } else {
      moyenne = newNote
    }

    // Conversion en base 5 (si la note est sur 10)
    const moyenneBase5 = Math.round((moyenne / 2) * 100) / 100

    const updateData = {
      solution_id: solutionId,
      critere_id: critere.id,
      notes,
      nb_notes: nbNotes,
      moyenne_utilisateurs: Math.round(moyenne * 100) / 100,
      moyenne_utilisateurs_base5: moyenneBase5,
    }

    if (resultat) {
      await supabase.from('resultats').update(updateData).eq('id', resultat.id)
    } else {
      await supabase.from('resultats').insert(updateData)
    }
  }
}

/**
 * Recalcule la moyenne globale des utilisateurs pour une solution.
 * Remplace : updateMoyenneUtilisateursResultat
 */
async function updateMoyenneGlobale(solutionId: string, userId: string) {
  const supabase = await createServerClient()

  // Récupérer l'évaluation de l'utilisateur
  const { data: evaluation } = await supabase
    .from('evaluations')
    .select('scores')
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
    .single()

  if (!evaluation?.scores) return

  const scores = evaluation.scores as Record<string, string | number>
  const numericScores = Object.values(scores)
    .map((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .filter((v) => !isNaN(v))

  if (numericScores.length === 0) return

  const moyenne =
    numericScores.reduce((sum, v) => sum + v, 0) / numericScores.length

  await supabase
    .from('evaluations')
    .update({ moyenne_utilisateur: Math.round(moyenne * 100) / 100 })
    .eq('solution_id', solutionId)
    .eq('user_id', userId)
}

/**
 * Initialise une session d'évaluation.
 * Remplace : mutation setupEvaluation
 */
export async function setupEvaluation(
  solutionId: string,
  categorieId: string,
  timeUsed: string,
  solutionPrecedenteId?: string
) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Créer ou mettre à jour la solution utilisée
  const { data: existing } = await supabase
    .from('solutions_utilisees')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('solutions_utilisees').insert({
      user_id: user.id,
      solution_id: solutionId,
      statut_evaluation: 'instanciee',
      date_debut: new Date().toISOString().split('T')[0],
      solution_precedente_id: solutionPrecedenteId || null,
    })
  }

  // Créer l'évaluation si elle n'existe pas
  const { data: existingEval } = await supabase
    .from('evaluations')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .single()

  if (!existingEval) {
    await supabase.from('evaluations').insert({
      user_id: user.id,
      solution_id: solutionId,
      scores: {},
      temps_precedente_solution: timeUsed,
    })
  }

  return { status: 'SUCCESS' }
}

/**
 * Finalise une évaluation.
 * Remplace : mutation setEvaluationFinalisee
 */
export async function finalizeEvaluation(solutionId: string) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Mettre à jour le statut de la solution utilisée
  await supabase
    .from('solutions_utilisees')
    .update({ statut_evaluation: 'finalisee' })
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)

  // Mettre à jour la date de dernière note
  await supabase
    .from('evaluations')
    .update({ last_date_note: new Date().toISOString() })
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)

  // TODO: Envoyer un email de notification (remplacer SendGrid)
  // La logique d'envoi d'email sera ajoutée ultérieurement

  revalidatePath(`/solutions`)
  return { status: 'SUCCESS' }
}

/**
 * Soumet une évaluation complète pour une solution (formulaire simplifié).
 * Utilise le service role pour bypasser le RLS.
 */
export async function submitEvaluation(
  solutionId: string,
  scores: Record<string, number | string | null>,
  moyenne: number,
  dateDebut?: string | null,
  dateFin?: string | null
) {
  // Vérifier l'authentification via le server client (avec cookies)
  const authClient = await createServerClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  // Utiliser le service role pour les écritures (bypass RLS)
  const supabase = createServiceRoleClient()

  // S'assurer que le profil utilisateur existe dans public.users
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      pseudo: user.email?.split('@')[0] || 'Utilisateur',
    })
  }

  // Vérifier si une évaluation existe déjà
  const { data: existingEvals } = await supabase
    .from('evaluations')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  const existingEval = existingEvals?.[0]

  // Gérer la solution_utilisee (créer ou mettre à jour)
  const { data: existingSU } = await supabase
    .from('solutions_utilisees')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('user_id', user.id)
    .limit(1)

  if (!existingSU || existingSU.length === 0) {
    await supabase.from('solutions_utilisees').insert({
      user_id: user.id,
      solution_id: solutionId,
      statut_evaluation: 'finalisee',
      date_debut: dateDebut || new Date().toISOString().split('T')[0],
      date_fin: dateFin || null,
    })
  } else {
    await supabase
      .from('solutions_utilisees')
      .update({
        statut_evaluation: 'finalisee',
        ...(dateDebut ? { date_debut: dateDebut } : {}),
        date_fin: dateFin || null,
      })
      .eq('id', existingSU[0].id)
  }

  if (existingEval) {
    const { error } = await supabase
      .from('evaluations')
      .update({
        scores,
        moyenne_utilisateur: Math.round(moyenne * 100) / 100,
        last_date_note: new Date().toISOString(),
      })
      .eq('id', existingEval.id)
    if (error) throw new Error(error.message)
  } else {
    // Créer l'évaluation
    const { error } = await supabase.from('evaluations').insert({
      user_id: user.id,
      solution_id: solutionId,
      scores,
      moyenne_utilisateur: Math.round(moyenne * 100) / 100,
      last_date_note: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/solutions')
  return { status: 'SUCCESS' }
}

/**
 * Soumet une évaluation pour un utilisateur anonyme (non connecté).
 * L'évaluation reste en attente jusqu'à vérification PSC.
 */
export async function submitEvaluationAnonyme(
  solutionId: string,
  scores: Record<string, number | string | null>,
  moyenne: number,
  emailTemp: string,
  dateDebut?: string | null,
  dateFin?: string | null
) {
  const supabase = createServiceRoleClient()
  const tokenVerification = randomUUID()
  const emailNormalise = emailTemp.toLowerCase().trim()

  // Vérifier si une évaluation en attente existe déjà pour cet email + solution
  const { data: existing } = await supabase
    .from('evaluations')
    .select('id')
    .eq('solution_id', solutionId)
    .eq('email_temp', emailNormalise)
    .eq('statut', 'en_attente_psc')
    .limit(1)

  const scoresFinaux: Record<string, number | string | null> = { ...scores }
  if (dateDebut) scoresFinaux.date_debut = dateDebut
  if (dateFin) scoresFinaux.date_fin = dateFin

  if (existing && existing.length > 0) {
    // Mettre à jour l'évaluation existante en attente
    await supabase
      .from('evaluations')
      .update({
        scores: scoresFinaux,
        moyenne_utilisateur: Math.round(moyenne * 100) / 100,
        last_date_note: new Date().toISOString(),
        token_verification: tokenVerification,
      })
      .eq('id', existing[0].id)
  } else {
    const { error } = await supabase.from('evaluations').insert({
      solution_id: solutionId,
      scores: scoresFinaux,
      moyenne_utilisateur: Math.round(moyenne * 100) / 100,
      last_date_note: new Date().toISOString(),
      statut: 'en_attente_psc',
      email_temp: emailNormalise,
      token_verification: tokenVerification,
    })
    if (error) throw new Error(error.message)
  }

  // Récupérer le template email
  const { data: template } = await supabase
    .from('email_templates')
    .select('sujet, contenu_html')
    .eq('id', 'verification_psc')
    .single()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const pscLink = `${siteUrl}/api/auth/psc-initier?token=${tokenVerification}`

  const sujet = template?.sujet || 'Validez votre évaluation sur 100 000 Médecins'
  const contenuHtml = (template?.contenu_html || '').replace('{{psc_link}}', pscLink)

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  await sgMail.send({
    to: emailTemp,
    from: 'contact@100000medecins.org',
    subject: sujet,
    html: contenuHtml,
  })

  return { status: 'SUCCESS' }
}
