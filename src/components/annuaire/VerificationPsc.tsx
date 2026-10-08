'use client'

import { ShieldCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { connectWithPsc } from '@/lib/auth/psc'

/** Encart « Vérifiez votre identité avec Pro Santé Connect » (fiche et lecture de l'annuaire). */
export default function VerificationPsc({ userId, texte }: { userId: string; texte: string }) {
  return (
    <Card padding="lg">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-navy">Vérifiez votre identité avec Pro Santé Connect</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">{texte}</p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="mt-4"
            leftIcon={<ShieldCheck className="w-4 h-4" />}
            onClick={() => connectWithPsc({ userId })}
          >
            Se connecter avec Pro Santé Connect
          </Button>
        </div>
      </div>
    </Card>
  )
}
