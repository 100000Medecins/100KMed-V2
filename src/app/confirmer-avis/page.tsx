import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { jetonRevalidationValide } from '@/lib/email/revalidation'

// Page atteinte depuis le lien « confirmer mon avis » des emails de relance. Propre à chaque
// lien (jeton signé) et rarement visitée : dynamique, comme /gerer-notifications.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Confirmer mon avis — 100 000 Médecins',
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ uid?: string; sid?: string; token?: string; erreur?: string }>
}

const LIEN_MES_EVALUATIONS = '/connexion?next=/mon-compte/mes-evaluations'

async function nomSolutionEvaluee(uid: string, sid: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('evaluations')
    .select('solution:solutions(nom)')
    .eq('user_id', uid)
    .eq('solution_id', sid)
    .maybeSingle()
  return data?.solution?.nom ?? null
}

export default async function ConfirmerAvisPage(props: Props) {
  const { uid, sid, token, erreur } = await props.searchParams
  const lienValide = !!uid && !!sid && !!token && jetonRevalidationValide(uid, sid, token)
  const solutionNom = lienValide ? await nomSolutionEvaluee(uid, sid) : null

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface-light flex items-center justify-center px-4 py-16">
        <Card padding="xl" className="max-w-md w-full text-center">
          {solutionNom ? (
            <>
              <h1 className="text-2xl font-bold text-navy mb-3">
                {`Votre avis sur ${solutionNom} est-il toujours d'actualité ?`}
              </h1>
              <p className="text-gray-600 leading-relaxed mb-8">
                Si votre usage n&apos;a pas changé, confirmez-le : votre évaluation reste en ligne, à la date d&apos;aujourd&apos;hui.
              </p>
              {erreur && (
                <p role="alert" className="text-sm text-red-600 mb-4">
                  La confirmation n&apos;a pas pu être enregistrée. Réessayez dans un instant.
                </p>
              )}
              <div className="flex flex-col gap-3">
                {/* Seul ce bouton enregistre : ouvrir le lien du mail ne suffit pas (antivirus des messageries). */}
                <form method="post" action="/api/revalider-avis">
                  <input type="hidden" name="uid" value={uid} />
                  <input type="hidden" name="sid" value={sid} />
                  <input type="hidden" name="token" value={token} />
                  <Button fullWidth>Oui, je confirme mon avis</Button>
                </form>
                <Button href={LIEN_MES_EVALUATIONS} variant="ghost" fullWidth>
                  Non, je le mets à jour
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-navy mb-3">Ce lien n&apos;est plus valable</h1>
              <p className="text-gray-600 leading-relaxed mb-8">
                Nous ne retrouvons pas l&apos;évaluation correspondante. Connectez-vous pour retrouver vos évaluations et les confirmer depuis votre compte.
              </p>
              <Button href={LIEN_MES_EVALUATIONS} fullWidth>
                Se connecter à mon compte
              </Button>
            </>
          )}
        </Card>
      </main>
      <Footer />
    </>
  )
}
