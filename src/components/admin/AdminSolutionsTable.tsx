'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Pencil, Search, X, AlertTriangle } from 'lucide-react'
import DeleteSolutionButton from '@/components/admin/DeleteSolutionButton'
import ToggleSolutionActif from '@/components/admin/ToggleSolutionActif'
import { formatPrixCompact, computeSortValue, type PrixInput } from '@/lib/prix'
import { buildSolutionSeoTitle } from '@/lib/seo/title'

type Solution = {
  id: string
  nom: string
  nom_seo?: string | null
  logo_url?: string | null
  logo_titre?: string | null
  actif: boolean | null
  categorie?: { id: string; nom: string } | null
  editeur?: { id: string; nom: string } | null
  prix_ttc?: number | null
  prix_ttc_min?: number | null
  prix_ttc_max?: number | null
  prix_devise?: string | null
  prix_frequence?: string | null
  prix_duree_engagement_mois?: number | null
}

function hasNomSeoOverflow(s: Solution): boolean {
  return buildSolutionSeoTitle({ nom: s.nom, nom_seo: s.nom_seo ?? null }).overflow
}

function toPrixInput(s: Solution): PrixInput {
  return {
    prix_ttc: s.prix_ttc ?? null,
    prix_ttc_min: s.prix_ttc_min ?? null,
    prix_ttc_max: s.prix_ttc_max ?? null,
    prix_devise: s.prix_devise ?? null,
    prix_frequence: s.prix_frequence ?? null,
    prix_duree_engagement_mois: s.prix_duree_engagement_mois ?? null,
  }
}

function hasPrix(s: Solution): boolean {
  // Utilise computeSortValue qui normalise les 0/négatifs en null (donnée parasite)
  return computeSortValue(toPrixInput(s)) != null
}

export default function AdminSolutionsTable({ solutions }: { solutions: Solution[] }) {
  const [query, setQuery] = useState('')
  const [filterSansPrix, setFilterSansPrix] = useState(false)
  const [filterNomSeo, setFilterNomSeo] = useState(false)

  const nbSansPrix = useMemo(() => solutions.filter((s) => !hasPrix(s)).length, [solutions])
  const nbNomSeo = useMemo(() => solutions.filter((s) => hasNomSeoOverflow(s)).length, [solutions])

  const filtered = solutions
    .filter((s) => !filterSansPrix || !hasPrix(s))
    .filter((s) => !filterNomSeo || hasNomSeoOverflow(s))
    .filter((s) =>
      !query.trim()
        ? true
        : s.nom.toLowerCase().includes(query.toLowerCase()) ||
          s.categorie?.nom.toLowerCase().includes(query.toLowerCase()) ||
          s.editeur?.nom.toLowerCase().includes(query.toLowerCase())
    )

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtre sans prix */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher par nom, catégorie, éditeur…"
            className="w-full pl-10 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFilterSansPrix((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap ${
            filterSansPrix
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
          }`}
          title={`${nbSansPrix} solution${nbSansPrix > 1 ? 's' : ''} sans prix renseigné`}
        >
          Sans prix
          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            filterSansPrix ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-500'
          }`}>
            {nbSansPrix}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFilterNomSeo((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap ${
            filterNomSeo
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'
          }`}
          title={`${nbNomSeo} solution${nbNomSeo > 1 ? 's' : ''} dont le nom déborde des 60 chars du <title> SEO même avec l'accroche courte — remplir nom_seo`}
        >
          Nom SEO à fixer
          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            filterNomSeo ? 'bg-rose-200 text-rose-900' : 'bg-gray-100 text-gray-500'
          }`}>
            {nbNomSeo}
          </span>
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Catégorie</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Éditeur</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Prix</th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Actif</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(solution => (
                <tr key={solution.id} id={`solution-${solution.id}`} className="hover:bg-surface-light transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {solution.logo_url ? (
                        <img
                          src={solution.logo_url}
                          alt={solution.logo_titre || solution.nom}
                          className="h-8 w-16 object-contain rounded bg-gray-50 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-16 rounded bg-gray-100 flex-shrink-0" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-navy text-sm">{solution.nom}</span>
                        {hasNomSeoOverflow(solution) && (
                          <span
                            title="Le nom complet déborde des 60 caractères du <title> SEO. Renseigne « Nom court pour SEO » dans la fiche."
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Nom SEO
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {solution.categorie?.nom || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {solution.editeur?.nom || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm hidden lg:table-cell">
                    {hasPrix(solution) ? (
                      <span className="text-navy font-medium whitespace-nowrap">{formatPrixCompact(toPrixInput(solution))}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center hidden md:table-cell">
                    <ToggleSolutionActif solutionId={solution.id} actif={solution.actif ?? true} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/solutions/${solution.id}/modifier`}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors text-xs"
                      >
                        Éditer
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <DeleteSolutionButton solutionId={solution.id} nom={solution.nom} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                    {query ? `Aucun résultat pour « ${query} »` : 'Aucune solution pour le moment.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {query && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
