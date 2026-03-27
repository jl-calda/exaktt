// src/components/calculator/SettingsTab.tsx
'use client'
import { useState } from 'react'
import type { GlobalTag } from '@/types'
import { nanoid } from 'nanoid'
import { Plus, Edit3, Trash2, Check, X } from 'lucide-react'

interface Props {
  tags:         GlobalTag[]
  onTagsChange: (tags: GlobalTag[]) => void
}

const TAG_COLORS = ['#7c3aed','#0891b2','#059669','#dc2626','#b45309','#be185d','#4f46e5','#0369a1','#64748b','#f59e0b']

export default function SettingsTab({ tags, onTagsChange }: Props) {
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState('#7c3aed')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<GlobalTag> | null>(null)

  const addTag = () => {
    if (!newName.trim()) return
    onTagsChange([...tags, { id: nanoid(), name: newName.trim(), color: newColor, order: tags.length }])
    setNewName(''); setNewColor('#7c3aed')
  }

  const removeTag  = (id: string) => onTagsChange(tags.filter(t => t.id !== id))
  const startEdit  = (t: GlobalTag) => { setEditingId(t.id); setEditDraft({ ...t }) }
  const cancelEdit = () => { setEditingId(null); setEditDraft(null) }
  const saveEdit   = () => {
    if (!editDraft?.name?.trim()) return
    onTagsChange(tags.map(t => t.id === editingId ? { ...t, ...editDraft } as GlobalTag : t))
    cancelEdit()
  }

  // Persist tags to API
  const persistTags = async (updated: GlobalTag[]) => {
    onTagsChange(updated)
    try {
      await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updated }),
      })
    } catch {}
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6">
        <div className="mb-1">
          <h2 className="font-display font-bold text-lg text-ink">🏷️ Material Tags</h2>
          <p className="text-sm text-ink-muted mt-1 leading-relaxed">
            Define tags to categorise materials across all systems. Assign multiple tags per material — e.g. a bracket can have tags "structural", "FHLL", "hot-dip-galv". Tags are shared globally across all your systems.
          </p>
        </div>

        {/* Add new tag */}
        <div className="mt-5 flex flex-wrap gap-3 items-end p-4 bg-surface-100 rounded-2xl border border-surface-200/60">
          <div className="flex-1 min-w-36">
            <label className="label">New tag name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder='e.g. "FHLL", "structural"'
              className="input" onKeyDown={e => { if (e.key === 'Enter') addTag() }} />
          </div>
          <div>
            <label className="label">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {TAG_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  style={{ background: c, outline: newColor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}
                  className="w-6 h-6 rounded-lg transition-all" />
              ))}
            </div>
          </div>
          <button onClick={addTag} disabled={!newName.trim()} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Tag
          </button>
        </div>

        {/* Preview */}
        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map(t => (
              <span key={t.id}
                className="badge border border-surface-200/60 px-3 py-1 text-sm font-bold bg-surface-100 text-ink">
                {t.name}
              </span>
            ))}
          </div>
        )}

        {/* Tag list */}
        {tags.length === 0 ? (
          <div className="mt-6 text-center py-8 text-ink-faint text-sm">
            No tags yet — add your first tag above.
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {tags.map(t => {
              const isEd = editingId === t.id
              return (
                <div key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isEd ? 'border-primary bg-primary/5' : 'border-surface-200/60 bg-surface-50'}`}>
                  <span style={{ background: isEd ? editDraft?.color : t.color }}
                    className="w-3 h-3 rounded-full flex-shrink-0" />

                  {isEd && editDraft ? (
                    <>
                      <input value={editDraft.name ?? ''} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                        className="input flex-1 text-sm py-1.5"
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit() }} autoFocus />
                      <div className="flex gap-1.5">
                        {TAG_COLORS.map(c => (
                          <button key={c} onClick={() => setEditDraft(d => ({ ...d, color: c }))}
                            style={{ background: c, outline: editDraft.color === c ? `2px solid ${c}` : 'none', outlineOffset: 1 }}
                            className="w-5 h-5 rounded-lg" />
                        ))}
                      </div>
                      <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700 p-1">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelEdit} className="text-ink-faint hover:text-ink p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium text-sm text-ink">{t.name}</span>
                      <button onClick={() => startEdit(t)} className="btn-ghost py-1 px-2 text-ink-muted">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => persistTags(tags.filter(x => x.id !== t.id))} className="btn-ghost py-1 px-2 text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
