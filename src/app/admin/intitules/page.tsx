export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { SM_SPECIALITES } from '@/lib/constants/profil'
import { estMedecin, libelleProfession } from '@/lib/constants/annuaire'
import { normaliserRecherche } from '@/lib/annuaire/normaliser'
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
      .select('id, libelle, synonymes, groupe, professions, propose_par_rpps, created_at, fiches_intitules(count)')
      .eq('type', 'competence')
      .eq('statut', 'propose')
      .order('created_at', { ascending: true }),
    admin
      .from('intitules')
      .select('id, libelle, synonymes, groupe, specialites_sm, professions, fiches_intitules(count)')
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

  // Auteur d'une proposition : son identité PSC (nom, spécialité d'un médecin ou profession d'un
  // autre professionnel de santé), à défaut son compte du site
  const liste = propositions ?? []
  const auteurs = new Map<string, string>()
  const auteurRpps = Array.from(new Set(liste.map((p) => p.propose_par_rpps).filter((x): x is string => !!x)))
  if (auteurRpps.length > 0) {
    const { data: identites } = await admin
      .from('identites_psc')
      .select('rpps, nom, prenom, specialite_code, code_profession, compte:users(nom, prenom, specialite)')
      .in('rpps', auteurRpps)
    for (const i of identites ?? []) {
      const nom = [i.prenom ?? i.compte?.prenom, i.nom ?? i.compte?.nom].filter(Boolean).join(' ') || 'Auteur sans nom'
      const qualite = estMedecin(i.code_profession)
        ? (i.specialite_code && SM_SPECIALITES[i.specialite_code]) || i.compte?.specialite || 'Médecin'
        : libelleProfession(i.code_profession)
      auteurs.set(i.rpps, `${nom} (${qualite})`)
    }
  }

  // Compétence validée de même libellé ou synonyme (souvent : proposée par une autre profession) :
  // « Fusionner » avec elle l'ouvre à la profession de l'auteur.
  const valideesListe = valides ?? []
  const homonymeDe = (libelle: string) => {
    const cle = normaliserRecherche(libelle)
    return (
      valideesListe.find((v) => normaliserRecherche(v.libelle) === cle) ??
      valideesListe.find((v) => v.synonymes.some((s) => normaliserRecherche(s) === cle))
    )
  }

  const resultat: PropositionIntitule[] = liste.map((p) => {
    const homonyme = homonymeDe(p.libelle)
    return {
      id: p.id,
      libelle: p.libelle,
      synonymes: p.synonymes,
      groupe: p.groupe,
      professions: p.professions,
      auteur: p.propose_par_rpps ? auteurs.get(p.propose_par_rpps) ?? null : null,
      creeLe: p.created_at,
      nbFiches: p.fiches_intitules[0]?.count ?? 0,
      homonyme: homonyme ? { id: homonyme.id, libelle: homonyme.libelle, professions: homonyme.professions } : null,
    }
  })
  const catalogue: CompetenceCatalogue[] = valideesListe.map((v) => ({
    id: v.id,
    libelle: v.libelle,
    synonymes: v.synonymes,
    groupe: v.groupe,
    specialites_sm: v.specialites_sm,
    professions: v.professions,
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
          Catalogue commun des compétences que les professionnels de santé cochent sur leur fiche (chacune proposée
          aux professions choisies), propositions à valider, et médecins qui ont refusé de figurer dans
          l&apos;annuaire. Chaque décision sur une proposition efface le lien avec son auteur.
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
