// src/components/logistics/MaterialsTab.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { Search, Edit3, Trash2, Check, X, ImagePlus, Loader2, Plus, ChevronDown, Settings2, FileText, Download, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { ManufacturerModal } from './ManufacturersTab'
import AddMaterialModal from '@/components/calculator/panels/AddMaterialModal'
import { Select } from '@/components/ui/Select'
import { createClient } from '@/lib/supabase/client'
import { nanoid } from 'nanoid'
import type { LibraryItemSpec } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEED_CATEGORIES = [
  { name: 'fasteners',   icon: '🔩' },
  { name: 'structural',  icon: '🏗️' },
  { name: 'hardware',    icon: '⚙️' },
  { name: 'consumables', icon: '📦' },
  { name: 'electrical',  icon: '⚡' },
  { name: 'plumbing',    icon: '🔧' },
  { name: 'safety',      icon: '🦺' },
  { name: 'other',       icon: '📦' },
]

const SEED_GRADES = [
  { name: 'SS304',   materialType: 'Stainless Steel', standard: 'ASTM A276', density: 7.93 },
  { name: 'SS316',   materialType: 'Stainless Steel', standard: 'ASTM A276', density: 7.99 },
  { name: 'A36',     materialType: 'Carbon Steel',    standard: 'ASTM A36',  density: 7.85 },
  { name: 'A572',    materialType: 'Carbon Steel',    standard: 'ASTM A572', density: 7.85 },
  { name: '6061-T6', materialType: 'Aluminum',        standard: 'ASTM B209', density: 2.70 },
  { name: 'Grade 8', materialType: 'Alloy Steel',     standard: 'SAE J429',  density: 7.85 },
  { name: 'HDPE',    materialType: 'Plastic',         standard: '',          density: 0.95 },
]

const MATERIAL_UNITS = [
  'each', 'pcs', 'm', 'mm', 'cm', 'kg', 'L', 'set', 'pack', 'roll', 'sheet', 'length',
].map(u => ({ value: u, label: u }))

const DEFAULT_CURRENCIES = ['SGD', 'USD', 'AUD', 'GBP', 'EUR', 'MYR', 'PHP', 'IDR']

const CERT_TYPES: { value: string; label: string }[] = [
  { value: 'mill_cert',    label: 'Mill Certificate' },
  { value: 'ce',           label: 'CE Certificate' },
  { value: 'iso',          label: 'ISO Certificate' },
  { value: 'test_report',  label: 'Test Report' },
  { value: 'msds',         label: 'MSDS / SDS' },
  { value: 'other',        label: 'Other' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type UsageFilter = 'all' | 'unused' | string
type ModalMode   = 'create' | 'edit' | null

interface Props {
  library:               any[]
  suppliers:             any[]
  categories:            any[]
  grades:                any[]
  manufacturers:         any[]
  onRefresh:             () => void
  onRefreshCategories:   () => void
  onRefreshGrades:       () => void
  onRefreshManufacturers:() => void
}

const BLANK_FORM = { name: '', unit: 'each', category: 'other', productCode: '', notes: '', photo: '', gradeId: '', manufacturerId: '' }
const BLANK_SPEC: LibraryItemSpec & { packSize?: number; moq?: number } = {
  supplier: '', supplierCode: '', unitPrice: undefined, currency: 'SGD',
  stockLengthMm: undefined, storageLengthMm: undefined, leadTimeDays: undefined,
  packSize: undefined, moq: undefined,
}

// ─── Supplier combobox ────────────────────────────────────────────────────────

function SupplierCombobox({ suppliers, value, onChange }: {
  suppliers: any[]; value: string; onChange: (v: string) => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState(value)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = suppliers.filter(s => !query.trim() || s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)

  return (
    <div ref={wrapRef} className="relative">
      <input className="input" value={query} placeholder="Search or type supplier…"
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} />
      {open && (filtered.length > 0 || suppliers.length === 0) && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface-50 border border-surface-200 shadow-float rounded py-1 max-h-48 overflow-y-auto">
          {suppliers.length === 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No suppliers yet — add them in the Suppliers tab.</li>}
          {filtered.map(s => (
            <li key={s.id}>
              <button type="button" onMouseDown={e => { e.preventDefault(); onChange(s.name); setQuery(s.name); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-surface-100 transition-colors">
                <div className="font-medium text-ink">{s.name}</div>
                {s.contactPerson && <div className="text-[10px] text-ink-faint">{s.contactPerson}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Category combobox ────────────────────────────────────────────────────────

function CategoryCombobox({ categories, value, onChange, onAdd }: {
  categories: any[]; value: string; onChange: (v: string) => void; onAdd: (name: string, icon: string) => Promise<void>
}) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [adding,  setAdding]  = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [saving,  setSaving]  = useState(false)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const newCatRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setAdding(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => { if (adding && newCatRef.current) newCatRef.current.focus() }, [adding])

  const allNames = [...new Set([...categories.map((c: any) => c.name), value].filter(Boolean))]
  const matches  = allNames.filter(n => !query.trim() || n.toLowerCase().includes(query.toLowerCase()))
  const getIcon  = (name: string) => categories.find((c: any) => c.name === name)?.icon ?? '📦'

  const confirmAdd = async () => {
    const name = newName.trim().toLowerCase()
    if (!name) return
    setSaving(true)
    await onAdd(name, newIcon)
    onChange(name)
    setOpen(false); setAdding(false); setNewName(''); setNewIcon('📦'); setQuery('')
    setSaving(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-1.5 text-xs"><span>{getIcon(value)}</span><span className="text-ink">{value || 'other'}</span></span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface-50 border border-surface-200 shadow-float rounded py-1 min-w-48">
          <div className="px-2 pb-1">
            <input className="input text-xs py-1" placeholder="Filter…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <ul className="max-h-40 overflow-y-auto">
            {matches.map(n => (
              <li key={n}>
                <button type="button" onMouseDown={e => { e.preventDefault(); onChange(n); setOpen(false); setQuery('') }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 transition-colors flex items-center gap-2 ${value === n ? 'font-semibold text-primary' : 'text-ink'}`}>
                  <span>{getIcon(n)}</span> {n}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No match</li>}
          </ul>
          <div className="border-t border-surface-200 mt-1 pt-1 px-2 pb-1">
            {adding ? (
              <div className="flex gap-1">
                <input className="input w-10 text-center text-sm" value={newIcon} onChange={e => setNewIcon(e.target.value)} maxLength={2} />
                <input ref={newCatRef} className="input text-xs py-1 flex-1" placeholder="Category name…" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') setAdding(false) }} />
                <button type="button" disabled={saving} onMouseDown={e => { e.preventDefault(); confirmAdd() }}
                  className="px-2 py-1 bg-primary text-white text-[10px] rounded hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? '…' : 'Add'}
                </button>
              </div>
            ) : (
              <button type="button" onMouseDown={e => { e.preventDefault(); setAdding(true) }}
                className="flex items-center gap-1 text-xs text-primary hover:underline px-1 py-0.5">
                <Plus className="w-3 h-3" /> New category
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Grade combobox ───────────────────────────────────────────────────────────

function GradeCombobox({ grades, value, onChange, onAdd }: {
  grades: any[]; value: string; onChange: (id: string, grade: any | null) => void; onAdd: () => void
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
  const matches  = grades.filter((g: any) => !query.trim() || g.name.toLowerCase().includes(query.toLowerCase()) || g.materialType?.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 text-left">
        <span className="text-xs text-ink flex-1 min-w-0">
          {selected ? <><span className="font-medium">{selected.name}</span>{selected.materialType && <span className="text-ink-faint ml-1.5">{selected.materialType}</span>}</> : <span className="text-ink-faint">None</span>}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface-50 border border-surface-200 shadow-float rounded py-1 min-w-48">
          <div className="px-2 pb-1">
            <input className="input text-xs py-1" placeholder="Search grade…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <ul className="max-h-40 overflow-y-auto">
            <li>
              <button type="button" onMouseDown={e => { e.preventDefault(); onChange('', null); setOpen(false); setQuery('') }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 transition-colors text-ink-faint ${!value ? 'font-semibold text-primary' : ''}`}>
                None
              </button>
            </li>
            {matches.map((g: any) => (
              <li key={g.id}>
                <button type="button" onMouseDown={e => { e.preventDefault(); onChange(g.id, g); setOpen(false); setQuery('') }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 transition-colors ${value === g.id ? 'font-semibold text-primary' : 'text-ink'}`}>
                  <span className="font-medium">{g.name}</span>
                  {g.materialType && <span className="text-ink-faint ml-1.5 text-[10px]">{g.materialType}</span>}
                  {g.density && <span className="text-ink-faint ml-1.5 text-[10px]">{g.density} g/cm³</span>}
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No match</li>}
          </ul>
          <div className="border-t border-surface-200 mt-1 pt-1 px-2 pb-1">
            <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(false); onAdd() }}
              className="flex items-center gap-1 text-xs text-primary hover:underline px-1 py-0.5">
              <Plus className="w-3 h-3" /> Manage grades
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Manufacturer combobox ────────────────────────────────────────────────────

function ManufacturerCombobox({ manufacturers, value, onChange, onAdd }: {
  manufacturers: any[]; value: string; onChange: (id: string) => void; onAdd: () => void
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
  const matches  = manufacturers.filter((m: any) => !query.trim() || m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="input flex items-center justify-between gap-2 text-left">
        <span className="text-xs text-ink flex-1 min-w-0">
          {selected ? selected.name : <span className="text-ink-faint">None</span>}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface-50 border border-surface-200 shadow-float rounded py-1 min-w-48">
          <div className="px-2 pb-1">
            <input className="input text-xs py-1" placeholder="Search manufacturer…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          <ul className="max-h-40 overflow-y-auto">
            <li>
              <button type="button" onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false); setQuery('') }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 transition-colors text-ink-faint ${!value ? 'font-semibold text-primary' : ''}`}>
                None
              </button>
            </li>
            {matches.map((m: any) => (
              <li key={m.id}>
                <button type="button" onMouseDown={e => { e.preventDefault(); onChange(m.id); setOpen(false); setQuery('') }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-100 transition-colors ${value === m.id ? 'font-semibold text-primary' : 'text-ink'}`}>
                  <div className="font-medium">{m.name}</div>
                  {m.country && <div className="text-[10px] text-ink-faint">{m.country}</div>}
                </button>
              </li>
            ))}
            {manufacturers.length === 0 && <li className="px-3 py-2 text-xs text-ink-faint italic">No manufacturers yet.</li>}
          </ul>
          <div className="border-t border-surface-200 mt-1 pt-1 px-2 pb-1">
            <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(false); setQuery(''); onAdd() }}
              className="flex items-center gap-1 text-xs text-primary hover:underline px-1 py-0.5">
              <Plus className="w-3 h-3" /> Add manufacturer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Currency select ──────────────────────────────────────────────────────────

function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom,    setCustom]    = useState(!DEFAULT_CURRENCIES.includes(value) && !!value)
  const [customVal, setCustomVal] = useState(!DEFAULT_CURRENCIES.includes(value) ? value : '')

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__custom__') { setCustom(true); onChange(customVal || '') }
    else { setCustom(false); onChange(e.target.value) }
  }

  return (
    <div className="flex gap-2">
      <select className="input flex-1" value={custom ? '__custom__' : value} onChange={handleSelect}>
        {DEFAULT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__custom__">Custom…</option>
      </select>
      {custom && (
        <input className="input w-24" value={customVal}
          onChange={e => { setCustomVal(e.target.value.toUpperCase()); onChange(e.target.value.toUpperCase()) }}
          placeholder="e.g. JPY" maxLength={6} />
      )}
    </div>
  )
}

// ─── Manage Categories modal ──────────────────────────────────────────────────

function ManageCategoriesModal({ open, onClose, categories, onRefresh }: {
  open: boolean; onClose: () => void; categories: any[]; onRefresh: () => void
}) {
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [saving,  setSaving]  = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editName,setEditName]= useState('')
  const [editIcon,setEditIcon]= useState('')

  const add = async () => {
    const name = newName.trim().toLowerCase()
    if (!name) return
    setSaving(true)
    await fetch('/api/mto/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, icon: newIcon }) })
    setNewName(''); setNewIcon('📦'); setSaving(false)
    onRefresh()
  }

  const remove = async (id: string) => {
    await fetch('/api/mto/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    onRefresh()
  }

  const saveEdit = async (id: string) => {
    await fetch('/api/mto/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: editName.trim().toLowerCase(), icon: editIcon }) })
    setEditId(null); onRefresh()
  }

  const seed = async () => {
    setSeeding(true)
    await Promise.all(SEED_CATEGORIES.map(c => fetch('/api/mto/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })))
    setSeeding(false); onRefresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Categories" maxWidth="max-w-md">
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-ink-faint">No categories yet.</p>
            <button onClick={seed} disabled={seeding} className="text-xs text-primary hover:underline disabled:opacity-50">{seeding ? 'Loading…' : 'Load default categories'}</button>
          </div>
        ) : (
          <ul className="divide-y divide-surface-100 max-h-64 overflow-y-auto border border-surface-200 rounded">
            {categories.map((cat: any) => (
              <li key={cat.id} className="flex items-center gap-2 px-3 py-2">
                {editId === cat.id ? (
                  <>
                    <input className="input w-10 text-center text-sm" value={editIcon} onChange={e => setEditIcon(e.target.value)} maxLength={2} />
                    <input className="input flex-1 text-xs py-1" value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat.id); if (e.key === 'Escape') setEditId(null) }} />
                    <button onClick={() => saveEdit(cat.id)} className="text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditId(null)} className="text-ink-faint hover:text-ink"><X className="w-3.5 h-3.5" /></button>
                  </>
                ) : (
                  <>
                    <span className="text-base w-6 text-center">{cat.icon}</span>
                    <span className="flex-1 text-xs text-ink">{cat.name}</span>
                    <button onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditIcon(cat.icon) }} className="text-ink-faint hover:text-ink"><Edit3 className="w-3 h-3" /></button>
                    <button onClick={() => remove(cat.id)} className="text-ink-faint hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 pt-1 border-t border-surface-100">
          <input className="input w-10 text-center text-sm" value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="📦" maxLength={2} />
          <input className="input flex-1 text-xs" placeholder="New category name…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} />
          <Button size="sm" onClick={add} disabled={!newName.trim() || saving} icon={saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}>Add</Button>
        </div>
        {categories.length > 0 && (
          <div className="text-right">
            <button onClick={seed} disabled={seeding} className="text-[10px] text-ink-faint hover:text-primary hover:underline">{seeding ? 'Loading…' : 'Load default categories'}</button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Manage Grades modal ──────────────────────────────────────────────────────

function ManageGradesModal({ open, onClose, grades, onRefresh }: {
  open: boolean; onClose: () => void; grades: any[]; onRefresh: () => void
}) {
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('')
  const [newStd,  setNewStd]  = useState('')
  const [newDens, setNewDens] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editData,setEditData]= useState<any>({})

  const prefill = (g: typeof SEED_GRADES[0]) => {
    setNewName(g.name); setNewType(g.materialType); setNewStd(g.standard); setNewDens(String(g.density))
  }

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    await fetch('/api/mto/grades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, materialType: newType || null, standard: newStd || null, density: newDens ? parseFloat(newDens) : null }),
    })
    setNewName(''); setNewType(''); setNewStd(''); setNewDens(''); setSaving(false)
    onRefresh()
  }

  const remove = async (id: string) => {
    await fetch('/api/mto/grades', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    onRefresh()
  }

  const saveEdit = async (id: string) => {
    await fetch('/api/mto/grades', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editData, density: editData.density ? parseFloat(editData.density) : null }),
    })
    setEditId(null); onRefresh()
  }

  const existingNames = new Set(grades.map((g: any) => g.name))

  return (
    <Modal open={open} onClose={onClose} title="Manage Grades" maxWidth="max-w-lg" zIndex={60}>
      <div className="space-y-4">
        {/* Common grade chips */}
        <div>
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide mb-2">Common grades — click to pre-fill</p>
          <div className="flex flex-wrap gap-1.5">
            {SEED_GRADES.map(g => {
              const added = existingNames.has(g.name)
              return (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => prefill(g)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer
                    ${added
                      ? 'border-surface-200 bg-surface-50 text-ink-muted hover:bg-surface-100'
                      : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                    }`}
                >
                  {added && <Check className="w-3 h-3 text-emerald-500" />}
                  {g.name}
                  {!added && <span className="text-[10px] text-primary/60">{g.materialType}</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Existing grades table */}
        {grades.length > 0 && (
          <div className="max-h-52 overflow-y-auto border border-surface-200 rounded">
            <table className="w-full text-xs">
              <thead className="bg-surface-50 border-b border-surface-200 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-ink-muted">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-ink-muted">Type</th>
                  <th className="text-left px-3 py-2 font-semibold text-ink-muted">Standard</th>
                  <th className="text-left px-3 py-2 font-semibold text-ink-muted">Density</th>
                  <th className="px-3 py-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {grades.map((g: any) => (
                  <tr key={g.id}>
                    {editId === g.id ? (
                      <>
                        <td className="px-2 py-1"><input className="input text-xs py-0.5" value={editData.name ?? ''} onChange={e => setEditData((d: any) => ({ ...d, name: e.target.value }))} /></td>
                        <td className="px-2 py-1"><input className="input text-xs py-0.5" value={editData.materialType ?? ''} onChange={e => setEditData((d: any) => ({ ...d, materialType: e.target.value }))} /></td>
                        <td className="px-2 py-1"><input className="input text-xs py-0.5" value={editData.standard ?? ''} onChange={e => setEditData((d: any) => ({ ...d, standard: e.target.value }))} /></td>
                        <td className="px-2 py-1"><input className="input text-xs py-0.5 w-20" type="number" step="0.01" value={editData.density ?? ''} onChange={e => setEditData((d: any) => ({ ...d, density: e.target.value }))} /></td>
                        <td className="px-2 py-1">
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(g.id)} className="text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditId(null)} className="text-ink-faint hover:text-ink"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-medium text-ink">{g.name}</td>
                        <td className="px-3 py-2 text-ink-muted">{g.materialType ?? '—'}</td>
                        <td className="px-3 py-2 text-ink-muted">{g.standard ?? '—'}</td>
                        <td className="px-3 py-2 text-ink-muted">{g.density != null ? `${g.density} g/cm³` : '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => { setEditId(g.id); setEditData({ name: g.name, materialType: g.materialType ?? '', standard: g.standard ?? '', density: g.density ?? '' }) }} className="text-ink-faint hover:text-ink"><Edit3 className="w-3 h-3" /></button>
                            <button onClick={() => remove(g.id)} className="text-ink-faint hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add form */}
        <div className="border-t border-surface-100 pt-3 space-y-2">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wide">Add grade</p>
          <div className="grid grid-cols-4 gap-2">
            <input className="input text-xs" placeholder="Name *" value={newName} onChange={e => setNewName(e.target.value)} autoFocus={false} />
            <input className="input text-xs" placeholder="Type" value={newType} onChange={e => setNewType(e.target.value)} />
            <input className="input text-xs" placeholder="Standard" value={newStd} onChange={e => setNewStd(e.target.value)} />
            <input className="input text-xs" placeholder="Density g/cm³" type="number" step="0.01" value={newDens} onChange={e => setNewDens(e.target.value)} />
          </div>
          <Button size="sm" onClick={add} disabled={!newName.trim() || saving} icon={saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}>Add Grade</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Certifications section ───────────────────────────────────────────────────

function CertificationsSection({ itemId }: { itemId: string }) {
  const [certs,      setCerts]      = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [certType,   setCertType]   = useState('mill_cert')
  const [certNumber, setCertNumber] = useState('')
  const [issuedBy,   setIssuedBy]   = useState('')
  const [issuedDate, setIssuedDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [certNotes,  setCertNotes]  = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/mto/certifications?itemId=${itemId}`)
      .then(r => r.json()).then(j => { if (j.data) setCerts(j.data) })
      .finally(() => setLoading(false))
  }, [itemId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${itemId}/${Date.now()}-${safeName}`
    const { data, error } = await supabase.storage.from('material-certs').upload(path, file, { upsert: false })
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('material-certs').getPublicUrl(data.path)
      await fetch('/api/mto/certifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libraryItemId: itemId, type: certType, certNumber: certNumber || null,
          issuedBy: issuedBy || null, issuedDate: issuedDate || null, expiryDate: expiryDate || null,
          fileUrl: publicUrl, fileName: file.name, notes: certNotes || null,
        }),
      })
      setCertNumber(''); setIssuedBy(''); setIssuedDate(''); setExpiryDate(''); setCertNotes('')
      fetch(`/api/mto/certifications?itemId=${itemId}`).then(r => r.json()).then(j => { if (j.data) setCerts(j.data) })
    }
    setUploading(false)
    e.target.value = ''
  }

  const deleteCert = async (id: string) => {
    await fetch('/api/mto/certifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setCerts(prev => prev.filter(c => c.id !== id))
  }

  const certTypeLabel = (type: string) => CERT_TYPES.find(t => t.value === type)?.label ?? type

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-ink-faint" /></div>
      ) : certs.length === 0 ? (
        <p className="text-xs text-ink-faint italic">No certifications uploaded yet.</p>
      ) : (
        <ul className="space-y-1">
          {certs.map((cert: any) => (
            <li key={cert.id} className="flex items-center gap-2 px-3 py-2 rounded border border-surface-200 bg-surface-50">
              <span className="icon-well bg-surface-200/40"><FileText className="w-3.5 h-3.5 text-ink-faint" /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{certTypeLabel(cert.type)}</span>
                  {cert.certNumber && <span className="text-xs text-ink"># {cert.certNumber}</span>}
                  {cert.issuedBy && <span className="text-xs text-ink-faint">by {cert.issuedBy}</span>}
                  {cert.expiryDate && <span className="text-xs text-ink-faint">exp. {new Date(cert.expiryDate).toLocaleDateString()}</span>}
                </div>
                {cert.fileName && <div className="text-[10px] text-ink-faint mt-0.5 truncate">{cert.fileName}</div>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {cert.fileUrl && (
                  <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1 text-ink-faint hover:text-primary transition-colors" title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <button onClick={() => deleteCert(cert.id)} className="p-1 text-ink-faint hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upload form */}
      <div className="border border-surface-200 rounded p-3 space-y-2 bg-surface-50">
        <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Upload Certificate</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Type</label>
            <select className="input text-xs" value={certType} onChange={e => setCertType(e.target.value)}>
              {CERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cert Number</label>
            <input className="input text-xs" value={certNumber} onChange={e => setCertNumber(e.target.value)} placeholder="e.g. MTC-2024-001" />
          </div>
          <div>
            <label className="label">Issued By</label>
            <input className="input text-xs" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} placeholder="Lab / authority" />
          </div>
          <div>
            <label className="label">Issue Date</label>
            <input className="input text-xs" type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Expiry Date</label>
            <input className="input text-xs" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input text-xs" value={certNotes} onChange={e => setCertNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs border border-dashed border-surface-300 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
            {uploading ? 'Uploading…' : 'Attach file (PDF, image)'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MaterialsTab({ library, suppliers, categories, grades, manufacturers, onRefresh, onRefreshCategories, onRefreshGrades, onRefreshManufacturers }: Props) {
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState<string>('all')
  const [usageFilter,  setUsageFilter]  = useState<UsageFilter>('all')
  const [mode,         setMode]         = useState<ModalMode>(null)
  const [manageOpen,   setManageOpen]   = useState(false)
  const [manageGrades, setManageGrades] = useState(false)
  const [addMfrOpen,   setAddMfrOpen]   = useState(false)
  const [editing,      setEditing]      = useState<any | null>(null)
  const [form,         setForm]         = useState<any>({ ...BLANK_FORM })
  const [specForm,     setSpecForm]     = useState<any>({ ...BLANK_SPEC })
  const [selectedGrade,   setSelectedGrade]    = useState<any | null>(null)
  const [loading,         setLoading]          = useState(false)
  const [imgLoading,      setImgLoading]       = useState(false)
  const [searchFocused,   setSearchFocused]    = useState(false)
  const [addModalOpen,    setAddModalOpen]     = useState(false)
  const [deleteId,        setDeleteId]         = useState<string | null>(null)
  const [createInitName,  setCreateInitName]   = useState('')
  const tempIdRef   = useRef(nanoid())
  const fileRef     = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  const dbCatNames  = categories.map((c: any) => c.name)
  const allCatNames = [...new Set([...dbCatNames, ...library.map(i => i.category).filter(Boolean)])]

  const addCategory = async (name: string, icon: string) => {
    await fetch('/api/mto/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, icon }) })
    onRefreshCategories()
  }

  // ─── Filters ────────────────────────────────────────────────────────────────

  const filtered = library.filter(item => {
    if (catFilter !== 'all' && item.category !== catFilter) return false
    if (usageFilter === 'unused') { if ((item.usedInSystems?.length ?? 0) > 0) return false }
    else if (usageFilter !== 'all') { if (!(item.usedInSystems ?? []).some((s: any) => s.id === usageFilter)) return false }
    if (search) {
      const q = search.toLowerCase()
      if (!item.name?.toLowerCase().includes(q) && !item.productCode?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const unusedCount = library.filter(i => !(i.usedInSystems?.length > 0)).length
  const systemsMap  = new Map<string, { id: string; label: string; count: number }>()
  for (const item of library) {
    for (const s of (item.usedInSystems ?? [])) {
      if (!systemsMap.has(s.id)) {
        const label = s.shortName || (s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name)
        systemsMap.set(s.id, { id: s.id, label, count: 0 })
      }
      systemsMap.get(s.id)!.count++
    }
  }
  const systemPills = [...systemsMap.values()]

  // ─── Modal handlers ──────────────────────────────────────────────────────────

  const openCreate = (initialName?: string) => {
    setCreateInitName(initialName ?? '')
    setAddModalOpen(true)
  }

  const openEdit = (item: any) => {
    setEditing(item)
    setForm({ name: item.name, unit: item.unit, category: item.category ?? 'other', productCode: item.productCode ?? '', notes: item.notes ?? '', photo: item.photo ?? '', gradeId: item.gradeId ?? '', manufacturerId: item.manufacturerId ?? '' })
    setSpecForm({ ...BLANK_SPEC, ...(item.spec ?? {}) })
    setSelectedGrade(item.grade ?? null)
    setMode('edit')
  }

  const closeModal = () => { setMode(null); setEditing(null) }

  // ─── Save ────────────────────────────────────────────────────────────────────

  const save = async () => {
    if (!form.name?.trim()) return
    setLoading(true)
    const payload = {
      name: form.name, unit: form.unit, category: form.category,
      productCode: form.productCode || null, notes: form.notes || null,
      photo: form.photo || null,
      gradeId: form.gradeId || null,
      manufacturerId: form.manufacturerId || null,
      spec: specForm,
    }
    if (mode === 'create') {
      await fetch('/api/mto/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, properties: {}, tags: [] }) })
    } else {
      await fetch('/api/mto/library', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) })
    }
    setLoading(false); closeModal(); onRefresh()
  }

  const remove = async (id: string) => {
    await fetch('/api/mto/library', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDeleteId(null)
    onRefresh()
  }

  // ─── Image upload ─────────────────────────────────────────────────────────────

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgLoading(true)
    const uploadId = mode === 'edit' ? editing.id : tempIdRef.current
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${uploadId}/${Date.now()}.${ext}`
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('material-photos').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('material-photos').getPublicUrl(data.path)
      setForm((f: any) => ({ ...f, photo: publicUrl }))
    }
    setImgLoading(false); e.target.value = ''
  }

  const setF  = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))
  const setSF = (k: string, v: any) =>
    setSpecForm((s: any) => ({ ...s, [k]: v === '' ? undefined : v }))

  const fmt = (item: any) => {
    const spec = item.spec as any
    const price = spec?.unitPrice != null ? `${spec.currency ?? 'SGD'} ${spec.unitPrice.toFixed(2)}` : '—'
    const lead  = spec?.leadTimeDays != null ? `${spec.leadTimeDays}d` : '—'
    const sup   = spec?.supplier || '—'
    return { price, lead, sup }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-ink-faint">{library.length} material{library.length !== 1 ? 's' : ''} in library</div>
        <Button size="sm" onClick={() => openCreate()} icon={<Plus className="w-3.5 h-3.5" />}>New Material</Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div ref={searchWrapRef} className="relative flex-1 min-w-48 max-w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none z-10" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search name or code…"
              className="input text-xs py-1.5 pl-8 w-full"
            />
            {searchFocused && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-surface-50 border border-surface-200 shadow-float py-1" style={{ borderRadius: 'var(--radius)' }}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); openCreate(search.trim() || undefined); setSearchFocused(false) }}
                  className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-surface-50 flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                  {search.trim() ? `Add "${search.trim()}" as new material` : 'Add new material'}
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-1 flex-wrap items-center">
            {['all', ...allCatNames].map(c => {
              const icon = c === 'all' ? null : (categories.find((cat: any) => cat.name === c)?.icon ?? '📦')
              return (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all font-medium ${catFilter === c ? 'bg-primary text-white border-primary' : 'bg-surface-50 text-ink-muted border-surface-300 hover:border-surface-400'}`}>
                  {c === 'all' ? 'All' : `${icon} ${c}`}
                </button>
              )
            })}
            <button onClick={() => setManageOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink transition-colors border border-surface-200 hover:border-surface-400 bg-surface-50" style={{ borderRadius: 'var(--radius)' }}>
              <Settings2 className="w-3 h-3" />
              Manage categories
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide">Usage:</span>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setUsageFilter('all')} className={`px-2.5 py-1 text-xs rounded-full border transition-all font-medium ${usageFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-surface-50 text-ink-muted border-surface-300 hover:border-surface-400'}`}>All ({library.length})</button>
            {systemPills.map(sys => (
              <button key={sys.id} onClick={() => setUsageFilter(sys.id)} className={`px-2.5 py-1 text-xs rounded-full border transition-all font-medium ${usageFilter === sys.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-surface-50 text-ink-muted border-surface-300 hover:border-surface-400'}`}>{sys.label} ({sys.count})</button>
            ))}
            <button onClick={() => setUsageFilter('unused')} className={`px-2.5 py-1 text-xs rounded-full border transition-all font-medium ${usageFilter === 'unused' ? 'bg-amber-500 text-white border-amber-500' : 'bg-surface-50 text-ink-muted border-surface-300 hover:border-surface-400'}`}>Unused ({unusedCount})</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-100 border-b border-surface-200">
                <th className="text-left px-4 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide min-w-56">Material</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide w-24">Category</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide w-16">Unit</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide w-32">Grade</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide w-28">Used In</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide w-36">Supplier</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide w-28">Unit Price</th>
                <th className="text-left px-3 py-2.5 font-semibold text-ink-muted text-xs uppercase tracking-wide w-24">Lead Time</th>
                <th className="px-3 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-ink-faint">
                  {library.length === 0
                    ? <span>No materials yet. <button onClick={() => openCreate()} className="text-primary hover:underline">Add your first material</button></span>
                    : 'No materials match your filter.'}
                </td></tr>
              )}
              {filtered.map((item, i) => {
                const { price, lead, sup } = fmt(item)
                const catIcon = categories.find((c: any) => c.name === item.category)?.icon ?? '📦'
                return (
                  <tr key={item.id} className={`cursor-pointer hover:bg-surface-100 transition-colors ${i % 2 === 0 ? 'bg-surface-50' : 'bg-surface-100/50'}`} onClick={() => openEdit(item)}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {item.photo
                          ? <img src={item.photo} alt={item.name} className="w-9 h-9 rounded object-cover flex-shrink-0 border border-surface-200" />
                          : <div className="w-9 h-9 rounded bg-surface-100 border border-surface-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-base leading-none">{catIcon}</span>
                            </div>
                        }
                        <div className="min-w-0">
                          <div className="font-medium text-ink">{item.name}</div>
                          {item.productCode && <code className="text-[10px] text-ink-faint">{item.productCode}</code>}
                          {item.manufacturer && <div className="text-[10px] text-ink-faint">{item.manufacturer.name}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-ink-muted">{catIcon} {item.category}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="badge bg-surface-100 text-ink-muted text-xs">{item.unit}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {item.grade
                        ? <div>
                            <div className="text-xs font-medium text-ink">{item.grade.name}</div>
                            {item.grade.materialType && <div className="text-[10px] text-ink-faint">{item.grade.materialType}</div>}
                          </div>
                        : <span className="text-xs text-ink-faint">—</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      {(item.usedInSystems ?? []).length === 0
                        ? <span className="text-xs text-ink-faint">—</span>
                        : <div className="flex flex-wrap gap-1">
                            {(item.usedInSystems as any[]).slice(0, 3).map((s: any) => {
                              const label = s.shortName || (s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name)
                              return <span key={s.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">{label}</span>
                            })}
                            {(item.usedInSystems as any[]).length > 3 && <span className="text-[10px] text-ink-faint self-center">+{(item.usedInSystems as any[]).length - 3}</span>}
                          </div>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">{sup}</td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">{price}</td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">{lead}</td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="xs" variant="ghost" onClick={() => openEdit(item)} icon={<Edit3 className="w-3 h-3" />}>Edit</Button>
                        <Button size="xs" variant="danger" onClick={() => setDeleteId(item.id)} icon={<Trash2 className="w-3 h-3" />} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manufacturer modal — zIndex 60 so it sits above the material modal (z-50) */}
      <ManufacturerModal open={addMfrOpen} onClose={() => setAddMfrOpen(false)} onSaved={onRefreshManufacturers} zIndex={60} />

      {/* Manage Categories modal */}
      <ManageCategoriesModal open={manageOpen} onClose={() => setManageOpen(false)} categories={categories} onRefresh={onRefreshCategories} />

      {/* Manage Grades modal */}
      <ManageGradesModal open={manageGrades} onClose={() => setManageGrades(false)} grades={grades} onRefresh={onRefreshGrades} />

      {/* Edit modal */}
      <Modal open={mode === 'edit'} onClose={closeModal} title="Edit Material" maxWidth="max-w-2xl">
        <div className="space-y-4">

          {/* Photo + Identity */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <label className="label">Photo</label>
              <div className="w-32 h-32 rounded-lg border-2 border-dashed border-surface-300 bg-surface-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-colors overflow-hidden relative"
                onClick={() => fileRef.current?.click()}>
                {form.photo
                  ? <img src={form.photo} alt="material" className="w-full h-full object-cover" />
                  : imgLoading ? <Loader2 className="w-6 h-6 text-ink-faint animate-spin" />
                  : <><ImagePlus className="w-6 h-6 text-ink-faint mb-1" /><span className="text-[10px] text-ink-faint text-center px-2">Click to upload</span></>
                }
                {form.photo && !imgLoading && <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"><ImagePlus className="w-5 h-5 text-white" /></div>}
                {imgLoading && form.photo && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>}
              </div>
              {form.photo && <button onClick={() => setForm((f: any) => ({ ...f, photo: '' }))} className="mt-1 text-[10px] text-ink-faint hover:text-red-500 transition-colors w-full text-center">Remove</button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Name *</label>
                <input className="input" value={form.name ?? ''} onChange={setF('name')} autoFocus placeholder="e.g. Anchor Bolt M12" />
              </div>
              <div>
                <label className="label">Unit</label>
                <Select options={MATERIAL_UNITS} value={form.unit ?? 'each'} onChange={setF('unit')} className="text-xs" />
              </div>
              <div>
                <label className="label">Category</label>
                <CategoryCombobox categories={categories} value={form.category ?? 'other'} onChange={cat => setForm((f: any) => ({ ...f, category: cat }))} onAdd={addCategory} />
              </div>
              <div>
                <label className="label">Product Code</label>
                <input className="input" value={form.productCode ?? ''} onChange={setF('productCode')} placeholder="e.g. AB-M12" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" value={form.notes ?? ''} onChange={setF('notes')} placeholder="Optional" />
              </div>
              <div>
                <label className="label">Grade</label>
                <GradeCombobox
                  grades={grades}
                  value={form.gradeId ?? ''}
                  onChange={(id, grade) => { setForm((f: any) => ({ ...f, gradeId: id })); setSelectedGrade(grade) }}
                  onAdd={() => { closeModal(); setManageGrades(true) }}
                />
                {selectedGrade?.density && (
                  <div className="text-[10px] text-ink-faint mt-0.5">{selectedGrade.density} g/cm³{selectedGrade.standard ? ` · ${selectedGrade.standard}` : ''}</div>
                )}
              </div>
              <div>
                <label className="label">Manufacturer</label>
                <ManufacturerCombobox manufacturers={manufacturers} value={form.manufacturerId ?? ''} onChange={id => setForm((f: any) => ({ ...f, manufacturerId: id }))} onAdd={() => setAddMfrOpen(true)} />
              </div>
            </div>
          </div>

          {/* Logistics / Pricing */}
          <div className="border-t border-surface-200 pt-4">
            <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-3">Logistics / Pricing</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Supplier</label>
                <SupplierCombobox suppliers={suppliers} value={specForm.supplier ?? ''} onChange={val => setSF('supplier', val)} />
              </div>
              <div>
                <label className="label">Supplier Code</label>
                <input className="input" value={specForm.supplierCode ?? ''} onChange={e => setSF('supplierCode', e.target.value)} placeholder="e.g. ABC-M12" />
              </div>
              <div>
                <label className="label">Unit Price</label>
                <input className="input" type="number" step="0.01" min={0} value={specForm.unitPrice ?? ''}
                  onChange={e => setSF('unitPrice', e.target.value === '' ? undefined : parseFloat(e.target.value))} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Currency</label>
                <CurrencySelect value={specForm.currency ?? 'SGD'} onChange={v => setSF('currency', v)} />
              </div>
              <div>
                <label className="label">Pack Size</label>
                <div className="relative">
                  <input className="input pr-12" type="number" min={1} value={specForm.packSize ?? ''}
                    onChange={e => setSF('packSize', e.target.value === '' ? undefined : parseInt(e.target.value))} placeholder="e.g. 100" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint pointer-events-none">units</span>
                </div>
              </div>
              <div>
                <label className="label">MOQ (min. order qty)</label>
                <input className="input" type="number" min={1} value={specForm.moq ?? ''}
                  onChange={e => setSF('moq', e.target.value === '' ? undefined : parseInt(e.target.value))} placeholder="e.g. 50" />
              </div>
              <div>
                <label className="label">Stock Length</label>
                <div className="relative">
                  <input className="input pr-10" type="number" min={0} value={specForm.stockLengthMm ?? ''}
                    onChange={e => setSF('stockLengthMm', e.target.value === '' ? undefined : parseFloat(e.target.value))} placeholder="e.g. 6000" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint pointer-events-none">mm</span>
                </div>
              </div>
              <div>
                <label className="label">Lead Time</label>
                <div className="relative">
                  <input className="input pr-12" type="number" min={0} value={specForm.leadTimeDays ?? ''}
                    onChange={e => setSF('leadTimeDays', e.target.value === '' ? undefined : parseInt(e.target.value))} placeholder="e.g. 14" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint pointer-events-none">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Certifications (edit mode only) */}
          {mode === 'edit' && editing && (
            <div className="border-t border-surface-200 pt-4">
              <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-3">Certifications & Documents</div>
              <CertificationsSection itemId={editing.id} />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="secondary" onClick={closeModal} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
            <Button size="sm" variant="success" onClick={save} disabled={!form.name?.trim() || loading}
              icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}>
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Shared create modal */}
      <AddMaterialModal
        open={addModalOpen}
        initialName={createInitName}
        onClose={() => setAddModalOpen(false)}
        onAddFromLib={() => onRefresh()}
      />
      <ConfirmModal
        open={deleteId !== null}
        title="Delete from library?"
        message={`"${library.find(i => i.id === deleteId)?.name ?? ''}" will be permanently removed from the library.`}
        onConfirm={() => { if (deleteId) remove(deleteId) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
