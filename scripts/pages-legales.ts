/**
 * Pages légales (2026-09-30) : création de « Mentions légales », réécriture de la
 * « Charte de confidentialité et cookies » (/rgpd), charte à jour remise sur /transparence.
 *
 * Contexte : le site n'avait pas de mentions légales, et /rgpd affichait la Charte de
 * transparence (sa version à jour, enregistrée là par erreur) au lieu d'une politique de
 * confidentialité, pendant que /transparence restait sur l'ancienne version. Ces pages sont
 * liées depuis messagerie.100000medecins.org (URL du service déclarée à l'ANS).
 *
 * Contenu décrivant l'existant vérifié dans le code et en base (données, prestataires,
 * cookies, suppression de compte). Durées de conservation appliquées par le cron
 * /api/cron/purge-donnees.
 *
 * Filets : dry-run par défaut, `--execute` requis, backup JSON de l'état AVANT écriture.
 * Chaque UPDATE est aussi historisé par le trigger audit_pages_statiques
 * (restaurable depuis /admin/pages).
 * ⚠️ À exécuter AVANT de déployer la route /mentions-legales : la page est prérendue au
 * build et échoue si la ligne n'existe pas.
 *
 * Usage : npx tsx scripts/pages-legales.ts            # dry-run
 *         npx tsx scripts/pages-legales.ts --execute  # écrit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const MENTIONS_LEGALES = `<h2>Éditeur</h2>
<p>Le site www.100000medecins.org et ses sous-domaines, dont messagerie.100000medecins.org, sont édités par l'association 100 000 Médecins, association régie par la loi du 1er juillet 1901, enregistrée au Répertoire national des associations sous le numéro W922016423.</p>
<p>Siège : 23 rue de Fontarabie, 75020 Paris<br>Contact : <a href="mailto:contact@100000medecins.org">contact@100000medecins.org</a></p>
<h2>Directeur de la publication</h2>
<p>David Azerad, président de l'association.</p>
<h2>Hébergement</h2>
<p>Site : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis (vercel.com).<br>Base de données : Supabase Inc. (supabase.com), serveurs situés en Irlande (Union européenne).</p>
<h2>Propriété intellectuelle</h2>
<p>Voir l'article 6 des <a href="/cgu">conditions générales d'utilisation</a>.</p>
<h2>Données personnelles</h2>
<p>Voir la <a href="/rgpd">charte de confidentialité et cookies</a>.</p>`

const PARAGRAPHE_VIDEOS =
  "Vidéos : les vidéos YouTube sont diffusées en mode « confidentialité renforcée » (youtube-nocookie.com) et les vidéos Vimeo sans suivi. Aucun cookie n'est déposé à l'affichage de la page ; ces services peuvent en déposer lorsque vous lancez une vidéo."

const CONFIDENTIALITE = `<p><em>Dernière mise à jour : 30 septembre 2026</em></p>
<h2>Responsable du traitement</h2>
<p>L'association 100 000 Médecins, 23 rue de Fontarabie, 75020 Paris — <a href="mailto:contact@100000medecins.org">contact@100000medecins.org</a>. Voir aussi les <a href="/mentions-legales">mentions légales</a>.</p>
<h2>Données traitées</h2>
<ul>
<li>Compte : nom, prénom, numéro RPPS, spécialité et mode d'exercice (transmis par Pro Santé Connect lors de la connexion), adresse e-mail, et les informations de profil facultatives que vous choisissez de renseigner.</li>
<li>Évaluations et avis sur les logiciels, logiciels utilisés et favoris.</li>
<li>Préférences de notification.</li>
<li>Journaux techniques de connexion et d'activité, pour la sécurité et le diagnostic.</li>
</ul>
<p>Les messages envoyés via le formulaire de contact sont transmis par e-mail à l'association ; ils ne sont pas conservés sur le site.</p>
<h2>Finalités et bases légales</h2>
<ul>
<li>Gérer votre compte, vérifier votre qualité de professionnel de santé et publier vos évaluations : exécution des <a href="/cgu">conditions générales d'utilisation</a>.</li>
<li>Vous adresser les e-mails liés à votre compte et à vos évaluations (relances, annonces) : intérêt légitime de l'association. Vous pouvez les désactiver à tout moment dans <a href="/mon-compte/mes-notifications">Mon compte &gt; Mes notifications</a> ou via le lien présent dans chaque e-mail.</li>
<li>Vous informer des études cliniques et des questionnaires de thèse : votre consentement, que vous donnez en activant ces options.</li>
<li>Assurer la sécurité et le bon fonctionnement du site : intérêt légitime.</li>
</ul>
<h2>Publication de vos avis</h2>
<p>Vos avis sont publiés sous votre pseudo ou, à défaut, sous votre prénom suivi de l'initiale de votre nom, avec l'avatar choisi, votre spécialité et votre mode d'exercice. Votre adresse e-mail et votre numéro RPPS ne sont jamais publiés.</p>
<h2>Destinataires</h2>
<p>Vos données sont destinées à l'association 100 000 Médecins. Elles ne sont ni vendues ni cédées.</p>
<p>Elles sont traitées pour notre compte par nos prestataires techniques : Vercel (hébergement du site, États-Unis), Supabase (base de données et authentification, serveurs situés en Irlande) et Twilio SendGrid (envoi des e-mails, États-Unis). Les transferts hors de l'Union européenne sont encadrés par le Data Privacy Framework ou par les clauses contractuelles types de la Commission européenne.</p>
<p>Si vous demandez des informations sur une étude clinique, vos nom, prénom, spécialité et adresse e-mail sont transmis au partenaire qui la conduit (Digital Medical Hub).</p>
<p>La connexion par Pro Santé Connect est opérée par l'Agence du Numérique en Santé, selon ses propres conditions.</p>
<h2>Durées de conservation</h2>
<ul>
<li>Données du compte : jusqu'à la suppression de votre compte, possible à tout moment depuis <a href="/mon-compte/profil">Mon compte</a>. Vos avis sont alors supprimés ou anonymisés, selon votre choix.</li>
<li>Journaux techniques : 12 mois.</li>
<li>Trace d'une suppression de compte (nom, prénom, spécialité, date et motif éventuel) : 3 ans.</li>
</ul>
<h2>Vos droits</h2>
<p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur vos données. La plupart peuvent être modifiées directement dans votre compte ; pour le reste, écrivez à <a href="mailto:contact@100000medecins.org">contact@100000medecins.org</a>. Vous pouvez également adresser une réclamation à la CNIL (<a href="https://www.cnil.fr">www.cnil.fr</a>).</p>
<h2>Cookies</h2>
<ul>
<li>Cookies nécessaires, exemptés de consentement : maintien de votre session de connexion et sécurisation de la connexion Pro Santé Connect (10 minutes).</li>
<li>Mesure d'audience : Vercel Web Analytics, statistiques de fréquentation agrégées, sans cookie.</li>
<li>${PARAGRAPHE_VIDEOS}</li>
</ul>
<p>Le site n'utilise aucun cookie publicitaire.</p>`

// /transparence : la version à jour de la charte (Next.js, code public sur GitHub) avait été
// enregistrée par erreur dans /rgpd le 2026-03-31 ; /transparence était restée sur l'ancienne.
// On la reprend telle quelle, avec 3 retouches seulement. Chaque motif doit être trouvé,
// sinon le script s'arrête (texte modifié entre-temps).
const RETOUCHES_CHARTE: [string, string][] = [
  // Titre en doublon avec le <h1> de la page
  ['<p><strong>Charte de transparence de 100000medecins.org</strong></p>', ''],
  // Hébergeur : Gandi → Vercel (la base est mentionnée plus bas dans le même paragraphe)
  [
    'Le site internet est hébergé en France par Gandi SAS, Société par Actions Simplifiée au capital de 630 000 € ayant son siège social au 63-65 boulevard Masséna 75013 Paris.',
    'Le site internet est hébergé par Vercel Inc. (États-Unis).',
  ],
  [
    "Quand à la base de données, elle hébergée sur Supabase et administrée par l'Association",
    "Quant à la base de données, elle est hébergée sur Supabase (serveurs situés en Irlande) et administrée par l'Association",
  ],
]

async function lire(slug: string) {
  const { data, error } = await supabase.from('pages_statiques').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

async function main() {
  console.log(`\n=== Pages légales — ${EXECUTE ? 'EXECUTE (écriture)' : 'DRY-RUN (aucune écriture)'} ===`)

  const [mentions, rgpd, transparence] = await Promise.all([lire('mentions-legales'), lire('rgpd'), lire('transparence')])
  if (!rgpd || !transparence) throw new Error('Page rgpd ou transparence introuvable')

  // La charte à jour se lit dans /rgpd tant que ce script ne l'a pas écrasée. Relance après
  // exécution : /transparence contient déjà la version Next.js → rien à refaire.
  const transparenceDejaAJour = (transparence.contenu ?? '').includes('Next.JS')
  let nouvelleCharte: string | null = null
  if (!transparenceDejaAJour) {
    let charte = rgpd.contenu ?? ''
    if (!charte.includes('Next.JS')) throw new Error('Charte à jour introuvable dans /rgpd : à revoir')
    for (const [avant, apres] of RETOUCHES_CHARTE) {
      if (!charte.includes(avant)) throw new Error(`Motif introuvable dans la charte : « ${avant.slice(0, 60)}… »`)
      charte = charte.replace(avant, apres)
    }
    nouvelleCharte = charte
  }

  console.log(`mentions-legales : ${mentions ? 'existe déjà → mise à jour' : 'absente → création'} (${MENTIONS_LEGALES.length} car.)`)
  console.log(`rgpd             : contenu ${rgpd.contenu?.length ?? 0} → ${CONFIDENTIALITE.length} car. (titre inchangé : « ${rgpd.titre} »)`)
  console.log(`transparence     : ${nouvelleCharte ? `version Next.js reprise de /rgpd (${transparence.contenu?.length ?? 0} → ${nouvelleCharte.length} car.)` : 'déjà à jour → rien à faire'}`)

  if (!EXECUTE) {
    console.log('\nDry-run terminé. Relancer avec --execute pour écrire.')
    return
  }

  const dir = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dir, { recursive: true })
  const backup = path.join(dir, `pages-legales-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backup, JSON.stringify({ mentions, rgpd, transparence }, null, 2))
  console.log(`\nBackup : ${backup}`)

  if (mentions) {
    const { error } = await supabase.from('pages_statiques').update({ contenu: MENTIONS_LEGALES }).eq('id', mentions.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('pages_statiques').insert({
      slug: 'mentions-legales',
      titre: 'Mentions légales',
      contenu: MENTIONS_LEGALES,
      meta_description: 'Mentions légales du site 100000medecins.org',
    })
    if (error) throw error
  }
  console.log('mentions-legales : OK')

  // /transparence AVANT /rgpd : sa nouvelle version est tirée de l'actuel /rgpd.
  if (nouvelleCharte) {
    const { error: e2 } = await supabase.from('pages_statiques').update({ contenu: nouvelleCharte }).eq('id', transparence.id)
    if (e2) throw e2
  }
  console.log('transparence     : OK')

  const { error: e1 } = await supabase.from('pages_statiques').update({ contenu: CONFIDENTIALITE }).eq('id', rgpd.id)
  if (e1) throw e1
  console.log('rgpd             : OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
