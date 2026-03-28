'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Settings, Tag, Plus, Check, X, Trash2, GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const PRESET_COLORS = [
  '#64748b', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
]

type Category = {
  id: string
  name: string
  color: string
  sortOrder: number
  isDefault: boolean
}

interface Props {
  initialCategories: Category[]
  initialHoursPerDay: number
}

export default function ProjectSettingsClient({ initialCategories, initialHoursPerDay }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [hoursPerDay, setHoursPerDay] = useState(String(initialHoursPerDay))
  const [hoursSaving, setHoursSaving] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  // New category state
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#10b981')
  const [addSaving, setAddSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const refreshCategories = useCallback(async () => {
    const res = await fetch('/api/projects/settings/categories')
    if (res.ok) {
      const data = await res.json()
      setCategories(data)
    }
  }, [])

  const saveHoursPerDay = async () => {
    const val = parseFloat(hoursPerDay)
    if (!val || val < 1 || val > 24) return
    setHoursSaving(true)
    try {
      await fetch('/api/projects/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoursPerDay: val }),
      })
      setHoursSaved(true)
      setTimeout(() => setHoursSaved(false), 2000)
    } finally {
      setHoursSaving(false)
    }
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
    setError(null)
  }

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return
    setError(null)
    const res = await fetch(`/api/projects/settings/categories/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to update')
      return
    }
    cancelEdit()
    await refreshCategories()
  }

  const addCategory = async () => {
    if (!newName.trim()) return
    setAddSaving(true)
    setError(null)
    const res = await fetch('/api/projects/settings/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        color: newColor,
        sortOrder: categories.length,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create')
      setAddSaving(false)
      return
    }
    setNewName('')
    setNewColor('#10b981')
    setAdding(false)
    setAddSaving(false)
    await refreshCategories()
  }

  const deleteCategory = async (id: string) => {
    setError(null)
    const res = await fetch(`/api/projects/settings/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to delete')
      return
    }
    await refreshCategories()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex flex-col flex-1 px-4 py-4 md:px-6 md:py-5 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/projects">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Projects
            </Button>
          </Link>
          <Settings className="w-4 h-4 text-ink-faint" />
          <h1 className="font-semibold text-base text-ink">Project Settings</h1>
        </div>

        {/* Hours per Day */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Default Hours per Day</h3>
              <p className="text-[11px] text-ink-faint mt-0.5">
                Used to calculate man-hours from activity dates when estimated hours are not provided.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="input h-7 text-xs w-16 text-center font-mono"
                value={hoursPerDay}
                onChange={e => setHoursPerDay(e.target.value)}
                min={1}
                max={24}
                step={0.5}
              />
              <span className="text-[11px] text-ink-faint">hrs</span>
              <Button
                variant="primary"
                size="xs"
                onClick={saveHoursPerDay}
                disabled={hoursSaving}
                loading={hoursSaving}
              >
                {hoursSaved ? <><Check className="w-3 h-3" /> Saved</> : 'Save'}
              </Button>
            </div>
          </div>
        </div>

        {/* Activity Categories */}
        <div className="card p-0">
          <div className="card-header flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-ink-faint" />
              <h3 className="text-[13px] font-semibold text-ink">Activity Categories</h3>
              <span className="text-[10px] text-ink-faint">{categories.length} categories</span>
            </div>
            {!adding && (
              <Button variant="ghost" size="xs" onClick={() => { setAdding(true); setError(null) }}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            )}
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-[11px] text-red-600">
              {error}
            </div>
          )}

          {/* Category list */}
          <div className="divide-y divide-surface-100">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5 group/row hover:bg-surface-100/50 transition-colors">
                {editingId === cat.id ? (
                  <>
                    {/* Editing mode */}
                    <div className="flex items-center gap-1">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full border-2 transition-transform ${
                            editColor === c ? 'border-ink scale-110' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <input
                      autoFocus
                      className="input h-7 text-xs flex-1 min-w-0"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <Button variant="primary" size="xs" onClick={saveEdit} disabled={!editName.trim()}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="xs" onClick={cancelEdit}>
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Display mode */}
                    <GripVertical className="w-3 h-3 text-ink-faint/40 shrink-0" />
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span className="text-xs text-ink flex-1 min-w-0 truncate">
                      {cat.name}
                    </span>
                    {cat.isDefault && (
                      <span className="badge text-[10px] bg-surface-100 text-ink-faint border-surface-200/60">
                        Default
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1 text-ink-faint hover:text-ink rounded transition-colors"
                        title="Edit"
                      >
                        <Tag className="w-3 h-3" />
                      </button>
                      {!cat.isDefault && (
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1 text-ink-faint hover:text-red-500 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add new category row */}
            {adding && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-50 animate-fade-in">
                <div className="flex items-center gap-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-4 h-4 rounded-full border-2 transition-transform ${
                        newColor === c ? 'border-ink scale-110' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <input
                  autoFocus
                  className="input h-7 text-xs flex-1 min-w-0"
                  placeholder="Category name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addCategory()
                    if (e.key === 'Escape') { setAdding(false); setNewName('') }
                  }}
                />
                <Button variant="primary" size="xs" onClick={addCategory} disabled={!newName.trim() || addSaving} loading={addSaving}>
                  <Check className="w-3 h-3" /> Add
                </Button>
                <Button variant="ghost" size="xs" onClick={() => { setAdding(false); setNewName('') }}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {categories.length === 0 && !adding && (
            <div className="px-4 py-8 text-center">
              <Tag className="w-8 h-8 text-ink-faint mx-auto mb-2" />
              <p className="text-[11px] text-ink-faint">No categories yet. Add one to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
