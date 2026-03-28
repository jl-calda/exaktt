// src/app/(app)/projects/assets/AssetsClient.tsx
'use client'
import { useState, useCallback } from 'react'
import {
  Plus, Search, Trash2, Pencil, X, Wrench,
} from 'lucide-react'
import DataTable, { useTableSort, type Column, type GroupDef } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'

const CATEGORIES = [
  { value: 'vehicle',   label: 'Vehicle',   icon: '🚗' },
  { value: 'equipment', label: 'Equipment', icon: '⚙️' },
  { value: 'tool',      label: 'Tool',      icon: '🔧' },
  { value: 'facility',  label: 'Facility',  icon: '🏭' },
]

type Asset = {
  id: string; name: string; category?: string | null
  description?: string | null; location?: string | null
  isAvailable: boolean; createdAt: string
}

interface Props { initialAssets: Asset[] }

export default function AssetsClient({ initialAssets }: Props) {
  const [assets, setAssets] = useState(initialAssets)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; asset?: Asset }>({ open: false })
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)

  const openModal = (asset?: Asset) => {
    setName(asset?.name ?? '')
    setCategory(asset?.category ?? '')
    setDescription(asset?.description ?? '')
    setLocation(asset?.location ?? '')
    setIsAvailable(asset?.isAvailable ?? true)
    setModal({ open: true, asset })
  }

  const filtered = assets.filter(a => {
    if (categoryFilter && a.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!a.name.toLowerCase().includes(q) && !(a.description ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const columns: Column<Asset>[] = [
    {
      key: 'name', label: 'Asset', sortable: true,
      sortKey: (a) => a.name.toLowerCase(),
      render: (a) => {
        const cat = CATEGORIES.find(c => c.value === a.category)
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{cat?.icon ?? '📦'}</span>
            <div>
              <div className="font-semibold text-xs text-ink">{a.name}</div>
              {a.description && <div className="text-[10px] text-ink-faint mt-0.5 truncate max-w-[200px]">{a.description}</div>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'category', label: 'Category', sortable: true, width: 'w-24',
      sortKey: (a) => a.category ?? '',
      render: (a) => {
        const cat = CATEGORIES.find(c => c.value === a.category)
        return <span className="text-[10px] text-ink-muted">{cat?.label ?? '—'}</span>
      },
    },
    {
      key: 'location', label: 'Location', width: 'w-32',
      render: (a) => <span className="text-[10px] text-ink-faint">{a.location ?? '—'}</span>,
    },
    {
      key: 'status', label: 'Status', width: 'w-24', align: 'center',
      render: (a) => (
        <span className={`badge text-[10px] ${a.isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {a.isAvailable ? 'Available' : 'In Use'}
        </span>
      ),
    },
    {
      key: 'actions', label: '', width: 'w-20', align: 'right',
      render: (a) => (
        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-1 justify-end">
          <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); openModal(a) }}
            icon={<Pencil className="w-3 h-3" />} title="Edit" />
          <Button variant="danger-ghost" size="xs" onClick={(e) => { e.stopPropagation(); handleDelete(a.id) }}
            icon={<Trash2 className="w-3 h-3" />} title="Delete" />
        </div>
      ),
    },
  ]

  const { sorted, sortKey, sortDir, onSort } = useTableSort(filtered, columns)

  const groups: GroupDef<Asset>[] = CATEGORIES.map(c => ({
    key: c.value,
    label: c.label,
    filter: (a) => a.category === c.value,
  }))

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    setSaving(true)
    const data = {
      name: name.trim(),
      category: category || null,
      description: description || null,
      location: location || null,
      isAvailable,
    }
    if (modal.asset) {
      const res = await fetch(`/api/project-assets/${modal.asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { setSaving(false); return }
      const updated = await res.json()
      setAssets(prev => prev.map(a => a.id === modal.asset!.id ? { ...a, ...updated } : a))
    } else {
      const res = await fetch('/api/project-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { setSaving(false); return }
      const created = await res.json()
      setAssets(prev => [created, ...prev])
    }
    setModal({ open: false })
    setSaving(false)
  }, [name, category, description, location, isAvailable, modal.asset])

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/project-assets/${id}`, { method: 'DELETE' })
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  return (
    <>
      <main className="px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-semibold text-base text-ink">Project Assets</h1>
          <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => openModal()}>
            New Asset
          </Button>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <button onClick={() => setCategoryFilter(null)}
            className={`filter-pill ${!categoryFilter ? 'active' : ''}`}>
            All
          </button>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategoryFilter(categoryFilter === c.value ? null : c.value)}
              className={`filter-pill ${categoryFilter === c.value ? 'active' : ''}`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <DataTable<Asset>
          items={sorted}
          getRowId={(a) => a.id}
          columns={columns}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          groups={categoryFilter ? undefined : groups}
          emptyIcon="🔧"
          emptyTitle="No assets yet"
          emptyMessage="Add vehicles, equipment, tools, or facilities."
          toolbar={
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
              <input type="text" placeholder="Search assets…" value={search}
                onChange={e => setSearch(e.target.value)} className="input pl-8 w-48" />
            </div>
          }
        />
      </main>

      {/* Asset modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModal({ open: false })} />
          <div className="relative bg-surface-50 rounded-2xl shadow-float w-full max-w-sm mx-4 animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="font-semibold text-sm text-ink">
                {modal.asset ? 'Edit Asset' : 'New Asset'}
              </h2>
              <button onClick={() => setModal({ open: false })} className="text-ink-faint hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="label mb-1">Name *</label>
                <input className="input w-full" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Welding Machine #3" />
              </div>
              <div>
                <label className="label mb-1">Category</label>
                <select className="input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">None</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-1">Description</label>
                <textarea className="input w-full" rows={2} value={description}
                  onChange={e => setDescription(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="label mb-1">Location</label>
                <input className="input w-full" value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Warehouse A" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsAvailable(!isAvailable)}
                  className={`w-8 h-[18px] rounded-full transition-colors ${isAvailable ? 'bg-primary' : 'bg-surface-200'}`}>
                  <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${isAvailable ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                </button>
                <span className="text-[11px] text-ink-muted">Available</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200">
              <Button variant="secondary" size="sm" onClick={() => setModal({ open: false })}>Cancel</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={handleSave} disabled={!name.trim()}>
                {modal.asset ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
