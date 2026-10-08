'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, MapPin, Phone, Smartphone } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { afficherPortable } from '@/lib/annuaire/normaliser'
import { MOYENS_CONTACT } from '@/lib/constants/annuaire'
import type { Database } from '@/types/database'

type Fiche = Database['public']['Functions']['annuaire_fiche']['Returns'][number]

const LIBELLES_CONTACT = new Map<string, string>(MOYENS_CONTACT.map((m) => [m.valeur, m.libelle]))

export default function FicheConfrere({ fiche }: { fiche: Fiche }) {
  const supabase = useMemo(() => createClient(), [])
  const [portable, setPortable] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  async function afficherLePortable() {
    setChargement(true)
    setMessage(null)
    const { data, error } = await supabase.rpc('annuaire_afficher_portable', { p_rpps: fiche.rpps })
    setChargement(false)
    if (error) {
      setMessage(
        error.hint === 'plafond'
          ? 'Vous avez atteint la limite de 10 numéros de portable par 24 heures. Réessayez plus tard.'
          : 'Le numéro n’a pas pu être affiché. Réessayez.',
      )
      return
    }
    if (!data) {
      setMessage('Ce confrère ne rend plus son portable visible.')
      return
    }
    setPortable(data)
  }

  return (
    <div className="space-y-6">
      <Link href="/annuaire" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy">
        <ArrowLeft className="w-4 h-4" />
        Retour à l&apos;annuaire
      </Link>

      <Card padding="lg">
        <h1 className="text-2xl font-bold text-navy">
          Dr {fiche.prenom} {fiche.nom}
        </h1>
        {fiche.specialite && <p className="text-gray-500 mt-1">{fiche.specialite}</p>}
        {fiche.ville && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-accent-blue" />
            {fiche.ville}
            {fiche.code_postal && ` (${fiche.code_postal})`}
          </p>
        )}

        {fiche.moyen_contact && (
          <p className="mt-4 text-sm text-navy">
            <span className="font-semibold">Préfère être contacté par :</span>{' '}
            {LIBELLES_CONTACT.get(fiche.moyen_contact) ?? fiche.moyen_contact}
          </p>
        )}

        <div className="mt-4 space-y-2 text-sm">
          {fiche.mssante && (
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${fiche.mssante}`} className="text-accent-blue hover:underline break-all">
                {fiche.mssante}
              </a>
              <span className="text-gray-400">(MSSanté)</span>
            </p>
          )}
          {fiche.telephone_cabinet && (
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${fiche.telephone_cabinet}`} className="text-accent-blue hover:underline">
                {afficherPortable(fiche.telephone_cabinet)}
              </a>
              <span className="text-gray-400">(cabinet)</span>
            </p>
          )}
          {fiche.portable_disponible && (
            <div className="flex items-center gap-2 flex-wrap">
              <Smartphone className="w-4 h-4 text-gray-400" />
              {portable ? (
                <>
                  <a href={`tel:${portable}`} className="text-accent-blue hover:underline font-semibold">
                    {afficherPortable(portable)}
                  </a>
                  <span className="text-gray-400">(portable)</span>
                </>
              ) : (
                <Button type="button" variant="outline" size="sm" loading={chargement} onClick={afficherLePortable}>
                  Afficher le portable
                </Button>
              )}
            </div>
          )}
          {message && <p className="text-sm text-red-600">{message}</p>}
          {fiche.portable_disponible && !portable && (
            <p className="text-xs text-gray-400">
              Usage strictement professionnel. Le nombre de numéros affichables est limité, et chaque affichage est
              enregistré.
            </p>
          )}
        </div>

        {fiche.competences.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-bold text-navy">Compétences</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {fiche.competences.map((c) => (
                <Badge key={c} variant="info">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400">
          Informations déclarées par le médecin, non vérifiées par l&apos;association
          {fiche.mise_a_jour && ` — mises à jour le ${new Date(fiche.mise_a_jour).toLocaleDateString('fr-FR')}`}.
        </p>
      </Card>
    </div>
  )
}
