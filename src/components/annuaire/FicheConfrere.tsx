'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Mail, MapPin, Phone, Smartphone } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { afficherPortable, normaliserTelephone } from '@/lib/annuaire/normaliser'
import { MOYENS_CONTACT } from '@/lib/constants/annuaire'
import { SM_SPECIALITES } from '@/lib/constants/profil'
import type { Database } from '@/types/database'

type Fiche = Database['public']['Functions']['annuaire_fiche']['Returns'][number]
type LieuAns = {
  nom: string | null
  voie: string | null
  code_postal: string | null
  commune: string | null
  telephones: string[] | null
}

const LIBELLES_CONTACT = new Map<string, string>(MOYENS_CONTACT.map((m) => [m.valeur, m.libelle]))

function LienTelephone({ numero }: { numero: string }) {
  const international = normaliserTelephone(numero) ?? numero
  return (
    <a href={`tel:${international}`} className="text-accent-blue hover:underline">
      {afficherPortable(international)}
    </a>
  )
}

export default function FicheConfrere({ fiche }: { fiche: Fiche }) {
  const supabase = useMemo(() => createClient(), [])
  const [portable, setPortable] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  const specialite = (fiche.specialite_code && SM_SPECIALITES[fiche.specialite_code]) || fiche.specialite
  const lieux = (Array.isArray(fiche.lieux) ? fiche.lieux : []) as unknown as LieuAns[]

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
        {specialite && <p className="text-gray-500 mt-1">{specialite}</p>}
        <div className="mt-2">
          {fiche.a_une_fiche ? (
            <Badge variant="success" size="sm">
              Fiche complétée sur 100 000 Médecins
            </Badge>
          ) : (
            <p className="text-xs text-gray-400">Ce médecin n&apos;a pas encore complété sa fiche sur 100 000 Médecins.</p>
          )}
        </div>
      </Card>

      {fiche.a_une_fiche && (
        <Card padding="lg">
          <h2 className="text-base font-bold text-navy">Sa fiche</h2>
          {fiche.moyen_contact && (
            <p className="mt-3 text-sm text-navy">
              <span className="font-semibold">Préfère être contacté par :</span>{' '}
              {LIBELLES_CONTACT.get(fiche.moyen_contact) ?? fiche.moyen_contact}
            </p>
          )}
          <div className="mt-3 space-y-2 text-sm">
            {fiche.ville && (
              <p className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                {fiche.ville}
                {fiche.code_postal && ` (${fiche.code_postal})`}
              </p>
            )}
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
                <LienTelephone numero={fiche.telephone_cabinet} />
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
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-navy">Compétences</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {fiche.competences.map((c) => (
                  <Badge key={c} variant="info">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <p className="mt-5 text-xs text-gray-400">
            Informations déclarées par le médecin, non vérifiées par l&apos;association
            {fiche.mise_a_jour && ` — mises à jour le ${new Date(fiche.mise_a_jour).toLocaleDateString('fr-FR')}`}.
          </p>
        </Card>
      )}

      {(lieux.length > 0 || fiche.mssante_ans.length > 0) && (
        <Card padding="lg">
          <h2 className="text-base font-bold text-navy">Annuaire Santé</h2>
          {lieux.length > 0 && (
            <ul className="mt-3 space-y-3">
              {lieux.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    {l.nom && <p className="font-medium text-navy">{l.nom}</p>}
                    <p className="text-gray-600">
                      {[l.voie, [l.code_postal, l.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                    </p>
                    {(l.telephones ?? []).length > 0 && (
                      <p className="flex flex-wrap gap-x-3">
                        {(l.telephones ?? []).map((t) => (
                          <LienTelephone key={t} numero={t} />
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {fiche.mssante_ans.length > 0 && (
            <div className="mt-4 space-y-1 text-sm">
              {fiche.mssante_ans.map((adresse) => (
                <p key={adresse} className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${adresse}`} className="text-accent-blue hover:underline break-all">
                    {adresse}
                  </a>
                  <span className="text-gray-400">(MSSanté)</span>
                </p>
              ))}
            </div>
          )}
          {fiche.source_version && (
            <p className="mt-4 text-xs text-gray-400">
              Source : ANS, Annuaire Santé, données du {new Date(fiche.source_version).toLocaleDateString('fr-FR')} (Licence
              Ouverte 2.0). Une correction se demande à la source (Ordre des médecins).
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
