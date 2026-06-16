export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import AdminEditeursTable from '@/components/admin/AdminEditeursTable'
import AdminEditeurClaims from '@/components/admin/AdminEditeurClaims'
import AdminEditeurDemandesRef from '@/components/admin/AdminEditeurDemandesRef'
import Button from '@/components/ui/Button'
import type { Editeur } from '@/types/models'
import type { ClaimRow, EditeurOption } from '@/components/admin/AdminEditeurClaims'
import type { DemandeRefRow } from '@/components/admin/AdminEditeurDemandesRef'

async function getAllEditeurs(): Promise<Editeur[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('editeurs')
    .select('*')
    .order('nom', { ascending: true })
  if (error) throw error
  return data as Editeur[]
}

async function getEditeurClaims(): Promise<ClaimRow[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('editeur_claims')
    .select(`
      id, created_at, libre_texte, statut, note_admin,
      user:users(nom, prenom, contact_email),
      editeur:editeurs(id, nom, nom_commercial),
      solution:solutions(id, nom)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as unknown as ClaimRow[]
}

async function getDemandesReferencement(): Promise<DemandeRefRow[]> {
  const supabase = createServiceRoleClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('editeur_demandes_referencement')
    .select('id, nom_editeur, nom_solution, email_contact, site_web, message, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as DemandeRefRow[]
}

export default async function AdminEditeursPage(
  props: {
    searchParams: Promise<{ tab?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab === 'demandes' ? 'demandes' : 'editeurs'
  const [editeurs, claims, demandesRef] = await Promise.all([
    getAllEditeurs(),
    getEditeurClaims(),
    getDemandesReferencement(),
  ])

  const pendingClaims = claims.filter((c) => c.statut === 'en_attente').length
  const pendingCount = pendingClaims + demandesRef.length
  const editeurOptions: EditeurOption[] = editeurs.map((e) => ({
    id: e.id,
    nom: e.nom_commercial || e.nom || e.id,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Éditeurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {editeurs.length} éditeur{editeurs.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button href="/admin/editeurs/nouveau" leftIcon={<Plus className="w-4 h-4" />}>
          Ajouter un éditeur
        </Button>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        <Link
          href="/admin/editeurs"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'editeurs'
              ? 'border-navy text-navy'
              : 'border-transparent text-gray-500 hover:text-navy'
          }`}
        >
          Éditeurs
        </Link>
        <Link
          href="/admin/editeurs?tab=demandes"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            tab === 'demandes'
              ? 'border-navy text-navy'
              : 'border-transparent text-gray-500 hover:text-navy'
          }`}
        >
          Demandes
          {pendingCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-orange text-white text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {/* Contenu */}
      {tab === 'editeurs' && <AdminEditeursTable editeurs={editeurs} />}

      {tab === 'demandes' && (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-bold text-navy mb-3 uppercase tracking-wider">
              Demandes de référencement (nouvelle fiche)
              {demandesRef.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange text-xs font-semibold">
                  {demandesRef.length}
                </span>
              )}
            </h2>
            <AdminEditeurDemandesRef demandes={demandesRef} />
          </section>
          <section>
            <h2 className="text-sm font-bold text-navy mb-3 uppercase tracking-wider">
              Revendications de fiche existante
              {pendingClaims > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange text-xs font-semibold">
                  {pendingClaims}
                </span>
              )}
            </h2>
            <AdminEditeurClaims claims={claims} editeurs={editeurOptions} />
          </section>
        </div>
      )}
    </div>
  )
}
