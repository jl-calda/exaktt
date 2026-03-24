// src/components/calculator/SystemOverviewPanel.tsx
// Sticky right-hand panel in SetupTab showing a live summary of the system configuration.
'use client'
import { useState } from 'react'
import type { MtoSystem } from '@/types'
import { PRIMITIVE_DIMS, DIMS_FOR_INPUT_MODEL, INPUT_MODELS, getDimUnit } from '@/lib/engine/constants'
import { normalizeInputModel } from '@/types'
import { ChevronDown, ChevronUp, GitBranch } from 'lucide-react'

interface Props { sys: MtoSystem; onViewGraph?: () => void }

// ─── Collapsible section ──────────────────────────────────────────────────────
function Section({ title, icon, count, children, defaultOpen = true }: {
  title: string; icon: string; count?: number
  children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-surface-200 last:border-0">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-surface-100 transition-colors" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-xs font-bold text-ink">{title}</span>
          {count !== undefined && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${count > 0 ? 'bg-primary/10 text-primary' : 'bg-surface-200 text-ink-faint'}`}>
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-ink-faint" /> : <ChevronDown className="w-3 h-3 text-ink-faint" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
    </div>
  )
}

function Pill({ label }: { label: string; color?: string; bg?: string }) {
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 bg-surface-100 text-ink-muted border border-surface-200"
      style={{ borderRadius: 'var(--radius)' }}>{label}</span>
  )
}

function Row({ icon, label, sub, keyTag, right }: { icon?: string; label: string; sub?: string; keyTag?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs bg-surface-100 px-2.5 py-2" style={{ borderRadius: 'var(--radius)' }}>
      {icon && <span className="text-sm flex-shrink-0 leading-none">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ink truncate">{label}</div>
        {keyTag && (
          <div className="font-mono text-[9px] text-ink-faint bg-surface-200 px-1 py-0.5 mt-0.5 inline-block" style={{ borderRadius: 'var(--radius)' }}>
            {keyTag}
          </div>
        )}
        {sub && <div className="text-[10px] text-ink-faint mt-0.5">{sub}</div>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}

// ─── Which primitive dims will the calculator show? ───────────────────────────
function getCalculatorInputs(sys: MtoSystem): string[] {
  const cds = sys.customDims ?? []
  const mats = sys.materials ?? []

  const dimKeys = DIMS_FOR_INPUT_MODEL[sys.inputModel]
  if (dimKeys) return dimKeys

  // fallback: only dims that are actively referenced
  const ALL = PRIMITIVE_DIMS.map(d => d.key)
  return ALL.filter(key =>
    cds.some(cd => cd.derivType === 'stock_length' && cd.stockTargetDim === key) ||
    cds.some(cd => cd.derivType === 'spacing'      && cd.spacingTargetDim === key) ||
    cds.some(cd => cd.derivType === 'formula'      && cd.formulaDimKey === key) ||
    mats.some(m  => (m.ruleSet ?? []).some(r => r.ruleDimKey === key))
  )
}

const DERIV_LABELS: Record<string, { label: string }> = {
  spacing:      { label: 'Spacing'      },
  stock_length: { label: 'Stock solver' },
  formula:      { label: 'Formula'      },
  sum:          { label: 'Sum'          },
  plate_nesting:{ label: 'Plate nest'   },
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SystemOverviewPanel({ sys, onViewGraph }: Props) {
  const cds      = sys.customDims      ?? []
  const criteria = sys.customCriteria  ?? []
  const variants = sys.variants        ?? []
  const warnings = sys.warnings        ?? []
  const brackets = sys.customBrackets  ?? []
  const mats     = sys.materials       ?? []
  const activities = sys.workActivities ?? []

  const calcInputs    = getCalculatorInputs(sys)
  const primMap       = Object.fromEntries(PRIMITIVE_DIMS.map(d => [d.key, d]))
  const userInputDims = cds.filter(cd => cd.derivType === 'user_input')
  const bracketMatIds = new Set(
    brackets.flatMap(b => (b.bom ?? []).map((item: any) => item.materialId).filter(Boolean))
  )
  // Bracket-only = no rule AND is a bracket BOM item (intentionally rule-free)
  const bracketOnlyIds  = new Set(
    mats.filter(m => !(m.ruleSet ?? []).some(r => r.ruleType) && bracketMatIds.has(m.id)).map(m => m.id)
  )
  const matsNeedingRule = mats.filter(m => !(m.ruleSet ?? []).some(r => r.ruleType) && !bracketMatIds.has(m.id))
  const matsForCoverage = mats.filter(m => !bracketOnlyIds.has(m.id))
  const matsWithRule    = matsForCoverage.filter(m => (m.ruleSet ?? []).some(r => r.ruleType))
  const coverage = matsForCoverage.length > 0 ? Math.round((matsWithRule.length / matsForCoverage.length) * 100) : 0

  // Spacing dims that show as user inputs in calculator (spacingMode=user)
  const userSpacingDims = cds.filter(cd => cd.derivType === 'spacing' && cd.spacingMode === 'user')

  return (
    <div className="w-full">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-3 py-3 border-b border-surface-200 bg-surface-50 flex items-center gap-2">
          <span className="text-base leading-none">{sys.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-ink truncate">System Overview</div>
            <div className="text-[10px] text-ink-faint">Live config summary</div>
          </div>
          <span className="badge text-[10px] font-bold"
            style={{ background: sys.color + '18', color: sys.color }}>
            {INPUT_MODELS.find(m => m.value === normalizeInputModel(sys.inputModel))?.label ?? sys.inputModel}
          </span>
        </div>

        {/* ── Calculator Inputs ─────────────────────────────────────── */}
        <Section title="Calculator asks for" icon="📥" defaultOpen>
          {calcInputs.length === 0 && (
            <p className="text-[11px] text-ink-faint italic">
              No dims referenced yet — assign rules to materials to see inputs here.
            </p>
          )}
          {calcInputs.map(key => {
            const d = primMap[key]
            return d ? (
              <Row key={key} icon={d.icon} label={d.label} sub={d.unit ? `(${d.unit})` : undefined} />
            ) : null
          })}
          {userInputDims.map(cd => (
            <Row key={cd.key} icon={cd.icon} label={cd.name}
              sub={cd.unit ? `(${cd.unit})` : 'custom input'}
              keyTag={cd.key}
              right={<Pill label="input" />}
            />
          ))}
          {userSpacingDims.map(cd => (
            <Row key={cd.key} icon={cd.icon ?? '🔗'} label={cd.spacingLabel || cd.name}
              sub="spacing — user input"
              right={<Pill label="custom" />}
            />
          ))}
          {(sys.inputModel === 'linear_run' || normalizeInputModel(sys.inputModel) === 'linear') && (
            <p className="text-[10px] text-ink-faint px-0.5 pt-0.5">
              + segment mode available for complex layouts
            </p>
          )}
        </Section>

        {/* ── Custom Dimensions ────────────────────────────────────────── */}
        {(() => {
          const derivedCds = cds.filter(cd => cd.derivType !== 'user_input')
          return (
        <Section title="Custom Dimensions" icon="🔗" count={derivedCds.length} defaultOpen={derivedCds.length > 0}>
          {derivedCds.length === 0 && <p className="text-[11px] text-ink-faint italic">None defined yet.</p>}
          {derivedCds.map(cd => {
            const dt = DERIV_LABELS[cd.derivType] ?? { label: cd.derivType, color: '#64748b', bg: '#f1f5f9' }
            const sub =
              cd.derivType === 'spacing'      ? `Along: ${cd.spacingTargetDim} · ${cd.spacing} ${getDimUnit(cd.spacingTargetDim ?? 'length', sys.dimOverrides)}` :
              cd.derivType === 'stock_length' ? `Solver: ${cd.stockTargetDim} · ${(cd.stockLengths ?? []).map(l => l + ' ' + getDimUnit(cd.stockTargetDim ?? 'length', sys.dimOverrides)).join(', ')}` :
              cd.derivType === 'formula'      ? `Formula from: ${cd.formulaDimKey}` :
              cd.derivType === 'sum'          ? `Sum of: ${(cd.sumKeys ?? []).join(', ') || '—'}` : undefined
            return (
              <Row key={cd.key} icon={cd.icon ?? '🔗'} label={cd.name} keyTag={cd.key} sub={sub}
                right={<Pill label={dt.label} />} />
            )
          })}
        </Section>
          )
        })()}

        {/* ── Custom Criteria ───────────────────────────────────────── */}
        <Section title="Criteria Gates" icon="🎛️" count={criteria.length} defaultOpen={criteria.length > 0}>
          {criteria.length === 0 && <p className="text-[11px] text-ink-faint italic">None defined yet.</p>}
          {criteria.map(cr => (
            <Row key={cr.key} icon={cr.icon}
              label={cr.name}
              keyTag={cr.key}
              sub={cr.type === 'input' ? 'User toggle in calculator' : `Auto: ${cr.dimKey} ${cr.operator} ${cr.threshold}`}
              right={
                cr.type === 'input'
                  ? <Pill label="toggle" />
                  : <Pill label="auto" />
              }
            />
          ))}
        </Section>

        {/* ── Variants ─────────────────────────────────────────────── */}
        <Section title="Variants" icon="🔀" count={variants.length} defaultOpen={variants.length > 0}>
          {variants.length === 0 && <p className="text-[11px] text-ink-faint italic">None defined yet.</p>}
          {variants.map(v => {
            const leaves = (function countLeaves(nodes: any[]): number {
              return nodes.reduce((n, nd) => n + (nd.children?.length ? countLeaves(nd.children) : 1), 0)
            })(v.nodes)
            return (
              <Row key={v.id} icon={v.icon} label={v.name}
                keyTag={v.id}
                sub={`${v.nodes.length} options · ${leaves} leaves`}
                right={<span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: v.color }} />}
              />
            )
          })}
        </Section>

        {/* ── Warnings ─────────────────────────────────────────────── */}
        <Section title="Warnings" icon="⚠️" count={warnings.length} defaultOpen={warnings.length > 0}>
          {warnings.length === 0 && <p className="text-[11px] text-ink-faint italic">None defined yet.</p>}
          {warnings.map((w, i) => {
            const d = [...PRIMITIVE_DIMS, ...cds].find(x => x.key === w.dimKey)
            const dimLabel = (d as any)?.label ?? (d as any)?.name ?? w.dimKey
            return (
              <div key={w.key ?? i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 px-2.5 py-2" style={{ borderRadius: 'var(--radius)' }}>
                <span className="text-amber-500 text-sm leading-none flex-shrink-0 mt-0.5">⚠</span>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] text-amber-700 font-bold">{dimLabel} {w.operator} {w.threshold}</div>
                  <div className="text-[10px] text-amber-600 mt-0.5 leading-snug">{w.message}</div>
                </div>
              </div>
            )
          })}
        </Section>

        {/* ── Custom Brackets ───────────────────────────────────────── */}
        {brackets.length > 0 && (
          <Section title="Custom Brackets" icon="🔩" count={brackets.length} defaultOpen={false}>
            {brackets.map(b => (
              <Row key={b.id} icon={b.icon} label={b.name}
                sub={`${b.parameters.length} params · ${b.bom.length} BOM items`}
              />
            ))}
          </Section>
        )}

        {/* ── Work Activities ───────────────────────────────────────── */}
        {activities.length > 0 && (
          <Section title="Work Activities" icon="🕐" count={activities.length} defaultOpen={false}>
            {activities.map(a => (
              <Row key={a.id} icon={a.icon} label={a.name}
                sub={a.phase}
              />
            ))}
          </Section>
        )}

        {/* ── Material Coverage ─────────────────────────────────────── */}
        <Section title="Materials" icon="📦" defaultOpen>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Rule coverage</span>
              <span className={`font-bold ${coverage === 100 ? 'text-emerald-600' : coverage > 50 ? 'text-amber-600' : 'text-red-500'}`}>
                {matsWithRule.length}/{matsForCoverage.length}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-200 overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${coverage}%`,
                  background: coverage === 100 ? '#16a34a' : coverage > 50 ? '#f59e0b' : '#ef4444'
                }} />
            </div>
            {matsNeedingRule.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-ink-faint font-semibold uppercase tracking-wide">No rule yet</div>
                {matsNeedingRule.map(m => (
                  <div key={m.id} className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 truncate" style={{ borderRadius: 'var(--radius)' }}>
                    ⚠ {m.name}
                  </div>
                ))}
              </div>
            )}
            {mats.length === 0 && (
              <p className="text-[11px] text-ink-faint italic">No materials added yet.</p>
            )}
          </div>
        </Section>

        {/* Graph shortcut */}
        {onViewGraph && (
          <div className="px-3 py-3 border-t border-surface-200">
            <button
              onClick={onViewGraph}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold bg-surface-100 text-ink-muted hover:bg-primary/10 hover:text-primary transition-colors"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <GitBranch className="w-3.5 h-3.5" />
              View Dependency Graph
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
