export const dynamic = 'force-dynamic'

import { createServiceRoleClient } from '@/lib/supabase/server'
import IntitulesAdminClient from '@/components/admin/IntitulesAdminClient'
import type { PropositionIntitule, IntituleValide } from '@/components/admin/IntitulesAdminClient'

async function getData() {
  const admin = createServiceRoleClient()
  const [{ data: propositions }, { data: valides }] = await Promise.all([
    admin
      .from('intitules')
      .select('id, libelle, synonymes, groupe, propose_par, created_at')
      .eq('type', 'competence')
      .eq('statut', 'propose')
      .order('created_at', { ascending: true }),
    admin
      .from('intitules')
      .select('id, libelle, groupe')
      .eq('type', 'competence')
      .eq('statut', 'valide')
      .order('libelle'),
  ])

  const liste = propositions ?? []
  const nbFiches = new Map<string, number>()
  const auteurs = new Map<string, string>()

  if (liste.length > 0) {
    const { data: liens } = await admin
      .from('fiches_intitules')
      .select('intitule_id')
      .in('intitule_id', liste.map((p) => p.id))
    for (const l of liens ?? []) nbFiches.set(l.intitule_id, (nbFiches.get(l.intitule_id) ?? 0) + 1)

    const auteurIds = Array.from(new Set(liste.map((p) => p.propose_par).filter((x): x is string => !!x)))
    if (auteurIds.length > 0) {
      const { data: users } = await admin.from('users').select('id, prenom, nom, specialite').in('id', auteurIds)
      for (const u of users ?? []) {
        const nom = [u.prenom, u.nom].filter(Boolean).join(' ') || 'Médecin sans nom'
        auteurs.set(u.id, u.specialite ? `${nom} (${u.specialite})` : nom)
      }
    }
  }

  const resultat: PropositionIntitule[] = liste.map((p) => ({
    id: p.id,
    libelle: p.libelle,
    synonymes: p.synonymes,
    groupe: p.groupe,
    auteur: p.propose_par ? auteurs.get(p.propose_par) ?? null : null,
    creeLe: p.created_at,
    nbFiches: nbFiches.get(p.id) ?? 0,
  }))
  const intitulesValides: IntituleValide[] = valides ?? []
  return { propositions: resultat, valides: intitulesValides }
}

export default async function AdminIntitulesPage() {
  const { propositions, valides } = await getData()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Annuaire — compétences proposées</h1>
        <p className="text-sm text-gray-500 mt-1">
          {`${propositions.length} proposition${propositions.length !== 1 ? 's' : ''} en attente · ${valides.length} compétences dans le catalogue. `}
          Chaque décision efface le lien avec l&apos;auteur de la proposition.
        </p>
      </div>
      <IntitulesAdminClient propositions={propositions} valides={valides} />
    </div>
  )
}
