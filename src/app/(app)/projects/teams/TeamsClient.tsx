// src/app/(app)/projects/teams/TeamsClient.tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Users, X, Trash2, UserPlus,
} from 'lucide-react'
import DataTable, { useTableSort, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import TeamPill from '@/components/projects/TeamPill'

type Member = { id: string; name?: string | null; userId?: string | null; avatarUrl?: string | null; skills: string[]; user?: any }
type Team = { id: string; name: string; members: Member[]; createdAt: string }

interface Props {
  initialTeams: Team[]
  companyUsers: { id: string; name: string; avatarUrl?: string | null }[]
}

export default function TeamsClient({ initialTeams, companyUsers }: Props) {
  const router = useRouter()
  const [teams, setTeams] = useState(initialTeams)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [saving, setSaving] = useState(false)

  // Add member modal
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null)
  const [memberName, setMemberName] = useState('')
  const [memberUserId, setMemberUserId] = useState('')
  const [memberSkills, setMemberSkills] = useState('')

  const filtered = teams.filter(t => {
    if (search) return t.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const columns: Column<Team>[] = [
    {
      key: 'name', label: 'Team', sortable: true,
      sortKey: (t) => t.name.toLowerCase(),
      render: (t) => (
        <span className="font-semibold text-xs text-ink">{t.name}</span>
      ),
    },
    {
      key: 'members', label: 'Members', width: 'w-48',
      render: (t) => (
        <div className="flex items-center gap-1 flex-wrap">
          {t.members.length === 0 && <span className="text-[10px] text-ink-faint">No members</span>}
          {t.members.slice(0, 4).map(m => (
            <TeamPill key={m.id} assigneeName={m.name ?? m.user?.name} assignee={m.user} />
          ))}
          {t.members.length > 4 && (
            <span className="text-[10px] text-ink-faint">+{t.members.length - 4}</span>
          )}
        </div>
      ),
    },
    {
      key: 'count', label: 'Count', width: 'w-16', align: 'center',
      render: (t) => <span className="text-xs text-ink-muted font-mono">{t.members.length}</span>,
    },
    {
      key: 'skills', label: 'Skills', width: 'w-48',
      render: (t) => {
        const allSkills = [...new Set(t.members.flatMap(m => m.skills))]
        return (
          <div className="flex gap-1 flex-wrap">
            {allSkills.slice(0, 3).map(s => (
              <span key={s} className="badge text-[10px] bg-surface-100 text-ink-muted">{s}</span>
            ))}
            {allSkills.length > 3 && (
              <span className="text-[10px] text-ink-faint">+{allSkills.length - 3}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions', label: '', width: 'w-24', align: 'right',
      render: (t) => (
        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-1 justify-end">
          <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); setAddMemberTeamId(t.id) }}
            icon={<UserPlus className="w-3 h-3" />} title="Add member" />
          <Button variant="danger-ghost" size="xs" onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id) }}
            icon={<Trash2 className="w-3 h-3" />} title="Delete team" />
        </div>
      ),
    },
  ]

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, columns)

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim()) return
    setSaving(true)
    const res = await fetch('/api/work-teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName.trim() }),
    })
    if (!res.ok) { setSaving(false); return }
    const team = await res.json()
    setTeams(prev => [{ ...team, members: team.members ?? [] }, ...prev])
    setNewTeamName('')
    setShowCreate(false)
    setSaving(false)
  }, [newTeamName])

  const handleDeleteTeam = useCallback(async (id: string) => {
    await fetch(`/api/work-teams/${id}`, { method: 'DELETE' })
    setTeams(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleAddMember = useCallback(async () => {
    if (!addMemberTeamId) return
    if (!memberName.trim() && !memberUserId) return
    setSaving(true)
    const res = await fetch(`/api/work-teams/${addMemberTeamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: memberName.trim() || null,
        userId: memberUserId || null,
        skills: memberSkills ? memberSkills.split(',').map(s => s.trim()).filter(Boolean) : [],
      }),
    })
    if (!res.ok) { setSaving(false); return }
    const member = await res.json()
    setTeams(prev => prev.map(t =>
      t.id === addMemberTeamId ? { ...t, members: [...t.members, member] } : t
    ))
    setMemberName('')
    setMemberUserId('')
    setMemberSkills('')
    setAddMemberTeamId(null)
    setSaving(false)
  }, [addMemberTeamId, memberName, memberUserId, memberSkills])

  const handleDeleteMember = useCallback(async (teamId: string, memberId: string) => {
    await fetch(`/api/work-teams/${teamId}/members/${memberId}`, { method: 'DELETE' })
    setTeams(prev => prev.map(t =>
      t.id === teamId ? { ...t, members: t.members.filter(m => m.id !== memberId) } : t
    ))
  }, [])

  return (
    <>
      <main className="px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-semibold text-base text-ink">Work Teams</h1>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreate(true)}>
            New Team
          </Button>
        </div>

        <DataTable<Team>
          items={sorted}
          getRowId={(t) => t.id}
          columns={columns}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          onRowClick={(t) => router.push(`/projects/teams/${t.id}`)}
          expandable={{
            canExpand: (t) => t.members.length > 0,
            render: (t) => (
              <div className="px-6 py-3 bg-surface-50">
                <div className="space-y-1.5">
                  {t.members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 group">
                      <TeamPill assigneeName={m.name ?? m.user?.name} assignee={m.user} />
                      <div className="flex gap-1 flex-1">
                        {m.skills.map(s => (
                          <span key={s} className="badge text-[10px] bg-surface-100 text-ink-muted">{s}</span>
                        ))}
                      </div>
                      <button onClick={() => handleDeleteMember(t.id, m.id)}
                        className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-red-500 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ),
          }}
          emptyIcon="👥"
          emptyTitle="No teams yet"
          emptyMessage="Create teams to assign to project activities."
          toolbar={
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
              <input type="text" placeholder="Search teams…" value={search}
                onChange={e => setSearch(e.target.value)} className="input pl-8 w-48" />
            </div>
          }
        />
      </main>

      {/* Create team modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-surface-50 rounded-2xl shadow-float w-full max-w-sm mx-4 animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="font-semibold text-sm text-ink">New Team</h2>
              <button onClick={() => setShowCreate(false)} className="text-ink-faint hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="label mb-1">Team Name *</label>
              <input className="input w-full" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                placeholder="e.g. Welding Crew A" onKeyDown={e => e.key === 'Enter' && handleCreateTeam()} />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200">
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleCreateTeam}
                disabled={!newTeamName.trim()}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add member modal */}
      {addMemberTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setAddMemberTeamId(null)} />
          <div className="relative bg-surface-50 rounded-2xl shadow-float w-full max-w-sm mx-4 animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="font-semibold text-sm text-ink">Add Member</h2>
              <button onClick={() => setAddMemberTeamId(null)} className="text-ink-faint hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="label mb-1">Link to user (optional)</label>
                <select className="input w-full" value={memberUserId} onChange={e => {
                  setMemberUserId(e.target.value)
                  if (e.target.value) {
                    const u = companyUsers.find(u => u.id === e.target.value)
                    if (u) setMemberName(u.name)
                  }
                }}>
                  <option value="">External member</option>
                  {companyUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-1">Name {!memberUserId && '*'}</label>
                <input className="input w-full" value={memberName} onChange={e => setMemberName(e.target.value)}
                  placeholder="Member name" />
              </div>
              <div>
                <label className="label mb-1">Skills (comma-separated)</label>
                <input className="input w-full" value={memberSkills} onChange={e => setMemberSkills(e.target.value)}
                  placeholder="e.g. Welding, Fitting, Rigging" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200">
              <Button variant="secondary" size="sm" onClick={() => setAddMemberTeamId(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleAddMember}
                disabled={!memberName.trim() && !memberUserId}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
