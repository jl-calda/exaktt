'use client'

import { useState, useCallback } from 'react'
import { Building2, Plus, Check, X, Trash2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const PRESET_COLORS = [
  '#64748b', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
]

type Department = {
  id: string
  name: string
  color: string
  sortOrder: number
  isDefault: boolean
  _count?: { employees: number }
}

interface Props {
  initialDepartments: Department[]
}

export default function SettingsDepartmentsClient({ initialDepartments }: Props) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#10b981')
  const [addSaving, setAddSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const refreshDepartments = useCallback(async () => {
    const res = await fetch('/api/settings/departments')
    if (res.ok) {
      const data = await res.json()
      setDepartments(data)
    }
  }, [])

  const startEdit = (dept: Department) => {
    setEditingId(dept.id)
    setEditName(dept.name)
    setEditColor(dept.color)
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
    const res = await fetch(`/api/settings/departments/${editingId}`, {
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
    await refreshDepartments()
  }

  const addDepartment = async () => {
    if (!newName.trim()) return
    setAddSaving(true)
    setError(null)
    const res = await fetch('/api/settings/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        color: newColor,
        sortOrder: departments.length,
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
    await refreshDepartments()
  }

  const deleteDepartment = async (id: string) => {
    setError(null)
    const res = await fetch(`/api/settings/departments/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to delete')
      return
    }
    await refreshDepartments()
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-4 h-4 text-ink-faint" />
        <h1 className="font-semibold text-base text-ink">Departments</h1>
      </div>

      <div className="card p-0">
        <div className="card-header flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-ink-faint" />
            <h3 className="text-[13px] font-semibold text-ink">Company Departments</h3>
            <span className="text-[10px] text-ink-faint">{departments.length} departments</span>
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

        <div className="divide-y divide-surface-100">
          {departments.map(dept => (
            <div key={dept.id} className="flex items-center gap-3 px-4 py-2.5 group/row hover:bg-surface-100/50 transition-colors">
              {editingId === dept.id ? (
                <>
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
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: dept.color }} />
                  <span className="text-xs text-ink flex-1 min-w-0 truncate">{dept.name}</span>
                  {dept._count?.employees != null && dept._count.employees > 0 && (
                    <span className="text-[10px] text-ink-faint">{dept._count.employees} staff</span>
                  )}
                  <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(dept)}
                      className="p-1 text-ink-faint hover:text-ink rounded transition-colors"
                      title="Edit"
                    >
                      <Tag className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteDepartment(dept.id)}
                      className="p-1 text-ink-faint hover:text-red-500 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

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
                placeholder="Department name..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addDepartment()
                  if (e.key === 'Escape') { setAdding(false); setNewName('') }
                }}
              />
              <Button variant="primary" size="xs" onClick={addDepartment} disabled={!newName.trim() || addSaving} loading={addSaving}>
                <Check className="w-3 h-3" /> Add
              </Button>
              <Button variant="ghost" size="xs" onClick={() => { setAdding(false); setNewName('') }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {departments.length === 0 && !adding && (
          <div className="px-4 py-8 text-center">
            <Building2 className="w-8 h-8 text-ink-faint mx-auto mb-2" />
            <p className="text-[11px] text-ink-faint">No departments yet. Add one to organize your team.</p>
          </div>
        )}
      </div>
    </div>
  )
}
