// Design canonique pour tous les templates email — design validé sur relance_1an
// Logos rognés sur Supabase Storage (sans espace transparent → alignement garanti)
// Centrage via align="center" sur la TABLE (pas le td) → évite le cascade text-align:center
// Usage : node scripts/bake-logo-in-templates.mjs

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'])

const S   = 'https://www.100000medecins.org'
const BG  = `background-color:#0f1e38;background-image:radial-gradient(ellipse 55% 45% at 52% 6%,rgba(74,144,217,0.65) 0%,transparent 100%),radial-gradient(ellipse 55% 55% at 82% 12%,rgba(138,92,246,0.45) 0%,transparent 100%),radial-gradient(ellipse 50% 45% at 58% 92%,rgba(16,185,129,0.30) 0%,transparent 100%)`

// Logos rognés — aucun espace transparent, alignement garanti
const LOGO_HEADER = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/logo-secondaire-couleur-trimmed.png'
const LOGO_FOOTER = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/logo-principal-couleur-trimmed.png'

const HEADER = `
  <tr>
    <td style="padding:10px 0 16px;line-height:0;">
      <a href="${S}" style="display:block;text-decoration:none;line-height:0;">
        <img src="${LOGO_HEADER}" alt="100 000 Médecins" width="325" style="display:block;width:325px;height:auto;border:0;" />
      </a>
    </td>
  </tr>`

const FOOTER = `
  <tr>
    <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding:8px 0 0;">
      <a href="${S}" style="display:inline-block;text-decoration:none;line-height:0;">
        <img src="${LOGO_FOOTER}" alt="100 000 Médecins" width="120" style="display:block;margin:0 auto;width:120px;height:auto;border:0;" />
      </a>
      <p style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,0.7);">
        <a href="{{lien_desabonnement}}" style="color:rgba(255,255,255,0.7);text-decoration:underline;">Me désabonner des communications</a>
      </p>
    </td>
  </tr>`

function wrap(rows) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>100 000 Médecins</title></head>
<body style="margin:0;padding:0;${BG};">
<table width="100%" cellpadding="0" cellspacing="0" style="${BG};">
<tr><td style="padding:16px 16px 20px;">
<table width="580" align="center" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
${HEADER}
${rows}
${FOOTER}
</table></td></tr></table>
</body></html>`
}

// ── Templates ─────────────────────────────────────────────────────────────────

const templates = [

  // ── Relance 1 an ──────────────────────────────────────────────────────────
  {
    id: 'relance_1an',
    sujet: "Votre avis sur {{solution_nom}} a 1 an — toujours d'actualité ?",
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Votre avis a 1 an</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">{{solution_nom}} — votre expérience est-elle toujours la même ?</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Il y a un an, vous avez évalué <strong style="color:#0f1e38;">{{solution_nom}}</strong> sur 100 000 Médecins. Les logiciels évoluent, les mises à jour s'accumulent — votre avis aussi a peut-être changé.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Un clic suffit pour le confirmer. Si tout est toujours valable, votre évaluation restera en ligne. Si quelque chose a changé, vous pouvez l'ajuster en quelques minutes.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="{{lien_1clic}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">&#10003;&nbsp; Confirmer mon avis en 1 clic</a>
          </td>
          <td width="10"></td>
          <td style="border:2px solid #e2e8f0;border-radius:12px;">
            <a href="{{lien_reevaluation}}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#0f1e38;text-decoration:none;white-space:nowrap;">Réévaluer</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Relance 3 mois ────────────────────────────────────────────────────────
  {
    id: 'relance_3mois',
    sujet: 'Rappel — votre avis sur {{solution_nom}} est en attente de mise à jour',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="top">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Rappel · 3 mois</p>
                <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Votre avis sur {{solution_nom}} est toujours attendu</h1>
              </td>
              <td valign="top" width="130" style="padding-left:16px;padding-top:4px;">
                <img src="https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776433333609-i5l8n5cx4g.png" alt="" width="120" style="display:block;width:120px;height:auto;opacity:0.75;" />
              </td>
            </tr>
          </table>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Cela fait quelques mois que vous n'avez pas mis à jour votre évaluation de <strong style="color:#0f1e38;">{{solution_nom}}</strong>. La communauté 100 000 Médecins compte sur des avis actualisés pour aider vos confrères à faire les bons choix.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Si votre usage n'a pas changé, un simple clic suffit pour reconfirmer votre avis. Sinon, une réévaluation en quelques minutes sera précieuse pour tous.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="{{lien_1clic}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">&#10003;&nbsp; Confirmer mon avis en 1 clic</a>
          </td>
          <td width="10"></td>
          <td style="border:2px solid #e2e8f0;border-radius:12px;">
            <a href="{{lien_reevaluation}}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#0f1e38;text-decoration:none;white-space:nowrap;">Réévaluer</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Relance évaluation incomplète ─────────────────────────────────────────
  {
    id: 'relance_incomplet',
    sujet: 'Votre évaluation de {{solution_nom}} est incomplète — finalisez-la',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#F5A623 0%,#E8734A 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#E8734A;text-transform:uppercase;letter-spacing:1.2px;">Évaluation incomplète</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Vous avez commencé à évaluer {{solution_nom}} — il reste quelques questions</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Vous avez commencé à évaluer <strong style="color:#0f1e38;">{{solution_nom}}</strong> sur 100 000 Médecins, mais l'évaluation n'a pas été finalisée. Votre avis complet est précieux pour la communauté !</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Reprendre là où vous en étiez ne prend que quelques minutes. Vos réponses ont été sauvegardées.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#E8734A;border-radius:12px;">
            <a href="{{lien_reprise}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">&#8594;&nbsp; Reprendre mon évaluation</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Relance PSC ───────────────────────────────────────────────────────────
  {
    id: 'relance_psc',
    sujet: 'Finalisez votre évaluation de {{solution_nom}} avec ProSanté Connect',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#8A5CF6 0%,#4A90D9 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#8A5CF6;text-transform:uppercase;letter-spacing:1.2px;">Vérification requise</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Une dernière étape pour publier votre avis sur {{solution_nom}}</h1>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Pour garantir l'authenticité des avis sur 100 000 Médecins, nous vérifions que chaque évaluateur est bien un professionnel de santé via <strong style="color:#0f1e38;">ProSanté Connect</strong>.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Cela prend moins d'une minute. Une fois vérifié, votre évaluation de <strong style="color:#0f1e38;">{{solution_nom}}</strong> sera publiée et visible par toute la communauté.</p>
        <a href="{{psc_link}}" style="display:inline-block;text-decoration:none;line-height:0;">
          <img src="https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/ProSanteConnect_sidentifier_COULEURS.png" alt="S'identifier avec Pro Santé Connect" width="260" style="display:block;width:260px;height:auto;border:0;" />
        </a>
        <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">Ce lien est valable 7 jours. Relance {{relance_num}}/{{max_relances}}.</p>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Vérification PSC (premier envoi) ──────────────────────────────────────
  {
    id: 'verification_psc',
    sujet: 'Validez votre évaluation sur 100 000 Médecins',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#8A5CF6 0%,#4A90D9 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#8A5CF6;text-transform:uppercase;letter-spacing:1.2px;">Vérification d'identité</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Une dernière étape pour publier votre avis</h1>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Merci d'avoir évalué un logiciel sur 100 000 Médecins ! Pour garantir l'authenticité des avis, nous demandons à chaque évaluateur de vérifier son identité professionnelle via <strong style="color:#0f1e38;">ProSanté Connect</strong>.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Cela prend moins d'une minute. Une fois vérifié, votre avis sera publié et visible par toute la communauté médicale.</p>
        <a href="{{psc_link}}" style="display:inline-block;text-decoration:none;line-height:0;">
          <img src="https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/logos/ProSanteConnect_sidentifier_COULEURS.png" alt="S'identifier avec Pro Santé Connect" width="260" style="display:block;width:260px;height:auto;border:0;" />
        </a>
        <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">Ce lien est valable 7 jours.</p>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Infos mensuels ────────────────────────────────────────────────────────
  {
    id: 'infos_mensuels',
    sujet: 'Les infos du mois — 100 000 Médecins',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 40%,#E8734A 75%,#F5A623 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Informations du mois</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Les nouvelles de 100 000 Médecins</h1>
        <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr {{nom}},</p>
        <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.8;">
          [INSÉREZ ICI LE CONTENU DU MOIS — nouvelles fonctionnalités, nouvelles catégories, études en cours, statistiques de la plateforme…]
        </p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="${S}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">Découvrir les nouveautés &#8594;</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Étude clinique ────────────────────────────────────────────────────────
  {
    id: 'etude_clinique',
    sujet: 'Nouvelle étude — votre expertise est recherchée',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:#10B981;height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#10B981;text-transform:uppercase;letter-spacing:1.2px;">Nouvelle étude · Digital Medical Hub</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Une étude clinique a besoin de votre expertise</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">En partenariat avec le <strong style="color:#10B981;">Digital Medical Hub</strong>, une nouvelle étude de recherche en santé numérique est ouverte. Elle a besoin de praticiens comme vous pour partager leur expérience de terrain.</p>
        <div style="margin:0 0 20px;background:#F0FDF4;border-radius:14px;padding:20px 24px;">
          <p style="margin:0;font-size:14px;color:#166534;line-height:1.75;">{{texte_promoteur}}</p>
        </div>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#10B981;border-radius:12px;">
            <a href="{{lien_etude}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">&#128302;&nbsp; Participer à l'étude &#8594;</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Questionnaire de thèse ────────────────────────────────────────────────
  {
    id: 'questionnaire_recherche',
    sujet: 'Questionnaire de thèse — quelques minutes pour aider un interne',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:#8A5CF6;height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#8A5CF6;text-transform:uppercase;letter-spacing:1.2px;">Questionnaire de thèse</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Un interne en thèse a besoin de votre avis</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Un interne en cours de thèse cherche des praticiens pour répondre à son questionnaire de recherche. Quelques minutes de votre temps peuvent faire une vraie différence pour son travail.</p>
        <div style="margin:0 0 20px;background:#F5F3FF;border-radius:14px;padding:20px 24px;">
          <p style="margin:0;font-size:14px;color:#5B21B6;line-height:1.75;">{{texte_promoteur}}</p>
        </div>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#8A5CF6;border-radius:12px;">
            <a href="{{lien_etude}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">&#128203;&nbsp; Répondre au questionnaire &#8594;</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Suppression de compte ─────────────────────────────────────────────────
  {
    id: 'suppression_compte',
    sujet: 'Votre compte 100 000 Médecins a été supprimé',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#6B7280 0%,#9CA3AF 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1.2px;">Confirmation</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Votre compte a bien été supprimé</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour {{prenom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Conformément à votre demande, votre compte <strong style="color:#0f1e38;">{{nom}}</strong> sur 100 000 Médecins a été définitivement supprimé. Vos données personnelles ont été effacées de notre plateforme.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Si vous souhaitez revenir un jour, vous pourrez créer un nouveau compte sur notre site. Merci pour votre contribution à la communauté médicale.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="${S}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">Visiter 100 000 Médecins &#8594;</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`)
  },

  // ── Réinitialisation du mot de passe ──────────────────────────────────────
  {
    id: 'reinitialisation_mot_de_passe',
    sujet: 'Réinitialisez votre mot de passe — 100 000 Médecins',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Sécurité du compte</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Réinitialisez votre mot de passe</h1>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Vous avez demandé à réinitialiser votre mot de passe sur 100 000 Médecins. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe actuel reste inchangé.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="{{lien_reinitialisation}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">&#128273;&nbsp; Réinitialiser mon mot de passe</a>
          </td>
        </tr></table>
        <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">Ce lien est valable 24 heures.</p>
      </td></tr>
    </table>
  </td></tr>`)
  },

]

// ── Lancement (template multi-sections) ──────────────────────────────────────

const IMG_LOGICIELS = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776433333609-i5l8n5cx4g.png'
const IMG_AGENDA    = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776433342670-hszsc70dau.png'
const IMG_IA_DOC    = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776432735712-y47ztc96vs.png'
const IMG_IA_SCRIBE = 'https://qnspmlskzgqrqtuvsbuo.supabase.co/storage/v1/object/public/images/1776432724363-xu3f6oy10nb.png'
const MAILTO_SUBJECT = encodeURIComponent('Tu connais 100 000 Médecins ?')
const MAILTO_BODY = encodeURIComponent(
`Salut,

Tu utilises des logiciels au cabinet — LGC, agenda, dictée IA... ? Je voulais te parler d'une plateforme que j'utilise : 100 000 Médecins.

Le principe : des médecins évaluent leurs logiciels médicaux, et ça permet à tout le monde de comparer sur la base de vrais retours de terrain — pas de pub, pas de marketing.

Plus on est nombreux à partager nos expériences, plus c'est utile pour tous (et plus les éditeurs sont obligés de s'améliorer 😄).

Jette un œil, ça vaut le coup : ${S}

À bientôt,`
)

templates.push({
  id: 'lancement',
  sujet: 'Le nouveau 100 000 Médecins est là ✨',
  contenu_html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>100 000 Médecins</title>
</head>
<body style="margin:0;padding:0;${BG};">
<table width="100%" cellpadding="0" cellspacing="0" style="${BG};">
<tr><td style="padding:16px 16px 20px;">
<table width="580" align="center" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
${HEADER}

  <!-- ══ CARD PRINCIPALE ══ -->
  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 40%,#E8734A 75%,#F5A623 100%);height:4px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:36px 40px 30px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Nouveauté</p>
            <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0f1e38;line-height:1.2;white-space:nowrap;letter-spacing:-0.5px;">Le nouveau 100&nbsp;000 Médecins est là ✨</h1>
            <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour Dr {{nom}},</p>
            <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">
              Nous avons entièrement refondu la plateforme — design repensé, nouvelles catégories, partenariats inédits. Et votre avis sur <strong style="color:#0f1e38;">{{solution_nom}}</strong>, déposé il y a quelques mois, est toujours là. Un clic suffit pour le confirmer ou l'ajuster.
            </p>
            <p style="margin:0 0 16px;font-size:14px;color:#4A5568;line-height:1.8;">
              Chaque avis compte : c'est grâce à des retours comme le vôtre que vos confrères font de meilleurs choix — et que les éditeurs sont poussés à améliorer leurs produits.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="bottom">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#0f1e38;border-radius:12px;">
                        <a href="{{lien_1clic}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">&#10003;&nbsp; Confirmer mon avis en 1 clic</a>
                      </td>
                      <td width="10"></td>
                      <td style="border:2px solid #e2e8f0;border-radius:12px;">
                        <a href="{{lien_reevaluation}}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#0f1e38;text-decoration:none;white-space:nowrap;">Réévaluer</a>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="text-align:right;vertical-align:bottom;padding:0;">
                  <img src="${IMG_LOGICIELS}" alt="" width="130" style="display:block;width:130px;height:auto;max-height:120px;object-fit:contain;opacity:0.5;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr><td style="padding:14px 0 8px;"><p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Nouvelles catégories</p></td></tr>

  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:18px;overflow:hidden;background-color:#0f2550;background-image:linear-gradient(135deg,#0f2550 0%,#1a4a9a 50%,#4A90D9 100%);">
        <tr>
          <td style="padding:26px 28px;" valign="middle" width="58%">
            <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">&#128197; Agenda médical</p>
            <p style="margin:0 0 14px;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.65;">Doctolib, Maiia, Médistory… Quel agenda s'adapte le mieux à votre pratique ? Délais, ergonomie, tarifs — comparez les avis de vos confrères et faites le bon choix.</p>
            <a href="${S}/solutions/agendas-medicaux" style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);border-radius:20px;padding:8px 18px;font-size:12px;font-weight:700;color:#ffffff;text-decoration:none;">Explorer les agendas &#8594;</a>
          </td>
          <td style="text-align:right;vertical-align:bottom;padding:0 0 10px 0;width:42%;">
            <img src="${IMG_AGENDA}" alt="Agenda médical" width="190" style="display:block;width:190px;height:auto;max-height:150px;object-fit:contain;opacity:0.9;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="49%" valign="top" style="background-color:#3730a3;background-image:linear-gradient(145deg,#2e27a0 0%,#5b52d6 50%,#8A5CF6 100%);border-radius:18px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0" style="min-height:180px;">
              <tr>
                <td style="padding:22px 16px 22px 22px;" valign="middle" width="58%">
                  <p style="margin:0 0 8px;font-size:14px;font-weight:800;color:#ffffff;letter-spacing:-0.2px;">&#129302; IA documentaire</p>
                  <p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.85);line-height:1.6;">Comptes-rendus, synthèses, lettres générées par IA. Gagnez du temps sans perdre en qualité.</p>
                  <a href="${S}/solutions/ia-documentaires" style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.30);border-radius:20px;padding:7px 14px;font-size:11px;font-weight:700;color:#ffffff;text-decoration:none;">Explorer &#8594;</a>
                </td>
                <td style="text-align:right;vertical-align:bottom;padding:0 0 10px 0;" width="42%">
                  <img src="${IMG_IA_DOC}" alt="IA documentaire" width="85" style="display:block;width:85px;height:auto;max-height:120px;object-fit:contain;opacity:0.9;" />
                </td>
              </tr>
            </table>
          </td>
          <td width="2%"></td>
          <td width="49%" valign="top" style="background-color:#b03280;background-image:linear-gradient(145deg,#96246e 0%,#d04888 50%,#F08050 100%);border-radius:18px;overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0" style="min-height:180px;">
              <tr>
                <td style="padding:22px 16px 22px 22px;" valign="middle" width="58%">
                  <p style="margin:0 0 8px;font-size:14px;font-weight:800;color:#ffffff;letter-spacing:-0.2px;">&#9999;&#65039; IA scribe</p>
                  <p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.85);line-height:1.6;">Dictée médicale et transcription en temps réel. Restez concentré sur votre patient.</p>
                  <a href="${S}/solutions/intelligence-artificielle-medecine" style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.30);border-radius:20px;padding:7px 14px;font-size:11px;font-weight:700;color:#ffffff;text-decoration:none;">Explorer &#8594;</a>
                </td>
                <td style="text-align:right;vertical-align:bottom;padding:0 0 10px 0;" width="42%">
                  <img src="${IMG_IA_SCRIBE}" alt="IA scribe" width="100" style="display:block;width:100px;height:auto;max-height:130px;object-fit:contain;opacity:0.9;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr><td style="padding:14px 0 8px;"><p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Nouveaux partenariats</p></td></tr>

  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;">
        <tr><td style="background:#10B981;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="36" valign="top">
              <div style="width:34px;height:34px;border-radius:10px;background:#ECFDF5;text-align:center;line-height:34px;font-size:18px;">&#128302;</div>
            </td>
            <td style="padding-left:14px;" valign="top">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f1e38;">Études cliniques — en partenariat avec le <span style="color:#10B981;font-weight:800;">Digital Medical Hub</span></p>
              <p style="margin:0 0 14px;font-size:13px;color:#4A5568;line-height:1.7;">Des études de recherche en santé numérique qui ont besoin de votre expertise de terrain.</p>
              <a href="${S}/mon-compte/etudes-cliniques" style="display:inline-block;background:#10B981;border-radius:10px;padding:9px 18px;font-size:12px;font-weight:700;color:#ffffff;text-decoration:none;">Voir les études en cours &#8594;</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:0 0 10px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;">
        <tr><td style="background:#8A5CF6;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="36" valign="top">
              <div style="width:34px;height:34px;border-radius:10px;background:#F5F3FF;text-align:center;line-height:34px;font-size:18px;">&#128203;</div>
            </td>
            <td style="padding-left:14px;" valign="top">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f1e38;">Questionnaires de thèse</p>
              <p style="margin:0 0 14px;font-size:13px;color:#4A5568;line-height:1.7;">Des internes en cours de thèse cherchent des praticiens pour répondre à leurs questionnaires de recherche.</p>
              <a href="${S}/mon-compte/questionnaires-these" style="display:inline-block;background:#8A5CF6;border-radius:10px;padding:9px 18px;font-size:12px;font-weight:700;color:#ffffff;text-decoration:none;">Voir les questionnaires &#8594;</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:4px 0 14px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border-radius:18px;border:1.5px solid #FDE68A;overflow:hidden;">
        <tr><td style="background:#F5A623;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="36" valign="top">
              <div style="width:34px;height:34px;border-radius:10px;background:#FEF3C7;text-align:center;line-height:34px;font-size:18px;">&#128226;</div>
            </td>
            <td style="padding-left:14px;" valign="top">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f1e38;">Un confrère devrait connaître la plateforme ?</p>
              <p style="margin:0 0 16px;font-size:13px;color:#4A5568;line-height:1.7;">La force de 100&nbsp;000 Médecins repose sur le nombre. Si vous pensez à un collègue qui utilise des logiciels médicaux, transmettez-lui ce message.</p>
              <a href="mailto:?subject=${MAILTO_SUBJECT}&body=${MAILTO_BODY}" style="display:inline-block;background:#F5A623;border-radius:10px;padding:11px 20px;font-size:13px;font-weight:700;color:#0f1e38;text-decoration:none;white-space:nowrap;">&#9993;&#65039;&nbsp; Transférer ce mail à un confrère</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td>
  </tr>

${FOOTER}
</table></td></tr></table>
</body></html>`
})

// ── Mise à jour Supabase ───────────────────────────────────────────────────────

console.log(`\n📧 Mise à jour de ${templates.length} templates email…\n`)

for (const tpl of templates) {
  if (tpl.contenu_html.includes('data:image/png;base64')) {
    console.error(`  ⚠️  ${tpl.id} — base64 détecté ! Abandon.`)
    continue
  }

  const { error } = await supabase
    .from('email_templates')
    .upsert({ id: tpl.id, sujet: tpl.sujet, contenu_html: tpl.contenu_html }, { onConflict: 'id' })

  if (error) {
    console.error(`  ❌ ${tpl.id} — ${error.message}`)
  } else {
    console.log(`  ✅ ${tpl.id}`)
  }
}

console.log('\nTerminé.')
