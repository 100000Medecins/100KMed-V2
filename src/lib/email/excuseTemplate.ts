export const EXCUSE_DEFAULT_SUJET =
  "Toutes nos excuses — votre lien de réévaluation ({{solution_nom}})"

export const EXCUSE_DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr><td align="center" style="padding:32px 12px;">
    <table cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <tr><td style="background:linear-gradient(135deg,#0f1e38 0%,#1a3a6e 100%);border-radius:16px 16px 0 0;padding:28px 32px 24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#93c5fd;text-transform:uppercase;letter-spacing:0.08em;">100 000 Médecins</p>
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Toutes nos excuses</p>
        <p style="margin:6px 0 0;font-size:14px;color:#bfdbfe;line-height:1.4;">Un lien ne fonctionnait pas dans notre email de ce matin</p>
      </td></tr>

      <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;">

        <p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;">Bonjour {{nom}},</p>

        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.65;">
          Ce matin, nous vous avons envoy&#233; un email vous invitant &#224; confirmer votre avis sur
          <strong style="color:#0f1e38;">{{solution_nom}}</strong>.
          En raison d&apos;un probl&#232;me technique de notre c&#244;t&#233;, <strong>le lien contenu dans cet email ne fonctionnait pas</strong>.
        </p>

        <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.65;">
          Nous nous en excusons sinc&#232;rement. Voici le lien corrig&#233; :
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr><td align="center">
            <a href="{{lien_1clic}}"
               style="display:inline-block;background:#0f1e38;color:#ffffff;padding:15px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.01em;">
              Confirmer mon avis en 1 clic &rarr;
            </a>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td align="center">
            <a href="{{lien_reevaluation}}"
               style="display:inline-block;background:#f3f4f6;color:#0f1e38;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600;">
              Acc&#233;der &#224; mes &#233;valuations
            </a>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:10px;margin-bottom:28px;">
          <tr><td style="padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
              <strong>Le bouton &quot;Confirmer en 1 clic&quot;</strong> valide votre avis actuel sans rien changer &#224; votre &#233;valuation &#8212; c&apos;est simplement pour confirmer que votre retour est toujours d&apos;actualit&#233;.
            </p>
          </td></tr>
        </table>

        <p style="margin:0 0 4px;font-size:14px;color:#374151;">Encore d&#233;sol&#233;s pour la g&#234;ne occasionn&#233;e.</p>
        <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">L&apos;&#233;quipe 100 000 M&#233;decins</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px;" />

        <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
          Vous recevez cet email car vous avez &#233;valu&#233; un logiciel m&#233;dical sur 100 000 M&#233;decins.<br>
          <a href="{{lien_desabonnement}}" style="color:#9ca3af;text-decoration:underline;">G&#233;rer mes pr&#233;f&#233;rences de notifications</a>
        </p>

      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
