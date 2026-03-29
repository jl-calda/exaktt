'use client'
import { useState } from 'react'
import { Edit3, Trash2 } from 'lucide-react'
import type { CompanyRole } from '@/types'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Props {
  userRole: CompanyRole
  initialMembers: any[]
  initialInvites: any[]
}

export default function SettingsTeamClient({ userRole, initialMembers, initialInvites }: Props) {
  const isOwner = userRole === 'OWNER'
  const isAdmin = userRole === 'ADMIN'

  const [teamMembers, setTeamMembers] = useState<any[]>(initialMembers)
  const [teamInvites, setTeamInvites] = useState<any[]>(initialInvites)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('MEMBER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<Record<string, string>>({})
  const [memberDeleteId, setMemberDeleteId] = useState<string | null>(null)

  const refreshTeam = async () => {
    const [mRes, iRes] = await Promise.all([
      fetch('/api/team').then(r => r.json()),
      fetch('/api/team/invites').then(r => r.json()),
    ])
    if (mRes.data) setTeamMembers(mRes.data)
    if (iRes.data) setTeamInvites(iRes.data)
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    await fetch('/api/team', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })
    setInviteEmail(''); setInviteLoading(false)
    refreshTeam()
  }

  const removeMember = async (userId: string) => {
    await fetch(`/api/team/${userId}`, { method: 'DELETE' })
    refreshTeam()
    setMemberDeleteId(null)
  }

  const revokeInvite = async (id: string) => {
    await fetch('/api/team/invites', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    refreshTeam()
  }

  const startEditPerms = (m: any) => {
    setEditingMemberId(m.userId)
    setEditPerms(m.permissions ?? {})
  }

  const savePerms = async () => {
    if (!editingMemberId) return
    await fetch(`/api/team/${editingMemberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: editPerms }),
    })
    setEditingMemberId(null)
    refreshTeam()
  }

  const ROLE_COLORS: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    MEMBER: 'bg-green-100 text-green-700',
    VIEWER: 'bg-surface-100 text-ink-muted',
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-[13px] text-ink mb-1">Invite Team Member</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="label">Email</label>
            <input className="input" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
          </div>
          <div className="w-32">
            <label className="label">Role</label>
            <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <button onClick={sendInvite} disabled={!inviteEmail.trim() || inviteLoading} className="btn-primary text-sm">
            {inviteLoading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>

      {/* Pending invites */}
      {teamInvites.length > 0 && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-[13px] text-ink mb-1">Pending Invites</h2>
          {teamInvites.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
              <div>
                <span className="text-sm text-ink">{inv.email}</span>
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-100 text-ink-muted">{inv.role}</span>
              </div>
              <button onClick={() => revokeInvite(inv.id)} className="text-xs text-red-500 hover:text-red-700">Revoke</button>
            </div>
          ))}
        </div>
      )}

      {/* Members list */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-[13px] text-ink mb-1">Team Members ({teamMembers.length})</h2>
        <div className="space-y-2">
          {teamMembers.map((m: any) => {
            const isEditing = editingMemberId === m.userId
            const initials = (m.user?.name || m.user?.email || '?').split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0, 2)
            return (
              <div key={m.userId} className={`p-3 border border-surface-200 ${isEditing ? 'ring-2 ring-primary bg-primary/5' : ''}`} style={{ borderRadius: 'var(--radius)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-200/40 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink">{m.user?.name || m.user?.email}</div>
                    <div className="text-xs text-ink-faint">{m.user?.email}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] ?? ''}`}>{m.role}</span>
                  {m.role !== 'OWNER' && (isOwner || isAdmin) && (
                    <div className="flex gap-1">
                      <button onClick={() => isEditing ? setEditingMemberId(null) : startEditPerms(m)} className="p-1.5 rounded-lg text-ink-faint hover:text-primary hover:bg-surface-100 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setMemberDeleteId(m.userId)} className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
                {/* Permission grid (editing) */}
                {isEditing && (m.role === 'MEMBER' || m.role === 'VIEWER') && (
                  <div className="mt-3 pt-3 border-t border-surface-200">
                    <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-2">Module Permissions</div>
                    <table className="w-full text-xs">
                      <thead><tr className="text-left">
                        <th className="py-1 font-medium text-ink-faint">Module</th>
                        <th className="py-1 font-medium text-ink-faint text-center">Write</th>
                        <th className="py-1 font-medium text-ink-faint text-center">Read</th>
                        <th className="py-1 font-medium text-ink-faint text-center">None</th>
                      </tr></thead>
                      <tbody>
                        {(['systems', 'library', 'tenders', 'logistics', 'reports'] as const).map(mod => (
                          <tr key={mod} className="border-t border-surface-100">
                            <td className="py-2 capitalize font-medium text-ink">{mod}</td>
                            {(['write', 'read', 'none'] as const).map(perm => (
                              <td key={perm} className="py-2 text-center">
                                <input type="radio" name={`perm-${mod}`} checked={(editPerms[mod] ?? 'write') === perm}
                                  onChange={() => setEditPerms(p => ({ ...p, [mod]: perm }))}
                                  className="w-3.5 h-3.5 text-primary" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex gap-2 mt-3">
                      <button onClick={savePerms} className="btn-primary text-xs">Save Permissions</button>
                      <button onClick={() => setEditingMemberId(null)} className="btn-secondary text-xs">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmModal
        open={memberDeleteId !== null}
        title="Remove member?"
        message="This person will lose access to all company data."
        onConfirm={() => { if (memberDeleteId) removeMember(memberDeleteId) }}
        onCancel={() => setMemberDeleteId(null)}
      />
    </div>
  )
}
