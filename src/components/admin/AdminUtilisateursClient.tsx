'use client'

import { useState, useTransition } from 'react'
import { Search, Building2, UserCheck, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { assignEditeurToUser } from '@/lib/actions/admin-users'

type User = {
  id: string
  email: string | null
  pseudo: string | null
  nom: string | null
  prenom: string | null
  role: string | null
  specialite: string | null
  rpps: string | null
  created_at: string | null
}

type Editeur = {
  id: string
  nom: string | null
  nom_commercial: string | null
  logo_url: string | null
  user_id: string | null
}

type SortField = 'created_at' | 'nom'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [50, 100, 200]

const ROLE_LABELS: Record<string, string> = {
  medecin: 'Médecin',
  editeur: 'Éditeur',
  admin: 'Admin',
  health_data_hub: 'Health Data Hub',
}

const ROLE_COLORS: Record<string, string> = {
  medecin: 'bg-blue-100 text-blue-700',
  editeur: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  health_data_hub: 'bg-teal-100 text-teal-700',
}

export default function AdminUtilisateursClient({
  users: initialUsers,
  editeurs: initialEditeurs,
}: {
  users: User[]
  editeurs: Editeur[]
}) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [editeurs, setEditeurs] = useState<Editeur[]>(initialEditeurs)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Filtrage
  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      !q ||
      u.email?.toLowerCase().includes(q) ||
      u.pseudo?.toLowerCase().includes(q) ||
      u.nom?.toLowerCase().includes(q) ||
      u.prenom?.toLowerCase().includes(q) ||
      u.specialite?.toLowerCase().includes(q) ||
      u.rpps?.toLowerCase().includes(q)
    )
  })

  // Tri
  const sorted = [...filtered].sort((a, b) => {
    const va = sortField === 'nom' ? (a.nom || a.pseudo || '').toLowerCase() : (a.created_at || '')
    const vb = sortField === 'nom' ? (b.nom || b.pseudo || '').toLowerCase() : (b.created_at || '')
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 ml-1 inline" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-accent-blue ml-1 inline" />
      : <ChevronDown className="w-3.5 h-3.5 text-accent-blue ml-1 inline" />
  }

  const goToPage = (n: number) => setPage(Math.max(1, Math.min(totalPages, n)))

  const getEditeurForUser = (userId: string) => editeurs.find((e) => e.user_id === userId) ?? null

  const handleAssign = (userId: string, role: string, editeurId: string | null) => {
    startTransition(async () => {
      await assignEditeurToUser(userId, role, editeurId)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
      setEditeurs((prev) =>
        prev.map((e) => {
          if (e.user_id === userId) return { ...e, user_id: null }
          if (e.id === editeurId) return { ...e, user_id: userId }
          return e
        })
      )
      setSuccessId(userId)
      setTimeout(() => setSuccessId(null), 2000)
    })
  }

  const handleInlineUpdate = (userId: string, field: 'nom' | 'prenom' | 'email' | 'pseudo', value: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u)))
  }

  const handleInlineSave = async (userId: string, field: 'nom' | 'prenom' | 'email' | 'pseudo', value: string) => {
    const { updateUserField } = await import('@/lib/actions/admin-users')
    await updateUserField(userId, field, value)
  }

  const handleDelete = (userId: string) => {
    if (!confirm('Supprimer définitivement cette fiche utilisateur ?')) return
    setDeletingId(userId)
    startTransition(async () => {
      const { deleteUser } = await import('@/lib/actions/admin-users')
      await deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      setDeletingId(null)
    })
  }

  const Pagination = () => (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>{filtered.length} utilisateur{filtered.length > 1 ? 's' : ''} ({users.length} total)</span>

      {/* Navigation pages */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
        >«</button>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >← Préc.</button>

        {/* Saisie directe du numéro de page */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            placeholder={String(currentPage)}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const n = parseInt(pageInput)
                if (!isNaN(n)) goToPage(n)
                setPageInput('')
              }
            }}
            onBlur={() => {
              if (pageInput) {
                const n = parseInt(pageInput)
                if (!isNaN(n)) goToPage(n)
                setPageInput('')
              }
            }}
            className="w-14 px-2 py-1 text-sm text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
          />
          <span className="text-xs text-gray-400">/ {totalPages}</span>
        </div>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >Suiv. →</button>
        <button
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
        >»</button>
      </div>

      {/* Taille de page */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Par page :</span>
        {PAGE_SIZE_OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => { setPageSize(n); setPage(1) }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${pageSize === n ? 'bg-navy text-white border-navy' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par email, nom, prénom, pseudo, spécialité, RPPS..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue bg-white"
        />
      </div>

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <Pagination />

        {paginated.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">Aucun utilisateur trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    <button onClick={() => handleSort('nom')} className="flex items-center hover:text-navy transition-colors">
                      Nom <SortIcon field="nom" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Pseudo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Spécialité</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden xl:table-cell">RPPS</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Rôle / Éditeur</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">
                    <button onClick={() => handleSort('created_at')} className="flex items-center hover:text-navy transition-colors">
                      Inscription <SortIcon field="created_at" />
                    </button>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    editeurs={editeurs}
                    editeurAssigne={getEditeurForUser(u.id)}
                    isDeleting={deletingId === u.id}
                    isSuccess={successId === u.id}
                    onAssign={handleAssign}
                    onInlineUpdate={handleInlineUpdate}
                    onInlineSave={handleInlineSave}
                    onDelete={handleDelete}
                    roleLabels={ROLE_LABELS}
                    roleColors={ROLE_COLORS}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination />
      </div>
    </div>
  )
}

function EditableCell({
  value,
  userId,
  field,
  onUpdate,
  onSave,
  placeholder,
}: {
  value: string | null
  userId: string
  field: 'nom' | 'prenom' | 'email' | 'pseudo'
  onUpdate: (id: string, field: 'nom' | 'prenom' | 'email' | 'pseudo', value: string) => void
  onSave: (id: string, field: 'nom' | 'prenom' | 'email' | 'pseudo', value: string) => Promise<void>
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  const commit = async () => {
    setSaving(true)
    onUpdate(userId, field, val)
    await onSave(userId, field, val)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        disabled={saving}
        className="w-full px-2 py-1 text-sm border border-accent-blue rounded-lg focus:outline-none min-w-[80px]"
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer hover:bg-accent-blue/5 hover:text-accent-blue rounded px-1 py-0.5 transition-colors ${!value ? 'text-gray-300 italic text-xs' : ''}`}
      title="Cliquer pour modifier"
    >
      {value || placeholder || '—'}
    </span>
  )
}

function UserRow({
  user,
  editeurs,
  editeurAssigne,
  isDeleting,
  isSuccess,
  onAssign,
  onInlineUpdate,
  onInlineSave,
  onDelete,
  roleLabels,
  roleColors,
}: {
  user: User
  editeurs: Editeur[]
  editeurAssigne: Editeur | null
  isDeleting: boolean
  isSuccess: boolean
  onAssign: (userId: string, role: string, editeurId: string | null) => void
  onInlineUpdate: (id: string, field: 'nom' | 'prenom' | 'email' | 'pseudo', value: string) => void
  onInlineSave: (id: string, field: 'nom' | 'prenom' | 'email' | 'pseudo', value: string) => Promise<void>
  onDelete: (id: string) => void
  roleLabels: Record<string, string>
  roleColors: Record<string, string>
}) {
  const [role, setRole] = useState(user.role || 'medecin')
  const [editeurId, setEditeurId] = useState(editeurAssigne?.id ?? '')
  const hasChanged = role !== (user.role || 'medecin') || editeurId !== (editeurAssigne?.id ?? '')
  const isPsc = !!user.rpps

  return (
    <tr className={`hover:bg-surface-light transition-colors ${isDeleting ? 'opacity-40' : ''}`}>
      {/* Nom / Prénom */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            <EditableCell value={user.prenom} userId={user.id} field="prenom" onUpdate={onInlineUpdate} onSave={onInlineSave} placeholder="Prénom" />
            <EditableCell value={user.nom} userId={user.id} field="nom" onUpdate={onInlineUpdate} onSave={onInlineSave} placeholder="Nom" />
          </div>
          {isPsc && (
            <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-semibold w-fit">PSC</span>
          )}
        </div>
      </td>

      {/* Pseudo */}
      <td className="px-4 py-3">
        <EditableCell value={user.pseudo} userId={user.id} field="pseudo" onUpdate={onInlineUpdate} onSave={onInlineSave} placeholder="pseudo" />
      </td>

      {/* Email */}
      <td className="px-4 py-3 hidden md:table-cell">
        <EditableCell value={user.email} userId={user.id} field="email" onUpdate={onInlineUpdate} onSave={onInlineSave} placeholder="email" />
      </td>

      {/* Spécialité — non modifiable */}
      <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
        {user.specialite || <span className="text-gray-300 italic">—</span>}
      </td>

      {/* RPPS */}
      <td className="px-4 py-3 text-xs text-gray-400 font-mono hidden xl:table-cell">
        {user.rpps || <span className="text-gray-200">—</span>}
      </td>

      {/* Rôle + Éditeur */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); if (e.target.value !== 'editeur') setEditeurId('') }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 w-28"
          >
            {Object.entries(roleLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {role === 'editeur' && (
            <select
              value={editeurId}
              onChange={(e) => setEditeurId(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 w-full max-w-[180px]"
            >
              <option value="">— Aucun —</option>
              {editeurs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom_commercial || e.nom}
                  {e.user_id && e.user_id !== user.id ? ' ✗' : ''}
                </option>
              ))}
            </select>
          )}
          {hasChanged && (
            <button
              onClick={() => onAssign(user.id, role, editeurId || null)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors w-fit"
            >
              <Building2 className="w-3 h-3" /> Enregistrer
            </button>
          )}
          {isSuccess && (
            <span className="text-[11px] text-green-600 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Enregistré
            </span>
          )}
        </div>
      </td>

      {/* Date inscription */}
      <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
        {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'}
      </td>

      {/* Supprimer */}
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(user.id)}
          disabled={isDeleting}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
          title="Supprimer cet utilisateur"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}
