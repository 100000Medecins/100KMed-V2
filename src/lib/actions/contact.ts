'use server'

import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

const CONTACT_TO = 'david.azerad@100000medecins.org'
const CONTACT_FROM = 'contact@100000medecins.org'

export async function sendContactMessage(data: {
  nom: string
  prenom: string
  email: string
  telephone?: string
  message: string
  recaptchaToken: string
}) {
  const { nom, prenom, email, telephone, message } = data

  if (!nom || !prenom || !email || !message) {
    throw new Error('Veuillez remplir tous les champs obligatoires.')
  }

  await sgMail.send({
    to: CONTACT_TO,
    from: { email: CONTACT_FROM, name: '100000médecins.org' },
    replyTo: email,
    subject: `Message de contact — ${prenom} ${nom}`,
    html: `
      <h2>Nouveau message de contact</h2>
      <p><strong>Nom :</strong> ${nom}</p>
      <p><strong>Prénom :</strong> ${prenom}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Téléphone :</strong> ${telephone || 'Non renseigné'}</p>
      <hr />
      <p><strong>Message :</strong></p>
      <p>${message.replace(/\n/g, '<br />')}</p>
    `,
  })

  return { status: 'SUCCESS', message: 'Message envoyé avec succès' }
}
