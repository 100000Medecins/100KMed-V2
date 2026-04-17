// Met à jour tous les templates email dans Supabase avec le nouveau design hero gradient
// Usage : node scripts/update-email-templates.mjs

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
const env = Object.fromEntries(
  raw.split('\n').filter(l => l.includes('=')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
)

const S = 'https://www.100000medecins.org'
const BG = `background-color:#0f1e38;background-image:radial-gradient(ellipse 70% 60% at 12% 75%,rgba(74,144,217,0.55) 0%,transparent 100%),radial-gradient(ellipse 55% 55% at 82% 12%,rgba(138,92,246,0.45) 0%,transparent 100%),radial-gradient(ellipse 50% 45% at 58% 92%,rgba(16,185,129,0.30) 0%,transparent 100%)`

const HEADER = `
  <tr>
    <td style="padding:0 0 26px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4A90D9;margin-right:3px;vertical-align:middle;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#E8734A;margin-right:3px;vertical-align:middle;"></span>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#F5A623;margin-right:8px;vertical-align:middle;"></span>
          <span style="font-size:15px;font-weight:700;color:#ffffff;vertical-align:middle;letter-spacing:-0.3px;">100000médecins<span style="color:#4A90D9;">.org</span></span>
        </td>
        <td align="right" valign="middle" style="padding-right:22px;">
          <a href="${S}/solutions" style="font-size:11px;color:rgba(255,255,255,0.45);text-decoration:none;margin-left:16px;">Logiciels</a>
          <a href="${S}/mon-compte/mes-evaluations" style="font-size:11px;color:rgba(255,255,255,0.45);text-decoration:none;margin-left:16px;">Évaluations</a>
          <a href="${S}/mon-compte/etudes-cliniques" style="font-size:11px;color:rgba(255,255,255,0.45);text-decoration:none;margin-left:16px;">Études</a>
        </td>
      </tr></table>
    </td>
  </tr>`

const FOOTER = `
  <tr>
    <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
      <p style="margin:0 0 5px;">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4A90D9;margin-right:2px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#E8734A;margin-right:2px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#F5A623;margin-right:6px;vertical-align:middle;"></span>
        <span style="font-size:11px;color:rgba(255,255,255,0.35);vertical-align:middle;">100 000 Médecins · contact@100000medecins.org</span>
      </p>
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">
        <a href="{{lien_desabonnement}}" style="color:rgba(255,255,255,0.25);text-decoration:underline;">Me désabonner des communications</a>
      </p>
    </td>
  </tr>`

function wrap(rows) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>100 000 Médecins</title></head>
<body style="margin:0;padding:0;${BG};">
<table width="100%" cellpadding="0" cellspacing="0" style="${BG};">
<tr><td align="center" style="padding:24px 16px 48px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
${HEADER}
${rows}
${FOOTER}
</table></td></tr></table>
</body></html>`
}

// ── Templates ────────────────────────────────────────────────────────────────

const templates = [

  // ── Relance 1 an ──────────────────────────────────────────────────────────
  {
    id: 'relance_1an',
    sujet: 'Votre avis sur {{solution_nom}} a 1 an — toujours d\'actualité ?',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Votre avis a 1 an</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">{{solution_nom}} — votre expérience est-elle toujours la même ?</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Il y a un an, vous avez évalué <strong style="color:#0f1e38;">{{solution_nom}}</strong> sur 100 000 Médecins. Les logiciels évoluent, les mises à jour s'accumulent — votre avis aussi a peut-être changé.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Un clic suffit pour le confirmer. Si tout est toujours valable, votre évaluation restera en ligne. Si quelque chose a changé, vous pouvez l'ajuster en quelques minutes.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="{{lien_1clic}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">✓&nbsp; Confirmer mon avis en 1 clic</a>
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
  <tr><td style="padding:0 0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Rappel · 3 mois</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Votre avis sur {{solution_nom}} est toujours attendu</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Cela fait quelques mois que vous n'avez pas mis à jour votre évaluation de <strong style="color:#0f1e38;">{{solution_nom}}</strong>. La communauté 100 000 Médecins compte sur des avis actualisés pour aider vos confrères à faire les bons choix.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Si votre usage n'a pas changé, un simple clic suffit pour reconfirmer votre avis. Sinon, une réévaluation en quelques minutes sera précieuse pour tous.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="{{lien_1clic}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">✓&nbsp; Confirmer mon avis en 1 clic</a>
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
  <tr><td style="padding:0 0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#F5A623 0%,#E8734A 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#E8734A;text-transform:uppercase;letter-spacing:1.2px;">Évaluation incomplète</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Vous avez commencé à évaluer {{solution_nom}} — il reste quelques questions</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Vous avez commencé à évaluer <strong style="color:#0f1e38;">{{solution_nom}}</strong> sur 100 000 Médecins, mais l'évaluation n'a pas été finalisée. Votre avis complet est précieux pour la communauté !</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Reprendre là où vous en étiez ne prend que quelques minutes. Vos réponses ont été sauvegardées.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#E8734A;border-radius:12px;">
            <a href="{{lien_reprise}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">→&nbsp; Reprendre mon évaluation</a>
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
    contenu_html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>100 000 Médecins</title></head>
<body style="margin:0;padding:0;${BG};">
<table width="100%" cellpadding="0" cellspacing="0" style="${BG};">
<tr><td align="center" style="padding:24px 16px 48px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
${HEADER}
  <tr><td style="padding:0 0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#8A5CF6 0%,#4A90D9 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#8A5CF6;text-transform:uppercase;letter-spacing:1.2px;">Vérification requise</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Une dernière étape pour publier votre avis sur {{solution_nom}}</h1>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Pour garantir l'authenticité des avis sur 100 000 Médecins, nous vérifions que chaque évaluateur est bien un professionnel de santé via <strong style="color:#0f1e38;">ProSanté Connect</strong>.</p>
        <p style="margin:0 0 26px;font-size:14px;color:#4A5568;line-height:1.8;">Cela prend moins d'une minute. Une fois vérifié, votre évaluation de <strong style="color:#0f1e38;">{{solution_nom}}</strong> sera publiée et visible par toute la communauté.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="{{psc_link}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">🔐&nbsp; Vérifier mon identité avec PSC</a>
          </td>
        </tr></table>
        <p style="margin:16px 0 0;font-size:12px;color:#9CA3AF;">Ce lien est valable 7 jours. Relance {{relance_num}}/{{max_relances}}.</p>
      </td></tr>
    </table>
  </td></tr>
  <tr>
    <td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
      <p style="margin:0 0 5px;">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#4A90D9;margin-right:2px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#E8734A;margin-right:2px;vertical-align:middle;"></span>
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#F5A623;margin-right:6px;vertical-align:middle;"></span>
        <span style="font-size:11px;color:rgba(255,255,255,0.35);vertical-align:middle;">100 000 Médecins · contact@100000medecins.org</span>
      </p>
    </td>
  </tr>
</table></td></tr></table>
</body></html>`
  },

  // ── Infos mensuels ────────────────────────────────────────────────────────
  {
    id: 'infos_mensuels',
    sujet: 'Les infos du mois — 100 000 Médecins',
    contenu_html: wrap(`
  <tr><td style="padding:0 0 10px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:linear-gradient(90deg,#4A90D9 0%,#8A5CF6 40%,#E8734A 75%,#F5A623 100%);height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4A90D9;text-transform:uppercase;letter-spacing:1.2px;">Informations du mois</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Les nouvelles de 100 000 Médecins</h1>
        <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour {{nom}},</p>
        <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.8;">
          [INSÉREZ ICI LE CONTENU DU MOIS — nouvelles fonctionnalités, nouvelles catégories, études en cours, statistiques de la plateforme…]
        </p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0f1e38;border-radius:12px;">
            <a href="${S}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">Découvrir les nouveautés →</a>
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
  <tr><td style="padding:0 0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:#10B981;height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#10B981;text-transform:uppercase;letter-spacing:1.2px;">Nouvelle étude · Digital Medical Hub</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Une étude clinique a besoin de votre expertise</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">En partenariat avec le <strong style="color:#10B981;">Digital Medical Hub</strong>, une nouvelle étude de recherche en santé numérique est ouverte. Elle a besoin de praticiens comme vous pour partager leur expérience de terrain.</p>
        <div style="margin:0 0 20px;background:#F0FDF4;border-radius:14px;padding:20px 24px;">
          <p style="margin:0;font-size:14px;color:#166534;line-height:1.75;">{{texte_promoteur}}</p>
        </div>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#10B981;border-radius:12px;">
            <a href="{{lien_etude}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">🔬&nbsp; Participer à l'étude →</a>
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
  <tr><td style="padding:0 0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;">
      <tr><td style="background:#8A5CF6;height:4px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#8A5CF6;text-transform:uppercase;letter-spacing:1.2px;">Questionnaire de thèse</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0f1e38;line-height:1.25;letter-spacing:-0.4px;">Un interne en thèse a besoin de votre avis</h1>
        <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#0f1e38;">Bonjour {{nom}},</p>
        <p style="margin:0 0 14px;font-size:14px;color:#4A5568;line-height:1.8;">Un interne en cours de thèse cherche des praticiens pour répondre à son questionnaire de recherche. Quelques minutes de votre temps peuvent faire une vraie différence pour son travail.</p>
        <div style="margin:0 0 20px;background:#F5F3FF;border-radius:14px;padding:20px 24px;">
          <p style="margin:0;font-size:14px;color:#5B21B6;line-height:1.75;">{{texte_promoteur}}</p>
        </div>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#8A5CF6;border-radius:12px;">
            <a href="{{lien_etude}}" style="display:inline-block;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">📋&nbsp; Répondre au questionnaire →</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`)
  },

]

// ── Mise à jour Supabase ──────────────────────────────────────────────────────

console.log(`\nMise à jour de ${templates.length} templates email…\n`)

for (const tpl of templates) {
  const { error } = await supabase
    .from('email_templates')
    .upsert({ id: tpl.id, sujet: tpl.sujet, contenu_html: tpl.contenu_html }, { onConflict: 'id' })

  if (error) {
    console.error(`❌ ${tpl.id} : ${error.message}`)
  } else {
    console.log(`✅ ${tpl.id}`)
  }
}

console.log('\nTerminé.')
console.log('\n⚠️  Emails transactionnels (mot de passe oublié, confirmation email) :')
console.log('   À configurer manuellement dans Supabase Dashboard → Authentication → Email Templates')
