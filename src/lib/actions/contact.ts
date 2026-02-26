'use server'

/**
 * Envoie un message de contact.
 * Remplace : mutation sendMessageContact
 *
 * TODO: Implémenter la vérification reCAPTCHA et l'envoi d'email.
 * Options pour l'envoi d'email :
 * - Resend (recommandé pour Next.js/Vercel)
 * - SendGrid (comme l'ancien backend)
 * - Supabase Edge Functions
 */
export async function sendContactMessage(data: {
  nom: string
  prenom: string
  email: string
  telephone?: string
  message: string
  recaptchaToken: string
}) {
  // TODO: Vérifier le reCAPTCHA
  // const recaptchaResult = await verifyRecaptcha(data.recaptchaToken)
  // if (!recaptchaResult.success) {
  //   return { status: 'ERROR', message: 'reCAPTCHA invalide' }
  // }

  // TODO: Envoyer l'email via Resend ou SendGrid
  // await sendEmail({
  //   to: process.env.CONTACT_EMAIL!,
  //   subject: `Message de contact - ${data.nom} ${data.prenom}`,
  //   html: `
  //     <p>Nom: ${data.nom} ${data.prenom}</p>
  //     <p>Email: ${data.email}</p>
  //     <p>Téléphone: ${data.telephone || 'Non renseigné'}</p>
  //     <p>Message: ${data.message}</p>
  //   `,
  // })

  console.log('Contact message received:', {
    nom: data.nom,
    prenom: data.prenom,
    email: data.email,
  })

  return { status: 'SUCCESS', message: 'Message envoyé avec succès' }
}
