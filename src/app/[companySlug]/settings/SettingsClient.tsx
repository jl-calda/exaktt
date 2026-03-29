// src/app/settings/SettingsClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Tag, User2, Save, Crown, Palette, Sun, Moon, Monitor, DollarSign, Edit3, Check, X, Users2, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { CompanyProfile, GlobalTag, CompanyRole } from '@/types'
import type { Plan } from '@prisma/client'
import { getLimits, PLAN_META } from '@/lib/limits'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeProvider'
import { Select } from '@/components/ui/Select'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { THEME_PRESETS } from '@/lib/theme'

type Tab = 'company' | 'team' | 'labour' | 'appearance' | 'account'

const COUNTRIES = [
  'Australia', 'Canada', 'China', 'India', 'Indonesia', 'Japan', 'Malaysia',
  'New Zealand', 'Philippines', 'Singapore', 'South Korea', 'Thailand',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam',
].map(c => ({ value: c, label: c }))

const UNIT_OPTIONS = [
  { value: 'per_piece', label: 'Per piece' },
  { value: 'per_dim',   label: 'Per dimension' },
  { value: 'per_hour',  label: 'Per hour' },
  { value: 'lump_sum',  label: 'Lump sum' },
]

const LABOUR_ICONS: Record<string, string> = {
  'Worker': '👷', 'Supervisor': '👔', 'Foreman': '🏗️', 'Skilled Trade': '🔧', 'Apprentice': '🎓',
}

const TAG_COLORS = ['#7c3aed','#0891b2','#059669','#dc2626','#b45309','#be185d','#4f46e5','#0369a1','#64748b','#f59e0b']

interface Props {
  user:           { id: string; email: string; name?: string | null; subscription?: { plan: Plan } | null }
  initialProfile: CompanyProfile | null
  initialTags:    GlobalTag[]
  initialLabourRates: any[]
  userRole:       CompanyRole
  members?:       any[]
  invites?:       any[]
}

export default function SettingsClient({ user, initialProfile, initialTags, initialLabourRates, userRole, members, invites }: Props) {
  const isOwner = userRole === 'OWNER'
  const isAdmin = userRole === 'ADMIN'
  const router   = useRouter()
  const supabase = createClient()
  const plan     = user.subscription?.plan ?? 'FREE'
  const limits   = getLimits(plan)
  const { theme, isDark, setTheme, setDark } = useTheme()

  const [tab,     setTab]     = useState<Tab>('company')
  const [profile, setProfile] = useState<CompanyProfile>(initialProfile ?? {
    id: '', userId: '', registrationLabel: '', defaultShowPricing: false,
    country: 'Singapore', defaultCurrency: 'SGD', reportLogoPosition: 'left', reportAccentColor: '#0f172a',
  })
  const [tags,       setTags]       = useState<GlobalTag[]>(initialTags)
  const [saving,     setSaving]     = useState(false)
  const [saveMsg,    setSaveMsg]    = useState<string | null>(null)
  // ─── Labour Rates state (owner-only) ──────────────────────────────────────
  const [labourRates, setLabourRates] = useState<any[]>(initialLabourRates)
  const [editingRateId, setEditingRateId] = useState<string | null>(null)
  const [editRateValue, setEditRateValue] = useState('')
  // ─── Team state ────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<any[]>(members ?? [])
  const [teamInvites, setTeamInvites] = useState<any[]>(invites ?? [])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('MEMBER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editPerms, setEditPerms] = useState<Record<string, string>>({})
  const [memberDeleteId, setMemberDeleteId] = useState<string | null>(null)

  const refreshLabourRates = () =>
    fetch('/api/mto/labour-rates').then(r => r.json()).then(j => { if (j.data) setLabourRates(j.data) })

  const startEditRate = (r: any) => { setEditingRateId(r.id); setEditRateValue(String(r.rate ?? 0)) }
  const cancelEditRate = () => { setEditingRateId(null); setEditRateValue('') }
  const saveLabourRate = async (r: any) => {
    const rate = parseFloat(editRateValue) || 0
    await fetch('/api/mto/labour-rates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, rate }) })
    setEditingRateId(null)
    refreshLabourRates()
    showSaved('Rate saved')
  }

  const showSaved = (msg = 'Saved') => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 2500) }

  // ─── Team handlers ─────────────────────────────────────────────────────
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

  const saveProfile = async () => {
    setSaving(true)
    await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    setSaving(false); showSaved('Profile saved')
  }

  const saveTags = async (updated: GlobalTag[]) => {
    await fetch('/api/tags', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: updated }) })
  }

  const set = (k: keyof CompanyProfile) => (v: any) => setProfile(p => ({ ...p, [k]: v }))

  const TABS = [
    { id: 'company' as Tab, label: 'Company Profile', icon: <Building2 className="w-[15px] h-[15px] shrink-0" /> },
    ...((isOwner || isAdmin) ? [{ id: 'team' as Tab, label: 'Team', icon: <Users2 className="w-[15px] h-[15px] shrink-0" /> }] : []),
    ...(isOwner ? [{ id: 'labour' as Tab, label: 'Labour Rates', icon: <DollarSign className="w-[15px] h-[15px] shrink-0" /> }] : []),
    { id: 'appearance' as Tab, label: 'Appearance', icon: <Palette className="w-[15px] h-[15px] shrink-0" /> },
    { id: 'account' as Tab, label: 'Account', icon: <User2 className="w-[15px] h-[15px] shrink-0" /> },
  ]

  return (
    <div className="min-h-full flex">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-48 shrink-0 border-r border-surface-200 bg-surface-50 flex-col sticky top-0 self-start overflow-y-auto"
        style={{ height: 'calc(100vh - 52px)', borderRight: '1px solid var(--sidebar-border)' }}>

        {/* Header */}
        <div className="px-3 py-3 border-b border-surface-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-surface-200/40 flex items-center justify-center text-sm flex-shrink-0">&#x2699;&#xFE0F;</span>
            <span className="font-semibold text-xs text-ink leading-tight truncate">Settings</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 flex flex-col gap-px">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`sidebar-item text-[11px] ${tab === t.id ? 'active' : ''}`}>
              <span className={`icon-well ${tab === t.id ? 'text-primary' : ''}`}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-surface-200 space-y-1">
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Members</span>
            <span className="font-semibold text-ink">{teamMembers.length}</span>
          </div>
          <div className="flex justify-between text-[10px] text-ink-faint">
            <span>Plan</span>
            <span className="font-semibold text-ink">{plan}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 py-4 md:px-6 md:py-5 flex flex-col gap-4">
        {saveMsg && (
          <div className="fixed top-[5.5rem] right-4 z-50 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-card">
            {saveMsg}
          </div>
        )}
        {/* Mobile tab bar */}
        <div className="flex md:hidden overflow-x-auto gap-1 pb-2 -mx-1 px-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-primary text-white' : 'text-ink-muted hover:bg-surface-200 hover:text-ink'}`}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── Company Profile ─────────────────────────────────── */}
          {tab === 'company' && (
            <div className="space-y-5">
              {!limits.canBrandReports && (
                <div className="card p-4 flex items-center gap-3 bg-primary/5 border-primary/20">
                  <span className="w-8 h-8 rounded-lg bg-surface-200/40 flex items-center justify-center flex-shrink-0">
                    <Crown className="w-4 h-4 text-primary" />
                  </span>
                  <div className="flex-1 text-sm text-ink">Company branding on reports requires <strong>Pro or Max</strong> plan.</div>
                  <button onClick={() => router.push('/billing')} className="btn-primary text-xs py-1.5 px-3">Upgrade</button>
                </div>
              )}

              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-[13px] text-ink">Company Identity</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Company Name</label>
                    <input value={profile.companyName ?? ''} onChange={e => set('companyName')(e.target.value)} className="input" placeholder="Acme QS Consultants" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input value={profile.phone ?? ''} onChange={e => set('phone')(e.target.value)} className="input" placeholder="+65 1234 5678" />
                  </div>
                  <div>
                    <label className="label">Website</label>
                    <input value={profile.website ?? ''} onChange={e => set('website')(e.target.value)} className="input" placeholder="www.yourfirm.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <input value={profile.address ?? ''} onChange={e => set('address')(e.target.value)} className="input" placeholder="123 Orchard Road" />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input value={profile.city ?? ''} onChange={e => set('city')(e.target.value)} className="input" placeholder="Singapore" />
                  </div>
                  <div>
                    <label className="label">Country</label>
                    <Select options={COUNTRIES} value={profile.country ?? ''} onChange={e => set('country')(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-[13px] text-ink">Professional Registration</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Label (e.g. UEN, ABN)</label>
                    <input value={profile.registrationLabel ?? ''} onChange={e => set('registrationLabel')(e.target.value)} className="input" placeholder="UEN" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Registration Number</label>
                    <input value={profile.registrationNumber ?? ''} onChange={e => set('registrationNumber')(e.target.value)} className="input" placeholder="202312345A" />
                  </div>
                  <div className="col-span-3">
                    <label className="label">QS Licence Number</label>
                    <input value={profile.qs_license ?? ''} onChange={e => set('qs_license')(e.target.value)} className="input" placeholder="QS/2024/12345" />
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-[13px] text-ink">Report Defaults</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Default Prepared By</label>
                    <input value={profile.defaultPreparedBy ?? ''} onChange={e => set('defaultPreparedBy')(e.target.value)} className="input" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="label">Default Currency</label>
                    <select value={profile.defaultCurrency} onChange={e => set('defaultCurrency')(e.target.value)} className="input">
                      {['SGD','USD','AUD','GBP','EUR','MYR','THB'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Logo Position</label>
                    <select value={profile.reportLogoPosition} onChange={e => set('reportLogoPosition')(e.target.value)} className="input">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Report Accent Colour</label>
                    <input type="color" value={profile.reportAccentColor} onChange={e => set('reportAccentColor')(e.target.value)}
                      className="h-10 w-full rounded-lg border border-surface-300 p-1 cursor-pointer" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Default Disclaimer</label>
                    <textarea value={profile.defaultDisclaimer ?? ''} onChange={e => set('defaultDisclaimer')(e.target.value)}
                      rows={3} className="input resize-none"
                      placeholder="This take-off is based on design drawings dated... Quantities are approximate..." />
                  </div>
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving}
                className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* ── Labour Rates (owner only) ────────────────────────── */}
          {tab === 'labour' && isOwner && (
            <div className="space-y-5">
              <div className="card p-6">
                <h2 className="font-semibold text-[13px] text-ink mb-1">Labour Rates</h2>
                <p className="text-sm text-ink-muted mb-5">Set the hourly or unit rates for each labour category. Only owners can see these values — other team members will only see the category names.</p>

                {labourRates.length === 0 ? (
                  <div className="text-center py-8 text-sm text-ink-faint">
                    No labour categories yet. Add them from Logistics &rarr; Fabrication &rarr; Labour Categories.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {labourRates.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-300 bg-surface-50">
                        <span className="text-lg flex-shrink-0">{LABOUR_ICONS[r.name] ?? '👷'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink">{r.name}</div>
                          <div className="text-[11px] text-ink-faint">{UNIT_OPTIONS.find(o => o.value === r.unitType)?.label ?? r.unitType} &middot; /{r.unitLabel}</div>
                        </div>
                        {editingRateId === r.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-ink-muted">$</span>
                            <input type="number" step="any" min={0} value={editRateValue}
                              onChange={e => setEditRateValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveLabourRate(r); if (e.key === 'Escape') cancelEditRate() }}
                              className="input w-24 text-sm font-mono" autoFocus />
                            <span className="text-xs text-ink-faint">/{r.unitLabel}</span>
                            <button onClick={() => saveLabourRate(r)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={cancelEditRate} className="p-1.5 rounded-lg bg-surface-200 text-ink-muted hover:bg-surface-300"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditRate(r)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-300 hover:border-primary hover:bg-primary/5 transition-all group">
                            <span className="text-sm font-mono font-semibold text-ink">${r.rate?.toFixed(2) ?? '0.00'}</span>
                            <span className="text-xs text-ink-faint">/{r.unitLabel}</span>
                            <Edit3 className="w-3 h-3 text-ink-faint group-hover:text-primary transition-colors" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Team ─────────────────────────────────────────────── */}
          {tab === 'team' && (
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
                  {teamInvites.map(inv => (
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
                  {teamMembers.map(m => {
                    const isEditing = editingMemberId === m.userId
                    const ROLE_COLORS: Record<string, string> = { OWNER: 'bg-purple-100 text-purple-700', ADMIN: 'bg-blue-100 text-blue-700', MEMBER: 'bg-green-100 text-green-700', VIEWER: 'bg-surface-100 text-ink-muted' }
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
          )}

          {/* ── Appearance ───────────────────────────────────────── */}
          {tab === 'appearance' && (
            <div className="space-y-5">

              {/* Light / Dark */}
              <div className="card p-5">
                <h2 className="font-semibold text-[13px] text-ink mb-4">Mode</h2>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: 'Light', icon: <Sun  className="w-4 h-4" />, value: false },
                    { label: 'Dark',  icon: <Moon className="w-4 h-4" />, value: true  },
                  ] as const).map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setDark(opt.value)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        isDark === opt.value
                          ? 'bg-surface-50 border-primary shadow-sm ring-1 ring-primary/20 text-primary'
                          : 'bg-surface-100/60 border-surface-200 text-ink-muted hover:bg-surface-100'
                      }`}>
                      {opt.icon}
                      <span className="font-medium text-[13px]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color preset */}
              <div className="card p-5">
                <h2 className="font-semibold text-[13px] text-ink mb-1">Color Preset</h2>
                <p className="text-xs text-ink-faint mb-4">Changes the accent color and surface tones across the app.</p>
                <div className="grid grid-cols-2 gap-3">
                  {THEME_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setTheme(preset.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left ${
                        theme === preset.id
                          ? 'bg-surface-50 border-primary shadow-sm ring-1 ring-primary/20'
                          : 'bg-surface-100/60 border-surface-200 hover:bg-surface-100'
                      }`}>
                      {/* Swatch */}
                      <div className="flex gap-1 shrink-0">
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.accent }} />
                        <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.surface }} />
                      </div>
                      <div className="min-w-0">
                        <div className={`font-semibold text-[13px] ${theme === preset.id ? 'text-primary' : 'text-ink'}`}>
                          {preset.name}
                        </div>
                        <div className="text-[11px] text-ink-faint truncate">{preset.description}</div>
                      </div>
                      {theme === preset.id && (
                        <div className="ml-auto w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-primary)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Account ──────────────────────────────────────────── */}
          {tab === 'account' && (
            <div className="space-y-5">
              <div className="card p-6">
                <h2 className="font-semibold text-[13px] text-ink mb-4">Account</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-surface-200">
                    <span className="text-ink-muted">Email</span>
                    <span className="text-ink font-medium">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-surface-200">
                    <span className="text-ink-muted">Plan</span>
                    <span className="font-bold" style={{ color: PLAN_META[plan].color }}>{PLAN_META[plan].name}</span>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="font-semibold text-[13px] text-ink mb-4 text-red-600">Danger Zone</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink">Sign out</div>
                    <div className="text-xs text-ink-faint">Sign out of your account on this device</div>
                  </div>
                  <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
                    className="btn-secondary text-sm">Sign out</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
