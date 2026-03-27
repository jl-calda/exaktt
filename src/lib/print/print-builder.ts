// Build and open a print-friendly calculation breakdown window

import type { MtoSystem, Run, WorkScheduleSummary, WorkScheduleResult } from '@/types'
import { getRunDims } from '@/lib/engine/run-dims'
import { formulaTextForPrint, getVariantLeafLabel } from '@/lib/engine/formula'

const PHASE_LABELS: Record<string, string> = {
  fabrication: 'Fabrication', installation: 'Installation',
  commissioning: 'Commissioning', transport: 'Transport', third_party: 'Third Party',
}

export function openPrintWindow(
  sys: MtoSystem, runs: Run[], multiResults: any,
  workSchedule?: WorkScheduleSummary | null,
) {
  const combined = (multiResults?.combined ?? []).filter((m: any) => !m.allBlocked)
  const activeCriteria = (sys.customCriteria ?? []).filter(c => c.type === 'input')
  const variants       = sys.variants ?? []
  const hasPrice       = combined.some((m: any) => (m.unitPrice ?? 0) > 0)

  const runBlocks = runs.map((run, ri) => {
    const dims         = getRunDims(run, sys)
    const criteriaState = run.criteriaState ?? {}
    const variantState  = run.variantState  ?? {}

    const inputRow = Object.entries(dims)
      .filter(([k, v]) => !k.startsWith('__') && v > 0)
      .map(([k, v]) => {
        const cd    = (sys.customDims ?? []).find(c => c.key === k)
        const label = cd?.name ?? k
        const unit  = cd?.unit ?? (['length','width','height','perimeter'].includes(k) ? 'm' : '')
        return `<span class="badge">${label}: <b>${v}${unit}</b></span>`
      }).join(' ')

    const criteriaRow = activeCriteria.length
      ? activeCriteria.map(cr => {
          const on = criteriaState[cr.key] === true
          return `<span class="badge ${on ? 'badge-on' : 'badge-off'}">${cr.icon ?? ''} ${cr.name}: <b>${on ? 'YES' : 'NO'}</b></span>`
        }).join(' ')
      : ''

    const variantRow = variants.length
      ? variants.map(v => {
          const sel = variantState[v.id]
          const label = sel ? getVariantLeafLabel(sys, v.id, sel) : '—'
          return `<span class="badge">${v.icon ?? ''} ${v.name}: <b>${label}</b></span>`
        }).join(' ')
      : ''

    let runTotal = 0
    const matRows = combined.map((mat: any) => {
      const pr = mat.perRun?.[ri]
      if (!pr) return ''
      const ar      = pr.activeRow
      const formula = formulaTextForPrint(ar, dims, sys)
      const lineTotal = mat.unitPrice != null ? mat.unitPrice * pr.unitQty : null
      if (lineTotal != null) runTotal += lineTotal
      const priceCells = hasPrice
        ? `<td class="mono right">${mat.unitPrice != null ? '$' + mat.unitPrice.toFixed(2) : '—'}</td>
           <td class="mono right bold-price">${lineTotal != null ? '$' + lineTotal.toFixed(2) : '—'}</td>`
        : ''
      return `<tr>
        <td class="name">${mat.name}</td>
        <td>${mat.productCode || '—'}</td>
        <td class="mono">${ar?.ruleType ?? '—'}</td>
        <td class="mono">${formula}</td>
        <td class="mono right">${pr.raw}</td>
        <td class="mono right bold">${pr.unitQty} ${mat.unit}</td>
        ${priceCells}
      </tr>`
    }).join('')

    const matFooter = hasPrice ? `<tfoot><tr>
      <td colspan="6" class="right muted" style="font-size:10px">Run total</td>
      <td></td>
      <td class="mono right bold">${runTotal > 0 ? '$' + runTotal.toFixed(2) : '—'}</td>
    </tr></tfoot>` : ''

    const priceHeaders = hasPrice ? '<th>Unit Price</th><th>Total</th>' : ''

    return `<div class="run-block">
      <h3>Run #${ri + 1}: ${run.name}${run.qty > 1 ? ' <span class="muted">×' + run.qty + '</span>' : ''}</h3>
      <table class="vars-table">
        ${inputRow    ? `<tr><td class="var-label">Inputs</td><td class="var-vals">${inputRow}</td></tr>`    : ''}
        ${criteriaRow ? `<tr><td class="var-label">Criteria</td><td class="var-vals">${criteriaRow}</td></tr>` : ''}
        ${variantRow  ? `<tr><td class="var-label">Variants</td><td class="var-vals">${variantRow}</td></tr>`  : ''}
      </table>
      <table>
        <thead><tr><th>Material</th><th>Code</th><th>Rule</th><th>Formula</th><th>Raw</th><th>Qty</th>${priceHeaders}</tr></thead>
        <tbody>${matRows}</tbody>
        ${matFooter}
      </table>
    </div>`
  }).join('')

  const workScheduleBlock = workSchedule ? (() => {
    const phases = Object.entries(workSchedule.byPhase)
    if (!phases.length) return ''
    const rows = phases.flatMap(([phase, items]) =>
      (items as WorkScheduleResult[]).map(item =>
        `<tr>
          <td>${PHASE_LABELS[phase] ?? phase}</td>
          <td class="name">${item.activityName}</td>
          <td class="mono right">${item.sourceQty} ${item.sourceUnit}</td>
          <td class="mono right">${item.timePerUnit.toFixed(1)} min</td>
          <td class="mono right">${item.totalHours.toFixed(2)} hr</td>
          ${item.labourCost != null ? `<td class="mono right bold-price">$${item.labourCost.toFixed(2)}</td>` : '<td>—</td>'}
        </tr>`
      )
    ).join('')
    const totalLabour = workSchedule.totalLabourCost != null ? `$${workSchedule.totalLabourCost.toFixed(2)}` : '—'
    const totalThird  = workSchedule.totalThirdPartyCost != null ? `$${workSchedule.totalThirdPartyCost.toFixed(2)}` : null
    return `<div class="run-block">
      <h3>Work Schedule</h3>
      <table>
        <thead><tr><th>Phase</th><th>Activity</th><th>Qty</th><th>Time/Unit</th><th>Total Hours</th><th>Labour Cost</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="4" class="right muted" style="font-size:10px">Total hours</td>
              <td class="mono right bold">${workSchedule.totalElapsedHours.toFixed(2)} hr</td><td></td></tr>
          <tr><td colspan="4" class="right muted" style="font-size:10px">Total labour cost</td>
              <td></td><td class="mono right bold-price">${totalLabour}</td></tr>
          ${totalThird ? `<tr><td colspan="4" class="right muted" style="font-size:10px">Third party cost</td>
              <td></td><td class="mono right bold-price">${totalThird}</td></tr>` : ''}
        </tfoot>
      </table>
    </div>`
  })() : ''

  const html = `<!DOCTYPE html><html><head>
    <title>Calculation Breakdown — ${sys.name}</title>
    <style>
      body        { font-family: -apple-system, sans-serif; font-size: 12px; padding: 24px; color: #1e293b; }
      h1          { font-size: 18px; margin: 0 0 2px; }
      .meta       { font-size: 12px; color: #64748b; margin-bottom: 20px; }
      h3          { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
      .run-block  { margin-bottom: 28px; }
      .vars-table { width: auto; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
      .var-label  { padding: 4px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing:.05em; color: #94a3b8; background: #f8fafc; border-right: 1px solid #e2e8f0; white-space: nowrap; }
      .var-vals   { padding: 4px 8px; background: #fff; }
      .badge      { display: inline-block; font-size: 10px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 6px; margin: 1px 2px; color: #475569; }
      .badge-on   { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
      .badge-off  { background: #f1f5f9; color: #94a3b8; }
      table       { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
      th          { background: #f1f5f9; text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; letter-spacing:.04em; color:#64748b; border-bottom: 2px solid #e2e8f0; }
      td          { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
      td.name     { font-size: 12px; font-weight: 500; }
      td.mono     { font-family: 'Courier New', monospace; }
      td.right    { text-align: right; }
      td.bold     { font-weight: 700; color: #7c3aed; }
      td.bold-price { font-weight: 700; color: #059669; }
      .muted      { color: #94a3b8; font-weight: normal; }
      footer      { font-size: 10px; color: #94a3b8; margin-top: 24px; }
      @media print { body { padding: 12px; } }
    </style>
  </head><body>
    <h1>${sys.name}</h1>
    <p class="meta">Calculation Breakdown &nbsp;·&nbsp; ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
    ${runBlocks}
    ${workScheduleBlock}
    <footer>Generated by Exaktt &nbsp;·&nbsp; Quantities rounded up to nearest whole unit per run</footer>
  </body></html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (w) { w.document.write(html); w.document.close(); w.print() }
}
