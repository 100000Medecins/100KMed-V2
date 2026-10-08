'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Field from '@/components/ui/Field'
import { ajouterOpposition, retirerOpposition } from '@/lib/actions/admin-intitules'

export interface Opposition {
  rpps: string
  motif: string | null
  creeLe: string
  /** Nom d'après le lot ANS courant ; absent une fois le médecin exclu par un import */
  nomAns: string | null
}

function LigneOpposition({ opposition }: { opposition: Opposition }) {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function retirer() {
    if (!window.confirm(`Retirer l'opposition du RPPS ${opposition.rpps} ? Ce médecin réapparaîtra dans l'annuaire.`)) return
    setErreur(null)
    startTransition(async () => {
      const res = await retirerOpposition(opposition.rpps)
      if ('error' in res) {
        setErreur(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy">
            {opposition.rpps}
            {opposition.nomAns && <span className="font-normal text-gray-500"> — {opposition.nomAns}</span>}
          </p>
          <p className="text-xs text-gray-400">
            Depuis le {new Date(opposition.creeLe).toLocaleDateString('fr-FR')}
            {opposition.motif && ` · ${opposition.motif}`}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" loading={pending} onClick={retirer}>
          Retirer
        </Button>
      </div>
      {erreur && <div className="mt-2 bg-red-50 text-red-600 text-sm p-3 rounded-xl">{erreur}</div>}
    </div>
  )
}

function AjoutOpposition() {
  const router = useRouter()
  const [rpps, setRpps] = useState('')
  const [motif, setMotif] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function ajouter() {
    setMessage(null)
    startTransition(async () => {
      const res = await ajouterOpposition({ rpps, motif })
      if ('error' in res) {
        setMessage({ ok: false, texte: res.error })
        return
      }
      setMessage({ ok: true, texte: 'Opposition enregistrée : le médecin n’apparaît plus dans l’annuaire.' })
      setRpps('')
      setMotif('')
      router.refresh()
    })
  }

  return (
    <Card padding="lg">
      <h2 className="text-base font-bold text-navy">Ajouter une opposition</h2>
      <p className="text-sm text-gray-500 mt-1 max-w-2xl">
        Un médecin qui refuse de figurer dans l&apos;annuaire : il disparaît tout de suite des recherches et de sa
        fiche ANS, et il est écarté des imports suivants. Une fiche qu&apos;il publierait lui-même reste visible.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="RPPS" hint="11 chiffres." htmlFor="opposition-rpps">
          <Input id="opposition-rpps" size="sm" inputMode="numeric" value={rpps} onChange={(e) => setRpps(e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Motif" hint="Facultatif : origine de la demande, date." htmlFor="opposition-motif">
            <Input id="opposition-motif" size="sm" maxLength={300} value={motif} onChange={(e) => setMotif(e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={pending}
          disabled={rpps.replace(/\s+/g, '').length < 11}
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={ajouter}
        >
          Ajouter
        </Button>
        {message && <span className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.texte}</span>}
      </div>
    </Card>
  )
}

export default function OppositionsAdminClient({ oppositions }: { oppositions: Opposition[] }) {
  return (
    <div className="space-y-6">
      <AjoutOpposition />
      <Card padding="none">
        <p className="px-5 py-3 text-xs text-gray-500 border-b border-gray-100">
          {oppositions.length} opposition{oppositions.length !== 1 ? 's' : ''}
        </p>
        <div className="divide-y divide-gray-100">
          {oppositions.map((o) => (
            <LigneOpposition key={o.rpps} opposition={o} />
          ))}
          {oppositions.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucune opposition.</p>}
        </div>
      </Card>
    </div>
  )
}
