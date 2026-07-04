/**
 * Expéditeur unique de TOUS les emails SendGrid (nom affiché + adresse).
 * Source de vérité unique — ne jamais re-hardcoder un `from` ailleurs :
 * importer `EMAIL_SENDER` et l'utiliser tel quel (`from: EMAIL_SENDER`).
 *
 * - `email` : doit rester un expéditeur **vérifié** côté SendGrid (Sender
 *   Authentication). Ne pas le rendre éditable librement — une adresse non
 *   vérifiée casse silencieusement toute la délivrabilité. Figé ici volontairement.
 * - `name` : nom affiché. Sans impact DKIM/délivrabilité. Surchargeable sans
 *   toucher au code via la variable d'environnement `EMAIL_FROM_NAME`
 *   (définie en local `.env.local` et dans Vercel). Repli : `100000medecins.org`.
 */
export const EMAIL_SENDER = {
  email: 'contact@100000medecins.org',
  name: process.env.EMAIL_FROM_NAME?.trim() || '100000medecins.org',
} as const
