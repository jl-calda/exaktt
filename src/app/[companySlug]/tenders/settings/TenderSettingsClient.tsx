// src/app/(app)/tenders/settings/TenderSettingsClient.tsx
'use client'
import { useState } from 'react'
import {
  Plus, ChevronRight, ChevronDown, Trash2, Edit3, Check, X,
  FileText, Layers,
} from 'lucide-react'
import { nanoid } from 'nanoid'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Button, Input } from '@/components/ui'
import { NumberInput } from '@/components/ui/Input'

const BLOCK_CATEGORIES = [
  { value: 'scope',         label: 'Scope of Work' },
  { value: 'exclusions',    label: 'Exclusions' },
  { value: 'payment_terms', label: 'Payment Terms' },
  { value: 'assumptions',   label: 'Assumptions' },
  { value: 'header',        label: 'Header' },
  { value: 'custom',        label: 'Custom' },
]

interface TenderBlock {
  id: string; name: string; category: string; blockTitle?: string; blockContent?: string
}

interface Props {
  initialBlocks?: TenderBlock[]
  initialReportDefaults?: any
  initialPredefinedItemsLibrary?: any[]
}

export default function TenderSettingsClient({
  initialBlocks = [],
  initialReportDefaults,
  initialPredefinedItemsLibrary,
}: Props) {
  const [settingsCollapsed, setSettingsCollapsed] = useState<Set<string>>(new Set())
  const toggleSettings = (key: string) =>
    setSettingsCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  /* ── Blocks state ─────────────────────────────────────────── */
  const [blocks, setBlocks] = useState<TenderBlock[]>(initialBlocks)
  const [blockEditing, setBlockEditing] = useState<string | null>(null)
  const [blockForm, setBlockForm] = useState({ name: '', category: 'custom', blockTitle: '', blockContent: '' })
  const [blockAdding, setBlockAdding] = useState(false)
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockDeleteId, setBlockDeleteId] = useState<string | null>(null)

  const saveBlocks = async (next: TenderBlock[]) => {
    setBlockSaving(true)
    await fetch('/api/tenders/blocks', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: next }),
    })
    setBlocks(next)
    setBlockSaving(false)
  }

  const addBlock = () => {
    if (!blockForm.name.trim()) return
    const next = [...blocks, { id: nanoid(), ...blockForm }]
    saveBlocks(next)
    setBlockForm({ name: '', category: 'custom', blockTitle: '', blockContent: '' })
    setBlockAdding(false)
  }

  const updateBlock = () => {
    if (!blockEditing || !blockForm.name.trim()) return
    const next = blocks.map(b => b.id === blockEditing ? { ...b, ...blockForm } : b)
    saveBlocks(next)
    setBlockEditing(null)
  }

  const removeBlock = (id: string) => {
    saveBlocks(blocks.filter(b => b.id !== id))
    setBlockDeleteId(null)
  }

  const startEditBlock = (b: TenderBlock) => {
    setBlockEditing(b.id)
    setBlockForm({ name: b.name, category: b.category, blockTitle: b.blockTitle ?? '', blockContent: b.blockContent ?? '' })
    setBlockAdding(false)
  }

  /* ── Report Defaults state ──────────────────────────────────── */
  const [reportDefaults, setReportDefaults] = useState<any>(initialReportDefaults ?? {})
  const [savingDefaults, setSavingDefaults] = useState(false)

  const saveReportDefaults = async () => {
    setSavingDefaults(true)
    await fetch('/api/tenders/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportDefaults }),
    })
    setSavingDefaults(false)
  }

  /* ── Predefined Items Library state ─────────────────────────── */
  const [libraryItems, setLibraryItems] = useState<any[]>(initialPredefinedItemsLibrary ?? [])
  const [savingLibrary, setSavingLibrary] = useState(false)

  const addLibraryItem = () => {
    setLibraryItems(prev => [...prev, { id: nanoid(), description: '', amount: 0 }])
  }

  const updateLibraryItem = (id: string, patch: any) => {
    setLibraryItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const removeLibraryItem = (id: string) => {
    setLibraryItems(prev => prev.filter(item => item.id !== id))
  }

  const saveLibraryItems = async () => {
    setSavingLibrary(true)
    await fetch('/api/tenders/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predefinedItemsLibrary: libraryItems }),
    })
    setSavingLibrary(false)
  }

  return (
    <div className="min-h-full px-4 py-4 md:px-6 md:py-5 space-y-4">

      {/* 1. Blocks */}
      <div className="card overflow-hidden">
        <div className="cursor-pointer select-none card-header bg-surface-50"
          onClick={() => toggleSettings('blocks')}>
          <div className="flex items-center gap-2">
            {settingsCollapsed.has('blocks') ? <ChevronRight className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
            <span className="icon-well bg-surface-200/40"><Layers className="w-3.5 h-3.5 text-ink-muted" /></span>
            <span className="font-semibold text-sm text-ink">Blocks</span>
            {blocks.length > 0 && <span className="text-[10px] text-ink-faint">({blocks.length})</span>}
          </div>
          {!settingsCollapsed.has('blocks') && (
            <button onClick={(e) => { e.stopPropagation(); setBlockAdding(v => !v); setBlockEditing(null) }} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" /> New Block
            </button>
          )}
        </div>

        {!settingsCollapsed.has('blocks') && (
          <div className="p-4 space-y-4">
            {/* Add block form */}
            {blockAdding && (
              <div className="card p-4 border-primary/30 bg-primary/5 space-y-3 animate-fade-in">
                <div className="text-xs font-bold text-primary uppercase tracking-wide">New Block</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Name *</label>
                    <input className="input" value={blockForm.name} onChange={e => setBlockForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Payment Terms" autoFocus />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input" value={blockForm.category} onChange={e => setBlockForm(f => ({ ...f, category: e.target.value }))}>
                      {BLOCK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Block Title (optional)</label>
                  <input className="input" value={blockForm.blockTitle} onChange={e => setBlockForm(f => ({ ...f, blockTitle: e.target.value }))} placeholder="Title shown in the PDF" />
                </div>
                <div>
                  <label className="label">Content</label>
                  <textarea className="input resize-none" rows={4} value={blockForm.blockContent}
                    onChange={e => setBlockForm(f => ({ ...f, blockContent: e.target.value }))}
                    placeholder="Block content text..." />
                </div>
                <div className="flex gap-2">
                  <button onClick={addBlock} disabled={!blockForm.name.trim() || blockSaving} className="btn-primary text-sm">
                    <Check className="w-3.5 h-3.5" /> {blockSaving ? 'Saving...' : 'Add Block'}
                  </button>
                  <button onClick={() => setBlockAdding(false)} className="btn-secondary text-sm">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Block list */}
            {blocks.length === 0 && !blockAdding && (
              <div className="text-center text-sm text-ink-faint py-8">
                No blocks yet. Create reusable text blocks for your quotations — scope of work, payment terms, exclusions, etc.
              </div>
            )}

            <div className="space-y-2">
              {blocks.map(b => {
                const isEd = blockEditing === b.id
                const catMeta = BLOCK_CATEGORIES.find(c => c.value === b.category)
                return (
                  <div key={b.id} className={`card p-4 ${isEd ? 'ring-2 ring-primary' : ''}`}>
                    {!isEd ? (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ink">{b.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-surface-100 text-ink-muted">{catMeta?.label ?? b.category}</span>
                          </div>
                          {b.blockTitle && <div className="text-xs text-ink-muted mt-0.5">{b.blockTitle}</div>}
                          {b.blockContent && <div className="text-xs text-ink-faint mt-1 line-clamp-2">{b.blockContent}</div>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEditBlock(b)} className="p-1.5 rounded-lg text-ink-faint hover:text-primary hover:bg-surface-100 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setBlockDeleteId(b.id)} className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="label">Name *</label><input className="input" value={blockForm.name} onChange={e => setBlockForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
                          <div><label className="label">Category</label><select className="input" value={blockForm.category} onChange={e => setBlockForm(f => ({ ...f, category: e.target.value }))}>{BLOCK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                        </div>
                        <div><label className="label">Block Title</label><input className="input" value={blockForm.blockTitle} onChange={e => setBlockForm(f => ({ ...f, blockTitle: e.target.value }))} /></div>
                        <div><label className="label">Content</label><textarea className="input resize-none" rows={4} value={blockForm.blockContent} onChange={e => setBlockForm(f => ({ ...f, blockContent: e.target.value }))} /></div>
                        <div className="flex gap-2">
                          <button onClick={updateBlock} disabled={!blockForm.name.trim() || blockSaving} className="btn-primary text-sm"><Check className="w-3.5 h-3.5" /> Save</button>
                          <button onClick={() => setBlockEditing(null)} className="btn-secondary text-sm"><X className="w-3.5 h-3.5" /> Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <ConfirmModal
              open={blockDeleteId !== null}
              title="Delete block?"
              message="This block will be permanently removed. Existing reports that used it will not be affected."
              onConfirm={() => { if (blockDeleteId) removeBlock(blockDeleteId) }}
              onCancel={() => setBlockDeleteId(null)}
            />
          </div>
        )}
      </div>

      {/* 2. Report Defaults */}
      <div className="card overflow-hidden">
        <div className="cursor-pointer select-none card-header !justify-start gap-2 bg-surface-50"
          onClick={() => toggleSettings('reportDefaults')}>
          {settingsCollapsed.has('reportDefaults') ? <ChevronRight className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
          <span className="icon-well bg-surface-200/40"><FileText className="w-3.5 h-3.5 text-ink-muted" /></span>
          <span className="font-semibold text-sm text-ink">Report Defaults</span>
        </div>

        {!settingsCollapsed.has('reportDefaults') && (
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Report Defaults</h3>
            <div>
              <label className="label">Default Payment Terms</label>
              <textarea className="input resize-none" rows={2} value={reportDefaults.paymentTerms ?? ''}
                onChange={e => setReportDefaults((d: any) => ({ ...d, paymentTerms: e.target.value }))} />
            </div>
            <div>
              <label className="label">Default Disclaimer</label>
              <textarea className="input resize-none" rows={2} value={reportDefaults.disclaimer ?? ''}
                onChange={e => setReportDefaults((d: any) => ({ ...d, disclaimer: e.target.value }))} />
            </div>
            <Input label="Default Validity Period" value={reportDefaults.validityPeriod ?? ''}
              onChange={e => setReportDefaults((d: any) => ({ ...d, validityPeriod: e.target.value }))} placeholder="e.g. 30 days" />
            <Button size="sm" variant="primary" onClick={saveReportDefaults} loading={savingDefaults}>Save Defaults</Button>
          </div>
        )}
      </div>

      {/* 3. Predefined Items Library */}
      <div className="card overflow-hidden">
        <div className="cursor-pointer select-none card-header bg-surface-50"
          onClick={() => toggleSettings('libraryItems')}>
          <div className="flex items-center gap-2">
            {settingsCollapsed.has('libraryItems') ? <ChevronRight className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
            <span className="icon-well bg-surface-200/40"><Layers className="w-3.5 h-3.5 text-ink-muted" /></span>
            <span className="font-semibold text-sm text-ink">Predefined Items Library</span>
            {libraryItems.length > 0 && <span className="text-[10px] text-ink-faint">({libraryItems.length})</span>}
          </div>
          {!settingsCollapsed.has('libraryItems') && (
            <Button size="sm" onClick={(e) => { e.stopPropagation(); addLibraryItem() }}>Add Item</Button>
          )}
        </div>

        {!settingsCollapsed.has('libraryItems') && (
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wide">Predefined Items Library</h3>
            {libraryItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 border border-surface-200 rounded-lg">
                <input className="input text-sm flex-1" value={item.description} placeholder="Description"
                  onChange={e => updateLibraryItem(item.id, { description: e.target.value })} />
                <NumberInput value={item.amount} unit="$" min={0} className="w-28"
                  onChange={e => updateLibraryItem(item.id, { amount: parseFloat(e.target.value) || 0 })} />
                <button onClick={() => removeLibraryItem(item.id)} className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <Button size="sm" variant="primary" onClick={saveLibraryItems} loading={savingLibrary}>Save Library</Button>
          </div>
        )}
      </div>

    </div>
  )
}
