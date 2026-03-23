// src/components/calculator/panels/AddMaterialModal.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { Check, Loader2, X, ImagePlus, Plus, ChevronDown } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { ManufacturerModal } from '@/components/logistics/ManufacturersTab'
import { nanoid } from 'nanoid'

interface Props {
  open:         boolean
  initialName?: string
  onClose:      () => void
  onAddFromLib: (item: any) => void
}

const DEFAULT_CURRENCIES = ['SGD', 'USD', 'AUD', 'GBP', 'EUR', 'MYR', 'PHP', 'IDR']
const BLANK_FORM = { name: '', unit: 'each', category: 'other', productCode: '', notes: '', photo: '', gradeId: '', manufacturerId: '' }
const BLANK_SPEC = { supplier: '', supplierCode: '', unitPrice: '' as any, currency: 'SGD', stockLengthMm: '' as any, leadTimeDays: '' as any, packSize: '' as any, moq: '' as any }

// ─── Comboboxes ───────────────────────────────────────────────────────────────

function CategoryCombobox({ categories, value, onChange, onNew }: {
  categories: any[]; value: string; onChange: (v: string) => void; onNew: () => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const allNames = ['other', ...categories.map((c: any) => c.name).filter((n: string) => n !== 'other')]
  const matches  = allNames.filter(n => !query.trim() || n.toLowerCase().includes(query.toLowerCase()))
  const getIcon  = (name: string) => categories.find((c: any) => c.name === name)?.icon ?? '📦'

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 text-left w-full">
        <span className="flex items-center gap-1.5 text-xs truncate">
          <span>{getIcon(value)}</span>
          <span className="text-ink">{value || 'other'}</span>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-surface-200 shadow-float py-1 min-w-48" style={{ borderRadius: 'var(--radius)' }}>
          <div className="px-2 pb-1">
            <input className="input text-xs py-1" placeholder="Search…" value={query}
              onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <ul className="max-h-40 overflow-y-auto">
            {matches.map(n => (
              <li key={n}>
                <button type="button" onMouseDown={e => { e.preventDefault(); onChange(n); setOpen(false); setQuery('') }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 flex items-center gap-2 ${value === n ? 'font-semibold text-primary' : 'text-ink'}`}>
                  <span>{getIcon(n)}</span> {n}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No match</li>}
          </ul>
          <div className="border-t border-surface-200 mt-1 pt-1 px-2 pb-1">
            <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(false); onNew() }}
              className="flex items-center gap-1 text-xs text-primary hover:underline px-1 py-0.5">
              <Plus className="w-3 h-3" /> New category
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GradeCombobox({ grades, value, onChange, onNew }: {
  grades: any[]; value: string; onChange: (id: string) => void; onNew: () => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selected = grades.find((g: any) => g.id === value)
  const matches  = grades.filter((g: any) =>
    !query.trim() || g.name.toLowerCase().includes(query.toLowerCase()) || g.materialType?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 text-left w-full">
        <span className="text-xs text-ink truncate">
          {selected ? selected.name + (selected.materialType ? ` · ${selected.materialType}` : '') : 'None'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-surface-200 shadow-float py-1 min-w-48" style={{ borderRadius: 'var(--radius)' }}>
          <div className="px-2 pb-1">
            <input className="input text-xs py-1" placeholder="Search…" value={query}
              onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <ul className="max-h-40 overflow-y-auto">
            <li>
              <button type="button" onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false); setQuery('') }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 ${!value ? 'font-semibold text-primary' : 'text-ink-muted'}`}>
                None
              </button>
            </li>
            {matches.map((g: any) => (
              <li key={g.id}>
                <button type="button" onMouseDown={e => { e.preventDefault(); onChange(g.id); setOpen(false); setQuery('') }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 flex items-center justify-between gap-2 ${value === g.id ? 'font-semibold text-primary' : 'text-ink'}`}>
                  <span>{g.name}</span>
                  {g.materialType && <span className="text-[10px] text-ink-faint">{g.materialType}</span>}
                </button>
              </li>
            ))}
            {matches.length === 0 && grades.length > 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No match</li>}
            {grades.length === 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No grades yet</li>}
          </ul>
          <div className="border-t border-surface-200 mt-1 pt-1 px-2 pb-1">
            <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(false); onNew() }}
              className="flex items-center gap-1 text-xs text-primary hover:underline px-1 py-0.5">
              <Plus className="w-3 h-3" /> New grade
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ManufacturerCombobox({ manufacturers, value, onChange, onNew }: {
  manufacturers: any[]; value: string; onChange: (id: string) => void; onNew: () => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selected = manufacturers.find((m: any) => m.id === value)
  const matches  = manufacturers.filter((m: any) =>
    !query.trim() || m.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 text-left w-full">
        <span className="text-xs text-ink truncate">{selected?.name ?? 'None'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-surface-200 shadow-float py-1 min-w-48" style={{ borderRadius: 'var(--radius)' }}>
          <div className="px-2 pb-1">
            <input className="input text-xs py-1" placeholder="Search…" value={query}
              onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <ul className="max-h-40 overflow-y-auto">
            <li>
              <button type="button" onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false); setQuery('') }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 ${!value ? 'font-semibold text-primary' : 'text-ink-muted'}`}>
                None
              </button>
            </li>
            {matches.map((m: any) => (
              <li key={m.id}>
                <button type="button" onMouseDown={e => { e.preventDefault(); onChange(m.id); setOpen(false); setQuery('') }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 ${value === m.id ? 'font-semibold text-primary' : 'text-ink'}`}>
                  {m.name}{m.country ? ` · ${m.country}` : ''}
                </button>
              </li>
            ))}
            {matches.length === 0 && manufacturers.length > 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No match</li>}
            {manufacturers.length === 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No manufacturers yet</li>}
          </ul>
          <div className="border-t border-surface-200 mt-1 pt-1 px-2 pb-1">
            <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(false); onNew() }}
              className="flex items-center gap-1 text-xs text-primary hover:underline px-1 py-0.5">
              <Plus className="w-3 h-3" /> New manufacturer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-modals ───────────────────────────────────────────────────────────────

function AddCategoryModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (name: string) => void }) {
  const [name,   setName]   = useState('')
  const [icon,   setIcon]   = useState('📦')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    await fetch('/api/mto/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), icon }),
    })
    setSaving(false)
    onSaved(name.trim())
    setName(''); setIcon('📦')
  }

  return (
    <Modal open={open} onClose={onClose} title="New Category" maxWidth="max-w-sm" zIndex={60}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="w-16">
            <label className="label">Icon</label>
            <input className="input text-center" value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} />
          </div>
          <div className="flex-1">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. structural" autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={onClose} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={save} disabled={!name.trim() || saving}
            icon={saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}>
            Add Category
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AddGradeModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: string) => void }) {
  const [name,   setName]   = useState('')
  const [type,   setType]   = useState('')
  const [std,    setStd]    = useState('')
  const [dens,   setDens]   = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    const res  = await fetch('/api/mto/grades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), materialType: type || null, standard: std || null, density: dens ? parseFloat(dens) : null }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.data?.id) onSaved(json.data.id)
    setName(''); setType(''); setStd(''); setDens('')
  }

  return (
    <Modal open={open} onClose={onClose} title="New Grade" maxWidth="max-w-sm" zIndex={60}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SS316" autoFocus />
          </div>
          <div>
            <label className="label">Type</label>
            <input className="input" value={type} onChange={e => setType(e.target.value)} placeholder="e.g. Stainless Steel" />
          </div>
          <div>
            <label className="label">Standard</label>
            <input className="input" value={std} onChange={e => setStd(e.target.value)} placeholder="e.g. ASTM A276" />
          </div>
          <div>
            <label className="label">Density (g/cm³)</label>
            <input className="input" type="number" step="0.01" value={dens} onChange={e => setDens(e.target.value)} placeholder="e.g. 7.99" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={onClose} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={save} disabled={!name.trim() || saving}
            icon={saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}>
            Add Grade
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function AddMaterialModal({ open, initialName = '', onClose, onAddFromLib }: Props) {
  const [form,        setForm]        = useState({ ...BLANK_FORM, name: initialName })
  const [spec,        setSpec]        = useState({ ...BLANK_SPEC })
  const [loading,     setLoading]     = useState(false)
  const [imgLoading,  setImgLoading]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [categories,  setCategories]  = useState<any[]>([])
  const [grades,      setGrades]      = useState<any[]>([])
  const [mfrs,        setMfrs]        = useState<any[]>([])
  const [suppliers,   setSuppliers]   = useState<string[]>([])
  const [addingCat,   setAddingCat]   = useState(false)
  const [addingGrade, setAddingGrade] = useState(false)
  const [addingMfr,   setAddingMfr]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const tempId  = useRef(nanoid())

  const fetchData = () => Promise.all([
    fetch('/api/mto/categories').then(r => r.json()),
    fetch('/api/mto/grades').then(r => r.json()),
    fetch('/api/mto/manufacturers').then(r => r.json()),
    fetch('/api/mto/library').then(r => r.json()),
  ]).then(([cats, grs, mfrRes, lib]) => {
    if (cats.data)   setCategories(cats.data)
    if (grs.data)    setGrades(grs.data)
    if (mfrRes.data) setMfrs(mfrRes.data.filter((m: any) => !m.isArchived))
    if (lib.data) {
      const sups = [...new Set<string>(lib.data.map((i: any) => i.spec?.supplier).filter(Boolean))]
      setSuppliers(sups)
    }
  })

  useEffect(() => {
    if (!open) return
    setForm({ ...BLANK_FORM, name: initialName })
    setSpec({ ...BLANK_SPEC })
    setError(null); setAddingCat(false); setAddingGrade(false); setAddingMfr(false)
    fetchData()
  }, [open])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgLoading(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${tempId.current}/${Date.now()}.${ext}`
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('material-photos').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('material-photos').getPublicUrl(data.path)
      setForm(f => ({ ...f, photo: publicUrl }))
    }
    setImgLoading(false); e.target.value = ''
  }

  const setF  = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const setSF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setSpec(s => ({ ...s, [k]: e.target.value }))

  const submit = async () => {
    if (!form.name.trim()) return
    setError(null); setLoading(true)
    try {
      const res  = await fetch('/api/mto/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           form.name.trim(),
          unit:           form.unit.trim() || 'each',
          category:       form.category,
          productCode:    form.productCode || null,
          notes:          form.notes || null,
          photo:          form.photo || null,
          gradeId:        form.gradeId || null,
          manufacturerId: form.manufacturerId || null,
          spec: {
            supplier:      spec.supplier || null,
            supplierCode:  spec.supplierCode || null,
            unitPrice:     spec.unitPrice !== '' ? parseFloat(spec.unitPrice) : null,
            currency:      spec.currency || 'SGD',
            packSize:      spec.packSize !== '' ? parseInt(spec.packSize) : null,
            moq:           spec.moq !== '' ? parseInt(spec.moq) : null,
            stockLengthMm: spec.stockLengthMm !== '' ? parseFloat(spec.stockLengthMm) : null,
            leadTimeDays:  spec.leadTimeDays !== '' ? parseInt(spec.leadTimeDays) : null,
          },
          properties: {}, tags: [],
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to create')
      onAddFromLib(json.data)
      onClose()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="New Material" maxWidth="max-w-2xl">
        <div className="space-y-4">

          {/* Photo + Identity */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <label className="label">Photo</label>
              <div
                className="w-32 h-32 border-2 border-dashed border-surface-300 bg-surface-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors overflow-hidden relative"
                style={{ borderRadius: 'var(--radius-card)' }}
                onClick={() => fileRef.current?.click()}>
                {form.photo
                  ? <img src={form.photo} alt="material" className="w-full h-full object-cover" />
                  : imgLoading
                  ? <Loader2 className="w-6 h-6 text-ink-faint animate-spin" />
                  : <><ImagePlus className="w-6 h-6 text-ink-faint mb-1" /><span className="text-[10px] text-ink-faint text-center px-2">Click to upload</span></>
                }
                {form.photo && !imgLoading && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-white" />
                  </div>
                )}
                {imgLoading && form.photo && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                )}
              </div>
              {form.photo && (
                <button type="button" onClick={() => setForm(f => ({ ...f, photo: '' }))}
                  className="mt-1 text-[10px] text-ink-faint hover:text-red-500 transition-colors w-full text-center">
                  Remove
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Name *</label>
                <input className={`input ${!form.name.trim() ? 'border-red-300 focus:border-red-400' : ''}`}
                  value={form.name} onChange={setF('name')} autoFocus placeholder="e.g. Anchor Bolt M12" />
              </div>
              <div>
                <label className="label">Unit</label>
                <input className="input" value={form.unit} onChange={setF('unit')} placeholder="each" />
              </div>
              <div>
                <label className="label">Category</label>
                <CategoryCombobox
                  categories={categories}
                  value={form.category}
                  onChange={v => setForm(f => ({ ...f, category: v }))}
                  onNew={() => setAddingCat(true)}
                />
              </div>
              <div>
                <label className="label">Product Code</label>
                <input className="input" value={form.productCode} onChange={setF('productCode')} placeholder="e.g. AB-M12" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" value={form.notes} onChange={setF('notes')} placeholder="Optional" />
              </div>
              <div>
                <label className="label">Grade</label>
                <GradeCombobox
                  grades={grades}
                  value={form.gradeId}
                  onChange={id => setForm(f => ({ ...f, gradeId: id }))}
                  onNew={() => setAddingGrade(true)}
                />
              </div>
              <div>
                <label className="label">Manufacturer</label>
                <ManufacturerCombobox
                  manufacturers={mfrs}
                  value={form.manufacturerId}
                  onChange={id => setForm(f => ({ ...f, manufacturerId: id }))}
                  onNew={() => setAddingMfr(true)}
                />
              </div>
            </div>
          </div>

          {/* Logistics / Pricing */}
          <div className="border-t border-surface-200 pt-4">
            <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-3">Logistics / Pricing</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Supplier</label>
                <input className="input" list="add-mat-suppliers" value={spec.supplier} onChange={setSF('supplier')} placeholder="Search or type supplier…" />
                <datalist id="add-mat-suppliers">
                  {suppliers.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Supplier Code</label>
                <input className="input" value={spec.supplierCode} onChange={setSF('supplierCode')} placeholder="e.g. ABC-M12" />
              </div>
              <div>
                <label className="label">Unit Price</label>
                <input className="input" type="number" step="0.01" min={0} value={spec.unitPrice} onChange={setSF('unitPrice')} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={spec.currency} onChange={setSF('currency')}>
                  {DEFAULT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Pack Size (units/pack)</label>
                <input className="input" type="number" min={1} value={spec.packSize} onChange={setSF('packSize')} placeholder="e.g. 100" />
              </div>
              <div>
                <label className="label">MOQ (min. order qty)</label>
                <input className="input" type="number" min={1} value={spec.moq} onChange={setSF('moq')} placeholder="e.g. 50" />
              </div>
              <div>
                <label className="label">Stock Length (mm)</label>
                <input className="input" type="number" min={0} value={spec.stockLengthMm} onChange={setSF('stockLengthMm')} placeholder="e.g. 6000" />
              </div>
              <div>
                <label className="label">Lead Time (days)</label>
                <input className="input" type="number" min={0} value={spec.leadTimeDays} onChange={setSF('leadTimeDays')} placeholder="e.g. 14" />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 px-3 py-2" style={{ borderRadius: 'var(--radius)' }}>{error}</div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={onClose} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={submit} disabled={!form.name.trim() || loading}
              icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}>
              {loading ? 'Saving…' : 'Add Material'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sub-modals — zIndex 60 to sit above the main modal */}
      <AddCategoryModal
        open={addingCat}
        onClose={() => setAddingCat(false)}
        onSaved={name => {
          fetchData().then(() => setForm(f => ({ ...f, category: name })))
          setAddingCat(false)
        }}
      />

      <AddGradeModal
        open={addingGrade}
        onClose={() => setAddingGrade(false)}
        onSaved={id => {
          fetchData().then(() => setForm(f => ({ ...f, gradeId: id })))
          setAddingGrade(false)
        }}
      />

      <ManufacturerModal
        open={addingMfr}
        onClose={() => setAddingMfr(false)}
        onSaved={() => {
          fetch('/api/mto/manufacturers').then(r => r.json()).then(({ data }) => {
            if (!data) return
            const active = data.filter((m: any) => !m.isArchived)
            setMfrs(active)
            const newest = [...active].sort((a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0]
            if (newest) setForm(f => ({ ...f, manufacturerId: newest.id }))
          })
        }}
        zIndex={60}
      />
    </>
  )
}
