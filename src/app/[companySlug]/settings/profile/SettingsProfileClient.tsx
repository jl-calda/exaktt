'use client'
import { useState, useRef } from 'react'
import { Save, Camera, Plus, X, AlertCircle } from 'lucide-react'

interface Education { degree: string; institution: string; year: string; field: string }
interface Certification { name: string; issuedBy: string; issueDate: string; expiryDate: string; certNumber: string }
interface Benefit { type: string; provider: string; policyNo: string; coverage: string; expiryDate: string }

const WORK_PASS_TYPES = [
  { value: '', label: 'Not set' },
  { value: 'CITIZEN', label: 'Citizen' },
  { value: 'PR', label: 'Permanent Resident' },
  { value: 'EP', label: 'Employment Pass' },
  { value: 'S_PASS', label: 'S Pass' },
  { value: 'WORK_PERMIT', label: 'Work Permit' },
  { value: 'DEP_PASS', label: "Dependant's Pass" },
]

const SALARY_TYPES: Record<string, string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
  HOURLY: 'Hourly',
  DAILY: 'Daily',
}

const CPF_RATES: Record<string, string> = {
  FULL: 'Full Rate',
  GRADUATED: 'Graduated',
  EXEMPT: 'Exempt',
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-green-100 text-green-700',
  VIEWER: 'bg-surface-100 text-ink-muted',
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  return date.toISOString().split('T')[0]
}

function maskNric(val: string): string {
  if (!val || val.length < 5) return val
  return '****' + val.slice(-5)
}

function isExpiringSoon(dateStr: string): 'expired' | 'warning' | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  if (d < now) return 'expired'
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 90) return 'warning'
  return null
}

function formatCurrency(amount: number | null | undefined, currency: string): string {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency }).format(amount)
}

interface Props {
  initialUser: any
  initialEmployee: any | null
  departments: { id: string; name: string; color: string }[]
  role: string
}

export default function SettingsProfileClient({ initialUser, initialEmployee, departments, role }: Props) {
  const hasEmployee = !!initialEmployee
  const fileRef = useRef<HTMLInputElement>(null)

  // User fields
  const [phone, setPhone] = useState(initialUser?.phone ?? '')
  const [bio, setBio] = useState(initialUser?.bio ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(formatDate(initialUser?.dateOfBirth))
  const [nationality, setNationality] = useState(initialUser?.nationality ?? '')
  const [userName, setUserName] = useState(initialUser?.name ?? '')

  // Employee fields (only used if hasEmployee)
  const [firstName, setFirstName] = useState(initialEmployee?.firstName ?? '')
  const [middleName, setMiddleName] = useState(initialEmployee?.middleName ?? '')
  const [lastName, setLastName] = useState(initialEmployee?.lastName ?? '')
  const [suffix, setSuffix] = useState(initialEmployee?.suffix ?? '')
  const [ethnicity, setEthnicity] = useState(initialEmployee?.ethnicity ?? '')

  // Singapore compliance
  const [nricFin, setNricFin] = useState(initialEmployee?.nricFin ?? '')
  const [nricVisible, setNricVisible] = useState(false)
  const [workPassType, setWorkPassType] = useState(initialEmployee?.workPassType ?? '')
  const [workPassExpiry, setWorkPassExpiry] = useState(formatDate(initialEmployee?.workPassExpiry))

  // Education
  const [education, setEducation] = useState<Education[]>(initialEmployee?.education ?? [])

  // Certifications
  const [certifications, setCertifications] = useState<Certification[]>(initialEmployee?.certifications ?? [])

  // Skills
  const [skills, setSkills] = useState<string[]>(initialEmployee?.skills ?? [])
  const [newSkill, setNewSkill] = useState('')

  // Emergency
  const [emergencyName, setEmergencyName] = useState(initialEmployee?.emergencyName ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(initialEmployee?.emergencyPhone ?? '')
  const [emergencyRelation, setEmergencyRelation] = useState(initialEmployee?.emergencyRelation ?? '')

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(initialUser?.avatarUrl ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // UI
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const showSaved = (msg = 'Profile saved') => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 2500) }

  // Display name: use employee name if available, else user name
  const displayFirstName = hasEmployee ? firstName : userName?.split(' ')[0] ?? ''
  const displayLastName = hasEmployee ? lastName : userName?.split(' ').slice(1).join(' ') ?? ''
  const initials = `${displayFirstName?.[0] ?? ''}${displayLastName?.[0] ?? ''}`.toUpperCase() || '?'
  const displayAvatar = avatarPreview || avatarUrl

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setSaving(true)

    // Upload avatar if changed
    if (avatarFile) {
      const fd = new FormData()
      fd.append('avatar', avatarFile)
      const res = await fetch('/api/user/profile', { method: 'POST', body: fd })
      if (res.ok) {
        const { avatarUrl: newUrl } = await res.json()
        setAvatarUrl(newUrl)
        setAvatarPreview(null)
        setAvatarFile(null)
      }
    }

    // Build payload
    const payload: any = {
      userFields: {
        name: hasEmployee ? `${firstName} ${lastName}`.trim() : userName,
        phone: phone || null,
        bio: bio || null,
        dateOfBirth: dateOfBirth || null,
        nationality: nationality || null,
      },
    }

    if (hasEmployee) {
      payload.employeeFields = {
        firstName, middleName: middleName || null, lastName, suffix: suffix || null,
        ethnicity: ethnicity || null,
        nricFin: nricFin || null, workPassType: workPassType || null,
        workPassExpiry: workPassExpiry || null,
        education, certifications, skills,
        emergencyName: emergencyName || null,
        emergencyPhone: emergencyPhone || null,
        emergencyRelation: emergencyRelation || null,
      }
    }

    await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    showSaved()
  }

  const showPassExpiry = ['EP', 'S_PASS', 'WORK_PERMIT', 'DEP_PASS'].includes(workPassType)

  // Read-only data from employee
  const deptName = initialEmployee?.department?.name
  const jobTitle = initialEmployee?.jobTitle
  const employeeId = initialEmployee?.employeeId
  const hireDate = initialEmployee?.hireDate
  const salaryType = initialEmployee?.salaryType
  const salaryAmount = initialEmployee?.salaryAmount
  const currency = initialEmployee?.currency ?? 'SGD'
  const cpfContribRate = initialEmployee?.cpfContribRate
  const benefits: Benefit[] = initialEmployee?.benefits ?? []

  const canSave = hasEmployee ? (firstName.trim() && lastName.trim()) : userName.trim()

  return (
    <div className="space-y-5 max-w-2xl">
      {saveMsg && (
        <div className="fixed top-[5.5rem] right-4 z-50 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-card animate-fade-in">
          {saveMsg}
        </div>
      )}

      {/* ── Avatar + Name ───────────────────────────────────── */}
      <div className="card p-6 flex items-center gap-5">
        <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-surface-200" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-surface-200/40 flex items-center justify-center text-xl font-bold text-primary border-2 border-surface-200">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">
            {hasEmployee
              ? `${firstName} ${middleName ? `${middleName} ` : ''}${lastName}${suffix ? ` ${suffix}` : ''}`
              : userName || initialUser?.email}
          </div>
          <div className="text-xs text-ink-faint mt-0.5">{initialUser?.email}</div>
          <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[role] ?? ''}`}>{role}</span>
        </div>
      </div>

      {/* ── Personal Information ─────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-[13px] text-ink">Personal Information</h2>

        {hasEmployee ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className="input" placeholder="Juan" />
              </div>
              <div>
                <label className="label">Middle Name</label>
                <input value={middleName} onChange={e => setMiddleName(e.target.value)} className="input" placeholder="Santos" />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} className="input" placeholder="Dela Cruz" />
              </div>
              <div>
                <label className="label">Suffix</label>
                <input value={suffix} onChange={e => setSuffix(e.target.value)} className="input" placeholder="Jr., Sr., III" />
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="label">Full Name</label>
            <input value={userName} onChange={e => setUserName(e.target.value)} className="input" placeholder="Your name" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input value={initialUser?.email ?? ''} disabled className="input opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+65 9123 4567" />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Nationality</label>
            <input value={nationality} onChange={e => setNationality(e.target.value)} className="input" placeholder="Singaporean" />
          </div>
          {hasEmployee && (
            <div>
              <label className="label">Ethnicity</label>
              <input value={ethnicity} onChange={e => setEthnicity(e.target.value)} className="input" placeholder="Chinese, Malay, Indian, etc." />
            </div>
          )}
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="input resize-none" placeholder="A brief introduction..." />
        </div>
      </div>

      {/* ── Employee-only sections below ──────────────────────── */}
      {hasEmployee && (
        <>
          {/* ── Work Information (read-only) ─────────────────── */}
          <div className="card p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-[13px] text-ink">Work Information</h2>
              <p className="text-[10px] text-ink-faint mt-0.5">Managed by your company</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Job Title</label>
                <input value={jobTitle ?? ''} disabled className="input opacity-60 cursor-not-allowed" />
              </div>
              <div>
                <label className="label">Department</label>
                <input value={deptName ?? 'No department'} disabled className="input opacity-60 cursor-not-allowed" />
              </div>
              <div>
                <label className="label">Employee ID</label>
                <input value={employeeId ?? ''} disabled className="input opacity-60 cursor-not-allowed" />
              </div>
              <div>
                <label className="label">Hire Date</label>
                <input value={hireDate ? formatDate(hireDate) : ''} disabled className="input opacity-60 cursor-not-allowed" />
              </div>
            </div>
          </div>

          {/* ── Employment & Compliance ──────────────────────── */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-[13px] text-ink">Employment &amp; Compliance</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">NRIC / FIN</label>
                <input
                  value={nricVisible ? nricFin : maskNric(nricFin)}
                  onChange={e => { setNricFin(e.target.value); setNricVisible(true) }}
                  onFocus={() => setNricVisible(true)}
                  onBlur={() => setNricVisible(false)}
                  className="input"
                  placeholder="S1234567A"
                />
              </div>
              <div>
                <label className="label">Work Pass Type</label>
                <select value={workPassType} onChange={e => setWorkPassType(e.target.value)} className="input">
                  {WORK_PASS_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {showPassExpiry && (
                <div>
                  <label className="label">Work Pass Expiry</label>
                  <input type="date" value={workPassExpiry} onChange={e => setWorkPassExpiry(e.target.value)} className="input" />
                  {isExpiringSoon(workPassExpiry) === 'expired' && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-red-600"><AlertCircle className="w-3 h-3" /> Expired</div>
                  )}
                  {isExpiringSoon(workPassExpiry) === 'warning' && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600"><AlertCircle className="w-3 h-3" /> Expiring soon</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Compensation (read-only) ─────────────────────── */}
          {(salaryType || salaryAmount) && (
            <div className="card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-[13px] text-ink">Compensation</h2>
                <p className="text-[10px] text-ink-faint mt-0.5">Managed by your company</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Salary Type</label>
                  <input value={SALARY_TYPES[salaryType ?? ''] ?? '—'} disabled className="input opacity-60 cursor-not-allowed" />
                </div>
                <div>
                  <label className="label">Salary Amount</label>
                  <input value={formatCurrency(salaryAmount, currency)} disabled className="input opacity-60 cursor-not-allowed font-mono" />
                </div>
              </div>
            </div>
          )}

          {/* ── Benefits & Leave (read-only) ─────────────────── */}
          {(benefits.length > 0 || cpfContribRate) && (
            <div className="card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-[13px] text-ink">Benefits &amp; Leave</h2>
                <p className="text-[10px] text-ink-faint mt-0.5">Managed by your company</p>
              </div>
              {cpfContribRate && (
                <div>
                  <label className="label">CPF Contribution Rate</label>
                  <input value={CPF_RATES[cpfContribRate] ?? cpfContribRate} disabled className="input opacity-60 cursor-not-allowed" />
                </div>
              )}
              {benefits.length > 0 && (
                <div className="space-y-2">
                  <label className="label">Insurance &amp; Benefits</label>
                  {benefits.map((b, i) => {
                    const expiry = isExpiringSoon(b.expiryDate)
                    return (
                      <div key={i} className="p-3 rounded-lg border border-surface-200 bg-surface-50 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-ink">{b.type}</span>
                          {expiry === 'expired' && (
                            <span className="flex items-center gap-1 text-[10px] text-red-600"><AlertCircle className="w-3 h-3" /> Expired</span>
                          )}
                          {expiry === 'warning' && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-600"><AlertCircle className="w-3 h-3" /> Expiring soon</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-ink-faint">
                          {b.provider && <div>Provider: <span className="text-ink">{b.provider}</span></div>}
                          {b.policyNo && <div>Policy: <span className="text-ink">{b.policyNo}</span></div>}
                          {b.coverage && <div>Coverage: <span className="text-ink">{b.coverage}</span></div>}
                          {b.expiryDate && <div>Expiry: <span className="text-ink">{formatDate(b.expiryDate)}</span></div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Emergency Contact ────────────────────────────── */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-[13px] text-ink">Emergency Contact</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Name</label>
                <input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className="input" placeholder="Full name" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className="input" placeholder="+65 9123 4567" />
              </div>
              <div>
                <label className="label">Relationship</label>
                <input value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)} className="input" placeholder="Spouse" />
              </div>
            </div>
          </div>

          {/* ── Education ────────────────────────────────────── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[13px] text-ink">Education</h2>
              <button onClick={() => setEducation(e => [...e, { degree: '', institution: '', year: '', field: '' }])}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Education
              </button>
            </div>
            {education.length === 0 && (
              <p className="text-xs text-ink-faint">No education records added yet.</p>
            )}
            {education.map((edu, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-surface-200 bg-surface-50">
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <input value={edu.degree} onChange={e => setEducation(es => es.map((x, j) => j === i ? { ...x, degree: e.target.value } : x))} className="input text-xs" placeholder="Degree (e.g. BSc)" />
                  <input value={edu.field} onChange={e => setEducation(es => es.map((x, j) => j === i ? { ...x, field: e.target.value } : x))} className="input text-xs" placeholder="Field of Study" />
                  <input value={edu.institution} onChange={e => setEducation(es => es.map((x, j) => j === i ? { ...x, institution: e.target.value } : x))} className="input text-xs" placeholder="Institution" />
                  <input value={edu.year} onChange={e => setEducation(es => es.map((x, j) => j === i ? { ...x, year: e.target.value } : x))} className="input text-xs" placeholder="Year (e.g. 2020)" />
                </div>
                <button onClick={() => setEducation(es => es.filter((_, j) => j !== i))} className="p-1 text-ink-faint hover:text-red-500"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>

          {/* ── Certifications ───────────────────────────────── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[13px] text-ink">Certifications</h2>
              <button onClick={() => setCertifications(c => [...c, { name: '', issuedBy: '', issueDate: '', expiryDate: '', certNumber: '' }])}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Certification
              </button>
            </div>
            {certifications.length === 0 && (
              <p className="text-xs text-ink-faint">No certifications added yet.</p>
            )}
            {certifications.map((cert, i) => {
              const expiry = isExpiringSoon(cert.expiryDate)
              return (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-surface-200 bg-surface-50">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <input value={cert.name} onChange={e => setCertifications(cs => cs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="input text-xs" placeholder="Certification Name" />
                    <input value={cert.issuedBy} onChange={e => setCertifications(cs => cs.map((x, j) => j === i ? { ...x, issuedBy: e.target.value } : x))} className="input text-xs" placeholder="Issued By" />
                    <input value={cert.certNumber} onChange={e => setCertifications(cs => cs.map((x, j) => j === i ? { ...x, certNumber: e.target.value } : x))} className="input text-xs" placeholder="Cert Number" />
                    <div>
                      <input type="date" value={cert.issueDate} onChange={e => setCertifications(cs => cs.map((x, j) => j === i ? { ...x, issueDate: e.target.value } : x))} className="input text-xs" />
                      <span className="text-[10px] text-ink-faint">Issue date</span>
                    </div>
                    <div>
                      <input type="date" value={cert.expiryDate} onChange={e => setCertifications(cs => cs.map((x, j) => j === i ? { ...x, expiryDate: e.target.value } : x))} className="input text-xs" />
                      {expiry === 'expired' && <span className="text-[10px] text-red-600">Expired</span>}
                      {expiry === 'warning' && <span className="text-[10px] text-amber-600">Expiring soon</span>}
                      {!expiry && <span className="text-[10px] text-ink-faint">Expiry date</span>}
                    </div>
                  </div>
                  <button onClick={() => setCertifications(cs => cs.filter((_, j) => j !== i))} className="p-1 text-ink-faint hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              )
            })}
          </div>

          {/* ── Skills ───────────────────────────────────────── */}
          <div className="card p-6 space-y-3">
            <h2 className="font-semibold text-[13px] text-ink">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-100 border border-surface-200 text-xs text-ink">
                  {s}
                  <button onClick={() => setSkills(sk => sk.filter((_, j) => j !== i))} className="text-ink-faint hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSkill.trim()) {
                    setSkills(s => [...s, newSkill.trim()])
                    setNewSkill('')
                  }
                }}
                className="input flex-1"
                placeholder="Add a skill and press Enter"
              />
              <button
                onClick={() => {
                  if (newSkill.trim()) {
                    setSkills(s => [...s, newSkill.trim()])
                    setNewSkill('')
                  }
                }}
                disabled={!newSkill.trim()}
                className="btn-ghost text-xs px-3"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Save ─────────────────────────────────────────────── */}
      <button onClick={handleSave} disabled={saving || !canSave}
        className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        {saving ? 'Saving\u2026' : 'Save Profile'}
      </button>
    </div>
  )
}
