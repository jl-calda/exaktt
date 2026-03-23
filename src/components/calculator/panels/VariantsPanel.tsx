// src/components/calculator/panels/VariantsPanel.tsx
'use client'
import { useState } from 'react'
import type { Variant, VariantNode } from '@/types'
import { nanoid } from 'nanoid'
import { Plus, Trash2, Edit3, Check, X, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/Input'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { IconPicker }  from '@/components/ui/IconPicker'

interface Props {
  variants: Variant[]
  onChange: (variants: Variant[]) => void
}

const VARIANT_HELP = {
  title: 'Cascading variant selector',
  formula: 'L1 → L2 → L3 (leaf)',
  example: 'Type → Sub → Profile — user picks one path, materials on that leaf are included',
}

const VARIANT_FIELD_ITEMS = [
  { label: 'Name', desc: 'Shown as the section heading in the calculator.' },
  { label: 'L1 / L2 / L3 labels', desc: 'Names for each level of the cascade — shown as select labels in the calculator.' },
  { label: 'Leaf node', desc: 'The deepest level. Assign materials here — only materials tagged to the chosen leaf are included.' },
]

function FieldGuide() {
  return (
    <div className="w-96 shrink-0 self-stretch bg-surface-100 border border-surface-200 px-4 py-3"
      style={{ borderRadius: 'var(--radius)' }}>
      <div className="mb-3 pb-3 border-b border-surface-200">
        <div className="text-xs font-semibold text-ink mb-0.5">{VARIANT_HELP.title}</div>
        <div className="font-mono text-[11px] text-primary mb-1">{VARIANT_HELP.formula}</div>
        <div className="text-[10px] text-ink-faint italic">{VARIANT_HELP.example}</div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {VARIANT_FIELD_ITEMS.map(item => (
          <div key={item.label} className="min-w-[200px] flex-1">
            <div className="text-xs font-semibold text-ink mb-0.5">{item.label}</div>
            <div className="text-[10px] text-ink-faint italic leading-snug">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Recursive node editor ────────────────────────────────────────────────────
function VariantNodeEditor({
  node, variant, depth, onUpdateVariant,
}: {
  node: VariantNode; variant: Variant; depth: number; onUpdateVariant: (v: Variant) => void
}) {
  const [expanded,     setExpanded]     = useState(true)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft,   setLabelDraft]   = useState(node.label)
  const [confirming,   setConfirming]   = useState(false)

  const DEPTH_COLORS = ['#64748b', '#0369a1', '#7c3aed']
  const color = DEPTH_COLORS[depth] ?? '#64748b'

  const deepUpdate   = (nodes: VariantNode[], key: string, fn: (n: VariantNode) => VariantNode): VariantNode[] =>
    nodes.map(n => n.key === key ? fn(n) : { ...n, children: deepUpdate(n.children ?? [], key, fn) })
  const deepDelete   = (nodes: VariantNode[], key: string): VariantNode[] =>
    nodes.filter(n => n.key !== key).map(n => ({ ...n, children: deepDelete(n.children ?? [], key) }))
  const deepAddChild = (nodes: VariantNode[], parentKey: string, child: VariantNode): VariantNode[] =>
    nodes.map(n => n.key === parentKey
      ? { ...n, children: [...(n.children ?? []), child] }
      : { ...n, children: deepAddChild(n.children ?? [], parentKey, child) }
    )

  const upd      = (fn: (n: VariantNode) => VariantNode) => onUpdateVariant({ ...variant, nodes: deepUpdate(variant.nodes, node.key, fn) })
  const del      = () => onUpdateVariant({ ...variant, nodes: deepDelete(variant.nodes, node.key) })
  const addChild = () => {
    const child: VariantNode = { key: 'n_' + nanoid(6), label: 'New option', children: [] }
    onUpdateVariant({ ...variant, nodes: deepAddChild(variant.nodes, node.key, child) })
  }
  const saveLabel = () => { upd(n => ({ ...n, label: labelDraft })); setEditingLabel(false) }

  const hasChildren = (node.children ?? []).length > 0
  const isLeaf      = depth >= 2 || !hasChildren

  return (
    <div className="ml-3 border-l-2 pl-3" style={{ borderColor: color + '30' }}>
      <div className="flex items-center gap-2 py-1">
        {hasChildren ? (
          <button onClick={() => setExpanded(v => !v)} className="text-ink-faint hover:text-ink flex-shrink-0">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}

        {editingLabel ? (
          <input value={labelDraft} onChange={e => setLabelDraft(e.target.value)}
            className="input text-xs py-1 flex-1 min-w-0"
            onKeyDown={e => { if (e.key === 'Enter') saveLabel() }}
            autoFocus />
        ) : (
          <span className="text-sm font-medium text-ink flex-1 min-w-0 truncate"
            style={{ color: isLeaf ? color : undefined }}>
            {node.label}
          </span>
        )}

        <div className="flex gap-1 flex-shrink-0">
          {editingLabel ? (
            <>
              <Button size="xs" variant="primary"   onClick={saveLabel} icon={<Check className="w-3 h-3" />} />
              <Button size="xs" variant="secondary" onClick={() => { setEditingLabel(false); setLabelDraft(node.label) }} icon={<X className="w-3 h-3" />} />
            </>
          ) : (
            <>
              <Button size="xs" variant="ghost"  onClick={() => { setLabelDraft(node.label); setEditingLabel(true) }} icon={<Edit3 className="w-3 h-3" />} />
              {depth < 2 && <Button size="xs" variant="ghost" onClick={addChild} icon={<Plus className="w-3 h-3" />} />}
              <Button size="xs" variant="danger" onClick={() => setConfirming(true)} icon={<Trash2 className="w-3 h-3" />} />
            </>
          )}
        </div>
      </div>

      {expanded && (node.children ?? []).map(child => (
        <VariantNodeEditor key={child.key} node={child} variant={variant} depth={depth + 1} onUpdateVariant={onUpdateVariant} />
      ))}
      <ConfirmModal
        open={confirming}
        title="Delete option?"
        message={`"${node.label}" and all its children will be removed.`}
        onConfirm={() => { del(); setConfirming(false) }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
const BLANK_VARIANT = { name: '', icon: '🔀', color: '#0f172a', levelLabels: ['Type', 'Sub', 'Profile'] as [string, string, string] }

export default function VariantsPanel({ variants, onChange }: Props) {
  const [adding,       setAdding]       = useState(false)
  const [draft,        setDraft]        = useState({ ...BLANK_VARIANT })
  const [editingVarId, setEditingVarId] = useState<string | null>(null)
  const [editVarDraft, setEditVarDraft] = useState<Partial<Variant> | null>(null)
  const [deleteVarId,  setDeleteVarId]  = useState<string | null>(null)

  const addVariant    = () => {
    if (!draft.name.trim()) return
    onChange([...variants, { id: nanoid(), ...draft, nodes: [] }])
    setDraft({ ...BLANK_VARIANT }); setAdding(false)
  }
  const removeVariant = (id: string) => onChange(variants.filter(v => v.id !== id))
  const updateVariant = (v: Variant)  => onChange(variants.map(x => x.id === v.id ? v : x))
  const startEditVar  = (v: Variant)  => { setEditingVarId(v.id); setEditVarDraft({ ...v, levelLabels: [...v.levelLabels] }); setAdding(false) }
  const cancelEditVar = ()             => { setEditingVarId(null); setEditVarDraft(null) }
  const saveEditVar   = ()             => {
    if (!editVarDraft?.name?.trim()) return
    onChange(variants.map(v => v.id === editingVarId ? { ...v, ...editVarDraft } as Variant : v))
    cancelEditVar()
  }
  const addL0 = (v: Variant) => {
    const node: VariantNode = { key: 'n_' + nanoid(6), label: 'New ' + (v.levelLabels[0] ?? 'option'), children: [] }
    updateVariant({ ...v, nodes: [...v.nodes, node] })
  }

  const VariantForm = ({ name, icon, color, levelLabels, onName, onIcon, onColor, onLevel, onSave, onCancel }: {
    name: string; icon: string; color: string; levelLabels: [string, string, string]
    onName: (v: string) => void; onIcon: (v: string) => void; onColor: (v: string) => void
    onLevel: (i: number, v: string) => void; onSave: () => void; onCancel: () => void
  }) => (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Row 1: identity */}
        <div className="flex flex-wrap gap-4 items-start">
          <Input label="Name" value={name} onChange={e => onName(e.target.value)} placeholder='e.g. "Bracket Type"' className="w-44" />
          <IconPicker label="Icon" value={icon} onChange={onIcon} />
          <ColorPicker label="Colour" value={color} onChange={onColor} />
        </div>
        {/* Row 2: level labels */}
        <div className="flex flex-wrap gap-4 items-start">
          {([0, 1, 2] as const).map(li => (
            <Input key={li} label={`L${li + 1} label`} value={levelLabels[li]}
              onChange={e => onLevel(li, e.target.value)} className="w-28" />
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="primary"   onClick={onSave}   icon={<Check className="w-3.5 h-3.5" />}>Save</Button>
          <Button size="sm" variant="secondary" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>Cancel</Button>
        </div>
      </div>
      <FieldGuide />
    </div>
  )

  return (
    <div className="border border-secondary-200 bg-surface-50 overflow-hidden" style={{ borderRadius: 'var(--radius-card)' }}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: 'var(--color-secondary-100)', borderColor: 'var(--color-secondary-200)' }}>
        <div>
          <h3 className="font-semibold text-sm text-secondary-700">🔀 Variants</h3>
          <p className="text-xs text-secondary-600 mt-0.5">Cascading selectors — tag materials to specific leaf nodes.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(v => !v)} icon={<Plus className="w-3.5 h-3.5" />} className="!border-secondary-200 !text-secondary-700">Add Variant</Button>
      </div>

      {adding && (
        <div className="p-5 bg-surface-100 border-b border-secondary-200">
          <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wide mb-4">New Variant</div>
          <VariantForm
            name={draft.name} icon={draft.icon} color={draft.color} levelLabels={draft.levelLabels}
            onName={v => setDraft(d => ({ ...d, name: v }))}
            onIcon={v => setDraft(d => ({ ...d, icon: v }))}
            onColor={v => setDraft(d => ({ ...d, color: v }))}
            onLevel={(i, v) => setDraft(d => { const ll = [...d.levelLabels] as [string,string,string]; ll[i] = v; return { ...d, levelLabels: ll } })}
            onSave={addVariant} onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {variants.length === 0 && !adding && (
        <div className="py-10 text-center text-sm text-ink-faint">No variants defined yet.</div>
      )}

      <div className="divide-y divide-secondary-200">
        {variants.map(v => {
          const isEd = editingVarId === v.id
          return (
            <div key={v.id}>
              <div className="px-5 py-3 flex items-center gap-3" style={{ background: v.color + '08' }}>
                <span className="text-xl">{v.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink">{v.name}</div>
                  <div className="text-xs text-ink-faint">{v.levelLabels.join(' → ')} · {v.nodes.length} top-level options</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="xs" variant="secondary" onClick={() => addL0(v)} icon={<Plus className="w-3 h-3" />}>
                    {v.levelLabels[0]}
                  </Button>
                  <Button size="xs" variant={isEd ? 'primary' : 'ghost'}
                    onClick={() => isEd ? cancelEditVar() : startEditVar(v)}
                    icon={<Edit3 className="w-3 h-3" />}>
                    {isEd ? 'Cancel' : 'Edit'}
                  </Button>
                  <Button size="xs" variant="danger" onClick={() => setDeleteVarId(v.id)} icon={<Trash2 className="w-3 h-3" />} />
                </div>
              </div>

              {isEd && editVarDraft && (
                <div className="px-5 py-4 bg-primary/5 border-b border-primary/20">
                  <VariantForm
                    name={editVarDraft.name ?? ''} icon={editVarDraft.icon ?? ''} color={editVarDraft.color ?? '#0f172a'}
                    levelLabels={(editVarDraft.levelLabels ?? ['Type','Sub','Profile']) as [string,string,string]}
                    onName={v => setEditVarDraft(d => ({ ...d, name: v }))}
                    onIcon={v => setEditVarDraft(d => ({ ...d, icon: v }))}
                    onColor={v => setEditVarDraft(d => ({ ...d, color: v }))}
                    onLevel={(i, v) => {
                      const ll = [...(editVarDraft.levelLabels ?? ['Type','Sub','Profile'])] as [string,string,string]
                      ll[i] = v
                      setEditVarDraft(d => ({ ...d, levelLabels: ll }))
                    }}
                    onSave={saveEditVar} onCancel={cancelEditVar}
                  />
                </div>
              )}

              {v.nodes.length > 0 && (
                <div className="px-5 pb-4 pt-2">
                  {v.nodes.map(node => (
                    <VariantNodeEditor key={node.key} node={node} variant={v} depth={0} onUpdateVariant={updateVariant} />
                  ))}
                </div>
              )}
              {v.nodes.length === 0 && (
                <div className="px-5 pb-4 pt-2 text-xs text-ink-faint italic">
                  No options yet — click "{v.levelLabels[0]}" above to add the first.
                </div>
              )}

              <div className="px-5 pb-3 flex gap-4 flex-wrap">
                {(['#64748b','#0369a1','#7c3aed'] as const).map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[10px] text-ink-faint">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ background: c }} />
                    {v.levelLabels[i] ?? `L${i+1}`} {i === 2 ? '(leaf — assign materials here)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <ConfirmModal
        open={deleteVarId !== null}
        title="Delete variant?"
        message="All options and material tags for this variant will be removed."
        onConfirm={() => { removeVariant(deleteVarId!); setDeleteVarId(null) }}
        onCancel={() => setDeleteVarId(null)}
      />
    </div>
  )
}
