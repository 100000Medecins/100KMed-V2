/**
 * Mail de lancement (`email_templates.lancement`) — source de vérité.
 *
 * Contenu seul, au format « fragment » (`<tr><td>…</td></tr>`) : buildEmail() l'injecte dans le
 * `master_layout` (logo animé, étiquette, carte blanche, pied « Gérer mes notifications »).
 * Ne pas éditer ce modèle avec l'éditeur visuel de l'admin : il réécrit le HTML (tableaux TipTap,
 * styles retirés), c'est ce qui l'avait cassé le 23/05/2026. Modifier ce fichier puis relancer.
 *
 * Variables : {{nom}} (« Dr. NOM » ou « Docteur », fourni par l'envoi), {{solution_nom}},
 * {{lien_1clic}}, {{lien_reevaluation}}. Le lien de désabonnement est dans le master_layout.
 *
 * Les articles et les illustrations des catégories sont relus en base (titre, adresse, image) :
 * le script s'arrête si un article n'est plus publié.
 *
 * Usage :
 *   npx tsx scripts/save-lancement-template.ts                        # dry-run
 *   npx tsx scripts/save-lancement-template.ts --preview <fichier>    # + aperçu HTML complet (données fictives)
 *   npx tsx scripts/save-lancement-template.ts --execute              # écrit (backup JSON avant)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import type { Database } from '../src/types/database'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const EXECUTE = process.argv.includes('--execute')
const iPreview = process.argv.indexOf('--preview')
const PREVIEW_PATH = iPreview > -1 ? process.argv[iPreview + 1] : null

const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const S = 'https://www.100000medecins.org'
const SUJET = 'Le nouveau 100 000 Médecins est là ✨'
const LABEL = 'Nouveau site'

// Articles mis en avant (ordre d'affichage) et accroche écrite pour le mail.
const ARTICLES: { slug: string; accroche: string }[] = [
  {
    slug: 'pro-sante-connect-le-sesame-numerique-que-personne-ne-vous-a-vraiment-explique',
    accroche: "Ordonnance numérique, Mon espace santé, téléservices de l'Assurance maladie : tout passe désormais par Pro Santé Connect. On vous explique enfin pourquoi, et comment.",
  },
  {
    slug: '46-heures-par-semaine-le-numerique-promettait-de-nous-liberer-il-nous-a-parfois-enchaines',
    accroche: "Le numérique devait nous faire gagner du temps. Alors pourquoi travaille-t-on encore 46 heures par semaine ? Bilan lucide d'une promesse à moitié tenue.",
  },
]

// Catégories en vignettes, puis celles citées en lien.
const CATEGORIES_VIGNETTES = ['agendas-medicaux', 'intelligence-artificielle-medecine', 'ia-documentaires']
const CATEGORIES_LIENS = ['logiciel-medical', 'teleconsultation', 'teletransmission', 'teleexpertise']
const LIBELLES_CATEGORIES: Record<string, string> = {
  'agendas-medicaux': 'Agendas',
  'intelligence-artificielle-medecine': 'IA scribes',
  'ia-documentaires': 'IA documentaires',
  'logiciel-medical': 'logiciel médical',
  teleconsultation: 'téléconsultation',
  teletransmission: 'télétransmission',
  teleexpertise: 'téléexpertise',
}

const VIDEO_URL = 'https://youtube.com/shorts/_wgV9Jq-OlY' // « Votre avis en 5 minutes aide 100 000 Médecins ! » (04/11/2026)

const MAILTO_SUBJECT = encodeURIComponent('Tu connais 100 000 Médecins ?')
const MAILTO_BODY = encodeURIComponent(
`Salut,

Je voulais te parler d'une plateforme que j'utilise : 100 000 Médecins.

Le principe : des médecins évaluent leurs logiciels (logiciel médical, agenda, dictée IA...), et ça permet à tout le monde de comparer sur la base de vrais retours de terrain, sans pub ni marketing.

Plus on est nombreux, plus c'est utile pour tous.

Jette un œil : ${S}

À bientôt,`
)

// ── Styles ────────────────────────────────────────────────────────────────────
// Le master_layout ne fixe pas de police : sans elle, certains lecteurs (et l'aperçu de l'admin)
// affichent du Times. Elle est donc posée sur chaque élément de texte.
const F = "font-family:Poppins,'Segoe UI',Helvetica,Arial,sans-serif;"
const NAVY = '#0f1e38'
const TEXTE = '#4A5568'
const DISCRET = '#6B7280'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function titreSection(texte: string, couleur: string): string {
  return `<tr><td style="padding:34px 40px 16px;">
  <p style="${F}margin:0;padding:0 0 8px;border-bottom:1px solid #E5E7EB;font-size:12px;font-weight:700;color:${couleur};text-transform:uppercase;letter-spacing:1.4px;">${texte}</p>
</td></tr>`
}

function lienFleche(href: string, texte: string, couleur = '#4A90D9'): string {
  return `<a href="${href}" style="${F}font-size:13px;font-weight:700;color:${couleur};text-decoration:none;white-space:nowrap;">${texte}&nbsp;&rarr;</a>`
}

function bouton(href: string, texte: string, plein: boolean): string {
  const style = plein
    ? `background:${NAVY};border:2px solid ${NAVY};color:#ffffff;`
    : `background:#ffffff;border:2px solid #CBD5E1;color:${NAVY};`
  return `<a href="${href}" style="${F}display:inline-block;${style}border-radius:12px;padding:11px 20px;margin:0 8px 8px 0;font-size:14px;font-weight:700;text-decoration:none;">${texte}</a>`
}

/** Étape de la frise « Ces derniers mois » : filet vertical continu, date, texte. */
function etape(date: string, contenu: string): string {
  return `<tr><td style="padding:0 40px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="border-left:3px solid #A7F3D0;padding:0 0 20px 18px;">
      <p style="${F}margin:0 0 4px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px;">${date}</p>
      ${contenu}
    </td>
  </tr></table>
</td></tr>`
}

const texteEtape = (html: string) => `<p style="${F}margin:0;font-size:14px;color:${TEXTE};line-height:1.7;">${html}</p>`
const fort = (texte: string) => `<strong style="color:${NAVY};">${texte}</strong>`

/** Ligne « pastille + texte » (nouveautés, participation). */
function ligneIcone(opts: { icone: string; fond: string; titre: string; texte: string; lien: string }): string {
  return `<tr><td style="padding:0 40px 18px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="44" valign="top" style="padding-top:2px;">
      <div style="width:40px;height:40px;border-radius:12px;background:${opts.fond};text-align:center;line-height:40px;font-size:20px;">${opts.icone}</div>
    </td>
    <td valign="top" style="padding-left:14px;">
      <p style="${F}margin:0 0 4px;font-size:15px;font-weight:700;color:${NAVY};line-height:1.4;">${opts.titre}</p>
      <p style="${F}margin:0 0 6px;font-size:13px;color:${TEXTE};line-height:1.7;">${opts.texte}</p>
      ${opts.lien}
    </td>
  </tr></table>
</td></tr>`
}

/** Miniature carrée recadrée par le service d'images d'origine (Unsplash, Pexels). */
function miniature(url: string, taille: number): string {
  const u = new URL(url)
  if (u.hostname === 'images.unsplash.com') {
    u.searchParams.set('fit', 'crop')
    u.searchParams.set('crop', 'entropy')
  } else if (u.hostname === 'images.pexels.com') {
    u.searchParams.set('fit', 'crop')
  } else {
    return url
  }
  u.searchParams.set('w', String(taille))
  u.searchParams.set('h', String(taille))
  return u.toString()
}

type Article = { titre: string; slug: string; image: string | null; accroche: string; rubrique: string }
type Categorie = { slug: string; nom: string; image: string | null }

function ligneArticle(a: Article): string {
  const href = `${S}/blog/${a.slug}`
  const image = a.image
    ? `<td width="80" valign="top" style="padding-right:14px;">
      <a href="${href}" style="text-decoration:none;"><img src="${esc(miniature(a.image, 160))}" alt="" width="80" height="80" style="display:block;width:80px;height:80px;border-radius:12px;border:0;" /></a>
    </td>`
    : ''
  return `<tr><td style="padding:0 40px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    ${image}
    <td valign="top">
      <p style="${F}margin:0 0 4px;font-size:11px;font-weight:700;color:#8A5CF6;text-transform:uppercase;letter-spacing:1px;">${esc(a.rubrique)}</p>
      <p style="${F}margin:0 0 6px;font-size:15px;font-weight:700;line-height:1.4;"><a href="${href}" style="color:${NAVY};text-decoration:none;">${esc(a.titre)}</a></p>
      <p style="${F}margin:0 0 6px;font-size:13px;color:${TEXTE};line-height:1.7;">${esc(a.accroche)}</p>
      ${lienFleche(href, "Lire l'article", '#8A5CF6')}
    </td>
  </tr></table>
</td></tr>`
}

function construireContenu(articles: Article[], vignettes: Categorie[], liens: Categorie[]): string {
  const lienCategorie = (c: Categorie) =>
    `<a href="${S}/solutions/${c.slug}" style="color:${NAVY};font-weight:600;text-decoration:underline;">${LIBELLES_CATEGORIES[c.slug] ?? c.nom}</a>`

  // Vignettes en blocs de 150 px qui passent à la ligne : 3 sur une ligne sur ordinateur, l'une
  // sous l'autre sur téléphone (3 colonnes fixes débordaient : « documentaires » ne tient pas à 375 px).
  // Outlook pour Windows ignore la largeur des blocs et les empile : rendu acceptable.
  const tuiles = vignettes.map((c) => `<div style="display:inline-block;vertical-align:top;width:150px;margin:0 0 14px;">
        <a href="${S}/solutions/${c.slug}" style="text-decoration:none;">
          ${c.image ? `<img src="${c.image}" alt="" width="76" style="display:block;margin:0 auto 8px;width:76px;height:auto;border:0;" />` : ''}
          <span style="${F}display:block;font-size:13px;font-weight:700;color:${NAVY};line-height:1.3;">${LIBELLES_CATEGORIES[c.slug] ?? c.nom}</span>
        </a>
      </div>`).join('')

  return [
    // ── Accueil ──
    `<tr><td style="padding:0 40px 4px;">
  <p style="${F}margin:0 0 8px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Les nouvelles de la plateforme</p>
  <h1 style="${F}margin:0 0 22px;font-size:25px;font-weight:800;color:${NAVY};line-height:1.25;letter-spacing:-0.4px;">Le nouveau 100&nbsp;000 Médecins est là&nbsp;✨</h1>
  <p style="${F}margin:0 0 12px;font-size:15px;font-weight:600;color:${NAVY};">Bonjour {{nom}},</p>
  <p style="${F}margin:0;font-size:14px;color:${TEXTE};line-height:1.8;">La plateforme a été entièrement refondue : nouveau design, nouvelles catégories de logiciels, nouveaux outils pour votre exercice. Voici l'essentiel : ce qui change sur le site, et ce que l'association a fait ces derniers mois.</p>
</td></tr>`,

    // ── Votre avis ──
    `<tr><td style="padding:24px 40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F7FD;border:1px solid #DCE7F7;border-radius:16px;">
    <tr><td style="padding:22px 24px 16px;">
      <p style="${F}margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">⭐&nbsp; Votre avis</p>
      <p style="${F}margin:0 0 8px;font-size:17px;font-weight:700;color:${NAVY};line-height:1.35;">Votre avis sur {{solution_nom}} est toujours en ligne</p>
      <p style="${F}margin:0 0 16px;font-size:14px;color:${TEXTE};line-height:1.75;">Vos confrères le lisent pour choisir leur logiciel. Toujours d'accord avec ce que vous aviez écrit&nbsp;? Deux clics suffisent pour le confirmer. Sinon, mettez-le à jour en quelques minutes.</p>
      ${bouton('{{lien_1clic}}', '✓&nbsp; Confirmer mon avis en 2 clics', true)}${bouton('{{lien_reevaluation}}', 'Le mettre à jour', false)}
    </td></tr>
  </table>
</td></tr>`,

    // ── Ces derniers mois (actions de l'association) ──
    // Faits relevés le 12/11/2026 : CHANGELOG (WONCA 21/07, IA DNS 01/08, portabilité 20-21/10),
    // page /portabilite, articles du blog, mail des syndicats (« l'association, c'est aussi »).
    titreSection('Ces derniers mois', '#059669'),
    `<tr><td style="padding:0 40px 18px;">
  <p style="${F}margin:0;font-size:14px;color:${TEXTE};line-height:1.75;">Pendant que le site changeait de peau, l'association a continué d'agir pour les médecins libéraux&nbsp;:</p>
</td></tr>`,
    etape('Mai – juin', texteEtape(
      `${fort('Prises de position')} sur le report de six mois du Ségur numérique (vague&nbsp;2) et sur la place de l'IA dans nos logiciels métier. ${lienFleche(`${S}/blog`, 'Sur le blog', '#059669')}`,
    )),
    etape('Début juillet', texteEtape(
      `${fort('Congrès WONCA Europe')}&nbsp;: 56&nbsp;médecins ont évalué leurs logiciels sur notre stand. Bravo aux trois gagnantes du jeu concours&nbsp;!`,
    )),
    etape('20 juillet', texteEtape(
      `${fort('Appel pour la portabilité des données')}, avec six syndicats de médecins&nbsp;: chaque éditeur doit rendre ses données au médecin qui le demande, sans attendre 2027.`,
    )),
    etape('Août', texteEtape(
      `${fort('IA et données de santé')}&nbsp;: à la demande de la Délégation au numérique en santé, la page des IA documentaires rappelle le cadre d'usage de l'IA avant de choisir un outil.`,
    )),
    etape('19 octobre', `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #D1FAE5;border-radius:16px;background:#F0FDF8;">
        <tr><td style="padding:20px 22px;">
          <p style="${F}margin:0 0 8px;font-size:17px;font-weight:700;color:${NAVY};line-height:1.35;">🔓&nbsp; Cinq éditeurs s'engagent&nbsp;: changer de logiciel sans perdre ses dossiers</p>
          <p style="${F}margin:0 0 14px;font-size:14px;color:${TEXTE};line-height:1.75;">En réponse à notre appel, cinq éditeurs s'engagent à vous rendre vos données à la demande&nbsp;: un export ${fort('gratuit')}, livré ${fort('sous 30&nbsp;jours')}, ${fort('complet et documenté')}.</p>
          <a href="${S}/portabilite" style="${F}display:inline-block;background:#10B981;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">Voir les éditeurs engagés&nbsp;&rarr;</a>
        </td></tr>
      </table>`),
    `<tr><td style="padding:6px 40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:16px;">
    <tr><td style="padding:20px 24px 12px;">
      <p style="${F}margin:0 0 10px;font-size:14px;font-weight:700;color:${NAVY};">Et toute l'année, l'association, c'est aussi&nbsp;:</p>
      ${[
        `la ${fort('représentation des médecins libéraux')} dans les groupes de travail de la DNS (Ségur), de l'ANS (Mailiz, CPS…) et de l'Assurance maladie (Amelipro)&nbsp;;`,
        `le ${fort('Collège des Médecins Geeks')}, notre think-tank, qui impulse et accompagne nos actions&nbsp;;`,
        `des ${fort("formations à l'e-santé")} dans les départements de médecine générale, des stands et des conférences dans les congrès.`,
      ].map((t) => `<table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="16" valign="top" style="${F}font-size:14px;line-height:1.7;color:#10B981;">&bull;</td>
        <td valign="top" style="padding:0 0 8px;"><p style="${F}margin:0;font-size:13px;color:${TEXTE};line-height:1.7;">${t}</p></td>
      </tr></table>`).join('\n      ')}
    </td></tr>
  </table>
</td></tr>`,

    // ── Articles ──
    titreSection('Nos derniers articles', '#8A5CF6'),
    ...articles.map(ligneArticle),
    `<tr><td style="padding:0 40px 4px;">${lienFleche(`${S}/blog`, 'Tous les articles', '#8A5CF6')}</td></tr>`,

    // ── Nouveautés ──
    titreSection('Nouveau sur la plateforme', '#4A90D9'),
    `<tr><td style="padding:0 40px 6px;">
  <p style="${F}margin:0 0 16px;font-size:14px;color:${TEXTE};line-height:1.75;"><strong style="color:${NAVY};">7 catégories</strong> pour comparer vos outils avec les avis de vos confrères, dont&nbsp;:</p>
  <div style="text-align:center;font-size:0;line-height:0;">${tuiles}</div>
  <p style="${F}margin:2px 0 22px;font-size:13px;color:${DISCRET};line-height:1.7;">Et aussi&nbsp;: ${liens.map(lienCategorie).join(', ')}.</p>
</td></tr>`,
    ligneIcone({
      icone: '🧮',
      fond: '#FEF3C7',
      titre: 'Prévisionnel maison de santé',
      texte: "Un projet de maison de santé&nbsp;? Montez votre budget prévisionnel (équipe, charges, résultats), exportez-le en PDF et partagez-le en lecture seule avec votre comptable ou votre banque.",
      lien: lienFleche(`${S}/outils/previsionnel-maison-de-sante`, "Ouvrir l'outil"),
    }),

    // ── Participer ──
    titreSection('À vous de jouer', '#E8734A'),
    ligneIcone({
      icone: '📝',
      fond: '#FFEDE5',
      titre: 'Évaluez vos autres outils',
      texte: "Agenda, IA scribe, téléconsultation… Chaque avis aide un confrère à bien choisir. Comptez cinq minutes.",
      lien: `${lienFleche(`${S}/solution/noter`, 'Évaluer un logiciel', '#E8734A')}<span style="${F}font-size:13px;color:#CBD5E1;"> &nbsp;·&nbsp; </span>${lienFleche(VIDEO_URL, '▶ La vidéo', '#E8734A')}`,
    }),
    ligneIcone({
      icone: '🔬',
      fond: '#ECFDF5',
      titre: 'Études cliniques',
      texte: "Des études en santé numérique cherchent des médecins de terrain. Activez l'alerte dans votre compte pour être prévenu des prochaines.",
      lien: lienFleche(`${S}/mon-compte/etudes-cliniques`, 'Voir les études', '#10B981'),
    }),

    // ── Partage ──
    `<tr><td style="padding:16px 40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:16px;">
    <tr><td style="padding:20px 24px;">
      <p style="${F}margin:0 0 6px;font-size:15px;font-weight:700;color:${NAVY};">📢&nbsp; Un confrère devrait connaître la plateforme&nbsp;?</p>
      <p style="${F}margin:0 0 14px;font-size:13px;color:${TEXTE};line-height:1.7;">La force de 100&nbsp;000 Médecins, c'est le nombre. Transmettez-lui ce message en un clic.</p>
      <a href="mailto:?subject=${MAILTO_SUBJECT}&amp;body=${MAILTO_BODY}" style="${F}display:inline-block;background:#F5A623;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;color:${NAVY};text-decoration:none;">✉️&nbsp; Transférer à un confrère</a>
    </td></tr>
  </table>
</td></tr>`,

    // ── Signature ──
    `<tr><td style="padding:28px 40px 40px;">
  <p style="${F}margin:0;font-size:14px;color:${TEXTE};line-height:1.75;">Merci de faire vivre la plateforme,<br><strong style="color:${NAVY};">L'équipe 100&nbsp;000 Médecins</strong></p>
</td></tr>`,
  ].join('\n')
}

// Même composition que buildEmail() (src/lib/actions/emailTemplates.ts), avec des données fictives.
function apercu(layout: string, contenu: string): string {
  const vars: Record<string, string> = {
    nom: 'Dr. DUPONT',
    solution_nom: 'MonLogiciel Pro',
    lien_1clic: '#',
    lien_reevaluation: '#',
    lien_desabonnement: '#',
  }
  let html = layout.replace(/\{\{contenu\}\}/g, contenu).replace(/\{\{label\}\}/g, LABEL)
  for (const [k, v] of Object.entries(vars)) html = html.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
  return html
}

async function main() {
  // Articles : publiés uniquement, relus en base.
  const { data: rowsArticles, error: eA } = await supabase
    .from('articles')
    .select('titre, slug, image_couverture, statut, categorie:articles_categories(nom)')
    .in('slug', ARTICLES.map((a) => a.slug))
  if (eA) throw eA
  const articles: Article[] = ARTICLES.map(({ slug, accroche }) => {
    const r = rowsArticles?.find((x) => x.slug === slug)
    if (!r) throw new Error(`Article introuvable : ${slug}`)
    if (r.statut !== 'publié') throw new Error(`Article non publié (${r.statut}) : ${slug}`)
    const rubrique = (r.categorie as { nom: string } | null)?.nom ?? 'Article'
    return { titre: r.titre, slug, image: r.image_couverture, accroche, rubrique }
  })

  const slugsCat = [...CATEGORIES_VIGNETTES, ...CATEGORIES_LIENS]
  const { data: rowsCat, error: eC } = await supabase
    .from('categories')
    .select('slug, nom, image_url, actif')
    .in('slug', slugsCat)
  if (eC) throw eC
  const cat = (slug: string): Categorie => {
    const r = rowsCat?.find((x) => x.slug === slug)
    if (!r || !r.actif) throw new Error(`Catégorie absente ou inactive : ${slug}`)
    return { slug, nom: r.nom, image: r.image_url }
  }

  const contenu = construireContenu(articles, CATEGORIES_VIGNETTES.map(cat), CATEGORIES_LIENS.map(cat))

  const { data: actuel, error: eT } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', 'lancement')
    .single()
  if (eT) throw eT

  console.log(`Modèle actuel : ${actuel.contenu_html.length} caractères, màj ${actuel.updated_at}`)
  console.log(`Nouveau modèle : ${contenu.length} caractères, sujet « ${SUJET} », étiquette « ${LABEL} »`)
  console.log(`Articles : ${articles.map((a) => a.titre).join(' | ')}`)

  if (PREVIEW_PATH) {
    const { data: layout, error: eL } = await supabase
      .from('email_templates').select('contenu_html').eq('id', 'master_layout').single()
    if (eL) throw eL
    fs.writeFileSync(PREVIEW_PATH, apercu(layout.contenu_html, contenu), 'utf-8')
    console.log(`Aperçu écrit : ${PREVIEW_PATH}`)
  }

  if (!EXECUTE) {
    console.log('\nDry-run : rien écrit. Relancer avec --execute pour enregistrer.')
    return
  }

  const dossier = path.resolve(__dirname, '../backups')
  fs.mkdirSync(dossier, { recursive: true })
  const fichier = path.join(dossier, `modele-lancement-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(fichier, JSON.stringify(actuel, null, 2), 'utf-8')
  console.log(`Backup : ${fichier}`)

  const { error: eU } = await supabase
    .from('email_templates')
    .update({ sujet: SUJET, contenu_html: contenu, label: LABEL, updated_at: new Date().toISOString() })
    .eq('id', 'lancement')
  if (eU) throw eU

  const { data: relu, error: eR } = await supabase
    .from('email_templates').select('sujet, contenu_html, label').eq('id', 'lancement').single()
  if (eR) throw eR
  const ok = relu.contenu_html === contenu && relu.sujet === SUJET && relu.label === LABEL
  console.log(ok ? 'Écrit et relu identique.' : 'ÉCART à la relecture : vérifier la ligne en base.')
  if (!ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
