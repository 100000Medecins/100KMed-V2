export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import IntitulesAdminClient from '@/components/admin/IntitulesAdminClient'
import type { PropositionIntitule, IntituleValide } from '@/components/admin/IntitulesAdminClient'
import CatalogueAdminClient from '@/components/admin/CatalogueAdminClient'
import type { CompetenceCatalogue } from '@/components/admin/CatalogueAdminClient'
import OppositionsAdminClient from '@/components/admin/OppositionsAdminClient'
import type { Opposition } from '@/components/admin/OppositionsAdminClient'

async function getData() {
  const admin = createServiceRoleClient()
  const [{ data: propositions }, { data: valides }, { data: oppositionsBrut }, { data: version }] = await Promise.all([
    admin
      .from('intitules')
      .select('id, libelle, synonymes, groupe, propose_par, created_at, fiches_intitules(count)')
      .eq('type', 'competence')
      .eq('statut', 'propose')
      .order('created_at', { ascending: true }),
    admin
      .from('intitules')
      .select('id, libelle, synonymes, groupe, specialites_sm, fiches_intitules(count)')
      .eq('type', 'competence')
      .eq('statut', 'valide')
      .order('libelle'),
    admin.from('annuaire_oppositions').select('rpps, motif, cree_le').order('cree_le', { ascending: false }),
    admin.from('ans_version').select('lot').eq('cle', 'courante').maybeSingle(),
  ])

  // Nom d'après le lot ANS courant, pour reconnaître le médecin (absent une fois exclu par un import)
  const nomsAns = new Map<string, string>()
  const rppsOpposes = (oppositionsBrut ?? []).map((o) => o.rpps)
  if (version && rppsOpposes.length > 0) {
    const { data: medecins } = await admin
      .from('ans_medecins')
      .select('rpps, nom, prenom')
      .eq('lot', version.lot)
      .in('rpps', rppsOpposes)
    for (const m of medecins ?? []) nomsAns.set(m.rpps, [m.prenom, m.nom].filter(Boolean).join(' '))
  }
  const oppositions: Opposition[] = (oppositionsBrut ?? []).map((o) => ({
    rpps: o.rpps,
    motif: o.motif,
    creeLe: o.cree_le,
    nomAns: nomsAns.get(o.rpps) ?? null,
  }))

  const liste = propositions ?? []
  const auteurs = new Map<string, string>()
  const auteurIds = Array.from(new Set(liste.map((p) => p.propose_par).filter((x): x is string => !!x)))
  if (auteurIds.length > 0) {
    const { data: users } = await admin.from('users').select('id, prenom, nom, specialite').in('id', auteurIds)
    for (const u of users ?? []) {
      const nom = [u.prenom, u.nom].filter(Boolean).join(' ') || 'Médecin sans nom'
      auteurs.set(u.id, u.specialite ? `${nom} (${u.specialite})` : nom)
    }
  }

  const resultat: PropositionIntitule[] = liste.map((p) => ({
    id: p.id,
    libelle: p.libelle,
    synonymes: p.synonymes,
    groupe: p.groupe,
    auteur: p.propose_par ? auteurs.get(p.propose_par) ?? null : null,
    creeLe: p.created_at,
    nbFiches: p.fiches_intitules[0]?.count ?? 0,
  }))
  const catalogue: CompetenceCatalogue[] = (valides ?? []).map((v) => ({
    id: v.id,
    libelle: v.libelle,
    synonymes: v.synonymes,
    groupe: v.groupe,
    specialites_sm: v.specialites_sm,
    nbFiches: v.fiches_intitules[0]?.count ?? 0,
  }))
  const intitulesValides: IntituleValide[] = catalogue.map(({ id, libelle, groupe }) => ({ id, libelle, groupe }))
  return { propositions: resultat, catalogue, valides: intitulesValides, oppositions }
}

function classeOnglet(actif: boolean) {
  return `px-4 py-2 rounded-full text-sm font-medium transition-colors ${
    actif ? 'bg-accent-blue/10 text-accent-blue' : 'text-gray-500 hover:text-navy hover:bg-white'
  }`
}

export default async function AdminIntitulesPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams
  const actif = onglet === 'catalogue' || onglet === 'oppositions' ? onglet : 'propositions'
  const { propositions, catalogue, valides, oppositions } = await getData()

  const onglets = [
    { cle: 'propositions', href: '/admin/intitules', libelle: `Propositions (${propositions.length})` },
    { cle: 'catalogue', href: '/admin/intitules?onglet=catalogue', libelle: `Catalogue (${catalogue.length})` },
    { cle: 'oppositions', href: '/admin/intitules?onglet=oppositions', libelle: `Oppositions (${oppositions.length})` },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Annuaire</h1>
        <p className="text-sm text-gray-500 mt-1">
          Catalogue commun des compétences que les médecins cochent sur leur fiche, propositions à valider, et
          médecins qui ont refusé de figurer dans l&apos;annuaire. Chaque décision sur une proposition efface le lien
          avec son auteur.
        </p>
      </div>

      <nav className="mb-6 flex gap-2" aria-label="Onglets">
        {onglets.map((o) => (
          <Link key={o.cle} href={o.href} className={classeOnglet(actif === o.cle)} aria-current={actif === o.cle ? 'page' : undefined}>
            {o.libelle}
          </Link>
        ))}
      </nav>

      {actif === 'catalogue' && <CatalogueAdminClient competences={catalogue} />}
      {actif === 'oppositions' && <OppositionsAdminClient oppositions={oppositions} />}
      {actif === 'propositions' && <IntitulesAdminClient propositions={propositions} valides={valides} />}
    </div>
  )
}
