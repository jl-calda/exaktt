// src/lib/sample-systems.ts
// Realistic sample system templates based on:
//   - Fallprotec SecuRope horizontal lifeline (LDV product codes)
//   - Alsolu Vectaladder modular cage ladder + Fallprotec QuickSet VLL
//   - AKM Fabrications Evorail Standard freestanding guardrail
//
// Each template exercises: custom dims, custom criteria, warnings, variants, custom brackets.

import type {
  MtoSystem, Material, CustomDim, CustomCriterion, Variant,
  Warning, WorkBracket, WorkActivity, RuleRow,
} from '@/types'

// ─── Low-level helpers ────────────────────────────────────────────────────────

function rr(ruleType: string, p: Partial<RuleRow> = {}): RuleRow {
  return {
    id: 'r0', condition: null, ruleType,
    ruleQty: 1, ruleOutUnit: 'each', ruleDivisor: 1, ruleDimKey: '',
    ruleTileW: 600, ruleTileH: 600, ruleBagSize: 25, waste: 0,
    ruleStockDimKey: '', ruleStockLength: 0,
    ...p,
  }
}

interface MatOpt {
  notes?:        string
  criteriaKeys?: string[]
  variantTags?:  Record<string, string>
  customDimKey?: string
  unitPrice?:    number
}

function mat(
  id: string, name: string, unit: string, productCode: string,
  ruleType: string, rp: Partial<RuleRow> = {}, opt: MatOpt = {},
): Material {
  return {
    id, name, unit, productCode,
    notes:     opt.notes ?? '',
    photo:     null,
    category:  'structural',
    properties: {},
    tags:      [],
    substrate: 'all',
    unitPrice:     opt.unitPrice ?? null,
    customDimKey:  opt.customDimKey ?? null,
    ruleSet:       [rr(ruleType, rp)],
    criteriaKeys:  opt.criteriaKeys ?? [],
    variantTags:   opt.variantTags  ?? {},
    libraryRef:    null,
    spec:          null,
    _libSyncedAt:  null,
    _systemSpecific: true,
    _createdInSystem: null,
    _createdAt:   0,
    _updatedAt:   0,
    _wasLibrary:  null,
    _madeUniqueAt: null,
  }
}

function dim(overrides: Partial<CustomDim> & { id: string; key: string; name: string; unit: string; derivType: string }): CustomDim {
  return {
    icon: '🔗', color: '#7c3aed',
    spacing: 1, spacingMode: 'fixed', spacingLabel: '',
    spacingTargetDim: 'length',
    firstSupportMode: 'half', firstGap: 0,
    includesEndpoints: true,
    sumKeys: [],
    formulaQty: 1, formulaDimKey: 'length',
    stockLengths: [], stockTargetDim: 'height', stockOptimMode: 'min_waste',
    plateMaterialId: '', partW: 100, partH: 100, kerf: 3,
    sheetAllowRotation: true, sheetPartsNeededDim: '',
    ...overrides,
  }
}

function crit(id: string, key: string, name: string, description: string, icon: string, color: string): CustomCriterion {
  return { id, key, name, description, icon, color, type: 'input', dimKey: '', operator: '>', threshold: 0 }
}

function warn(id: string, key: string, dimKey: string, threshold: number, message: string): Warning {
  return { id, key, dimKey, operator: '>', threshold, message }
}

function variant(id: string, name: string, icon: string, color: string, nodes: { key: string; label: string }[]): Variant {
  return {
    id, name, icon, color,
    levelLabels: ['Type', '', ''],
    nodes: nodes.map(n => ({ key: n.key, label: n.label, children: [] })),
  }
}

// ─── Sample system export type ─────────────────────────────────────────────────

export interface SampleSystem {
  key:         string
  label:       string
  description: string
  highlights:  string[]
  featureTags: string[]
  category:    string
  template:    Partial<MtoSystem>
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 1 — Fallprotec SecuRope Horizontal Lifeline
// ══════════════════════════════════════════════════════════════════════════════

const HLL: SampleSystem = {
  key:      'hll_securope',
  category: 'Fall Protection',
  label:    'SecuRope Horizontal Lifeline',
  description:
    'Fallprotec SecuRope cable HLL system — linear run input model covering both straight ' +
    'runs and segmented layouts. End anchors vary by roof substrate via the Variants panel.',
  highlights: [
    'Wire Rope 8mm 7×7 SS (LDV006): linear metre + 10% splice allowance',
    'End anchors: ratio off "both_ends" dim — concrete (LDV002) or metal deck (LDV023) via Roof Type variant',
    'Intermediate NEO anchors (LDV043): spacing custom dim at 12m max span',
    'Corner Curve Guide 90° (LDV145): ratio off "corners" dim',
    'Spring absorber LDV032: gated behind "Thermal Roof" criterion',
    'Warning fires when total run exceeds 50m',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Warning', 'Variant', 'Custom Bracket'],
  template: {
    name: 'SecuRope Horizontal Lifeline (Sample)',
    icon: '🔗', color: '#0284c7',
    inputModel:  'linear',
    description: 'Fallprotec SecuRope cable horizontal lifeline — based on EN 795:2012 Type C',

    // ── Custom Dim: intermediate anchor count at 12m max span ─────────────────
    customDims: [
      dim({
        id:   'cd_ll_int', key: 'cd_ll_int',
        name: 'Intermediate Anchors',
        unit: 'anchors', icon: '⚓', color: '#0284c7',
        derivType:        'spacing',
        spacing:          12,
        spacingMode:      'fixed',
        spacingLabel:     'Max span (m)',
        spacingTargetDim: 'length',
        includesEndpoints: false,
        firstSupportMode: 'half',
        firstGap:         6,
      }),
    ],

    // ── Custom Criteria: thermal roof requires spring absorber ─────────────────
    customCriteria: [
      crit('crit_thermal', 'cr_thermal',
        'Thermal / High Dilatation Roof',
        'Metal or membrane roof with high thermal movement — adds spring absorber to maintain constant cable tension',
        '🌡️', '#dc2626'),
    ],

    // ── Warnings ──────────────────────────────────────────────────────────────
    warnings: [
      warn('w_ll_maxrun', 'w_ll_maxrun', 'length', 50,
        'Run exceeds 50m — Fallprotec engineering sign-off and site-specific system design required'),
    ],

    // ── Variants: roof substrate changes end anchor product code ──────────────
    variants: [
      variant('v_ll_roof', 'Roof Type', '🏠', '#0284c7', [
        { key: 'concrete_flat', label: 'Concrete / Steel Flat Roof' },
        { key: 'metal_deck',    label: 'Metal Sheet / Corrugated Deck' },
      ]),
    ],

    // ── Custom Bracket: cable termination assembly at end anchors ─────────────
    customBrackets: [
      {
        id: 'brk_hll_ea', name: 'HLL Cable End Assembly',
        code: 'HLL-CEA', icon: '⚓', color: '#0284c7',
        description: 'Wire rope swaging kit per anchor point (2 crimping rings + termination)',
        ruleSet: [], criteriaKeys: [], variantTags: {},
        parameters: [
          { key: 'anchor_qty', label: 'Anchor Points in Set', unit: 'pcs', default: 2, min: 1, max: 10 },
        ],
        bom: [
          { id: 'bom_crimp', materialId: 'mat_ll_crimp', qtyFormula: 'anchor_qty * 2', qtyUnit: 'pcs',
            notes: '2 × LDV008 crimping rings per anchor point' },
        ],
        fabActivities: [
          { id: 'fab_swage', name: 'Cable swaging & termination',
            timeFormula: 'anchor_qty * 25', timeUnit: 'min',
            labourCategory: 'rope access technician' },
        ],
      },
    ],

    // ── Work Activities ───────────────────────────────────────────────────────
    workActivities: [
      {
        id: 'wa_ll_install', name: 'HLL line installation',
        phase: 'installation', icon: '🔗', color: '#0284c7',
        rateType: 'per_dim', sourceDimKey: 'length',
        speedMode: 'rate', ratePerHr: 20,
        crewSize: 2, labourCategory: 'height safety technician',
        criteriaKeys: [],
      } satisfies WorkActivity,
      {
        id: 'wa_ll_commission', name: 'System commissioning & load test',
        phase: 'commissioning', icon: '✅', color: '#16a34a',
        rateType: 'per_run',
        speedMode: 'time_per_unit', timePerUnit: 90,
        crewSize: 2, labourCategory: 'height safety engineer',
        criteriaKeys: [],
      } satisfies WorkActivity,
    ],

    // ── Materials ─────────────────────────────────────────────────────────────
    materials: [
      mat('mat_ll_rope', 'Wire Rope 8mm ø 7×7 SS', 'm', 'LDV006',
        'linear_metre', { ruleQty: 1.1, ruleOutUnit: 'm' },
        { notes: '10% added for splice/termination allowance', unitPrice: 8.50 }),

      mat('mat_ll_end_conc', 'End Anchor LDV002 (concrete/steel)', 'each', 'LDV002',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'both_ends', ruleOutUnit: 'each' },
        { notes: 'Standard flat-roof end anchor', variantTags: { v_ll_roof: 'concrete_flat' }, unitPrice: 42.00 }),

      mat('mat_ll_end_deck', 'End Anchor LDV023 (metal sheet)', 'each', 'LDV023',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'both_ends', ruleOutUnit: 'each' },
        { notes: 'Stainless AISI 304; min roof thickness 0.5mm', variantTags: { v_ll_roof: 'metal_deck' }, unitPrice: 42.00 }),

      mat('mat_ll_int', 'NEO Intermediate Anchor LDV043', 'each', 'LDV043',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_ll_int', ruleOutUnit: 'each' },
        { notes: 'Energy-absorbing; glider passes without detachment — max 12m span', unitPrice: 38.00 }),

      mat('mat_ll_corner', 'Curve Guide 90° LDV145', 'each', 'LDV145',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'corners', ruleOutUnit: 'each' },
        { notes: 'Direction change unit for 90° corners', unitPrice: 28.00 }),

      mat('mat_ll_tens', 'Line Tensioner LDV137', 'each', 'LDV137',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: 'One per run end — installed at fixed end', unitPrice: 145.00 }),

      mat('mat_ll_glider', 'Opening Glider LDV001', 'each', 'LDV001',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: 'One glider per worker — opens at intermediate anchors (Freehand)', unitPrice: 95.00 }),

      mat('mat_ll_spring', 'Spring Energy Absorber LDV032', 'each', 'LDV032',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: 'Required on thermally active/metal roofs to maintain cable tension',
          criteriaKeys: ['cr_thermal'], unitPrice: 220.00 }),

      mat('mat_ll_crimp', 'Crimping Ring LDV008', 'each', 'LDV008',
        'fixed_qty', { ruleQty: 0, ruleOutUnit: 'each' },
        { notes: 'Used via HLL Cable End Assembly bracket — see Custom Brackets panel', unitPrice: 4.50 }),
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 2 — Alsolu Vectaladder + Fallprotec QuickSet VLL
// ══════════════════════════════════════════════════════════════════════════════

const VECTALADDER: SampleSystem = {
  key:      'vectaladder',
  category: 'Fall Protection',
  label:    'Alsolu Vectaladder Cat Ladder',
  description:
    'Modular aluminium cage access ladder (EN ISO 14122-4). Uses the stock-length solver custom dim ' +
    'to automatically work out the mix of 3080mm and 5880mm ladder sections for a given access height. ' +
    'Toggle the Vertical Lifeline variant to add Fallprotec QuickSet VLL components.',
  highlights: [
    'Custom dim "Ladder Sections" — stock-length solver on height (sections: 3080mm & 5880mm)',
    'Ladder sections: stock_length_qty rule — solver picks optimal combination to minimise waste',
    'Rungs: ratio-per-length at 280mm pitch (EN ISO 14122-4)',
    'Safety cage hoops: ratio-per-length, max 1000mm spacing',
    '"Platform at Top" criterion gates trapdoor + self-closing gate',
    'Variant "Safety System": toggle to add Fallprotec QuickSet VLL components',
    'Warning fires when height exceeds 6m',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Warning', 'Variant', 'Custom Bracket'],
  template: {
    name: 'Vectaladder Cat Ladder (Sample)',
    icon: '🪜', color: '#7c3aed',
    inputModel:  'linear',
    description: 'Alsolu Vectaladder modular cage ladder — height-driven with stock-length solver',

    // ── Custom Dim: stock-length solver for ladder sections ───────────────────
    customDims: [
      dim({
        id:   'cd_vl_sec', key: 'cd_vl_sec',
        name: 'Ladder Sections',
        unit: 'sections', icon: '🪜', color: '#7c3aed',
        derivType:       'stock_length',
        stockTargetDim:  'height',
        stockLengths:    [3080, 5880],   // Vectaladder confirmed section lengths (mm)
        stockOptimMode:  'min_waste',
      }),
    ],

    // ── Custom Criteria: platform/landing at top ───────────────────────────────
    customCriteria: [
      crit('crit_platform', 'cr_platform',
        'Platform / Landing at Top',
        'Install trapdoor and self-closing safety gate where ladder terminates at a working platform',
        '🏗️', '#0369a1'),
    ],

    // ── Warnings ──────────────────────────────────────────────────────────────
    warnings: [
      warn('w_vl_height', 'w_vl_height', 'height', 6,
        'Access height over 6m — structural engineer to verify wall fixing anchor design and spacing'),
    ],

    // ── Variants: cage-only or cage + VLL ─────────────────────────────────────
    variants: [
      variant('v_vl_sys', 'Safety System', '🦺', '#7c3aed', [
        { key: 'cage_only', label: 'Cage Only (EN ISO 14122-4)' },
        { key: 'vll',       label: '+ Vertical Lifeline (QuickSet)' },
      ]),
    ],

    // ── Custom Bracket: cage hoop fixing kit ──────────────────────────────────
    customBrackets: [
      {
        id: 'brk_vl_hoop', name: 'Cage Hoop Fixing Kit',
        code: 'VL-HFKIT', icon: '🔩', color: '#7c3aed',
        description: 'M10 coach bolt kit for fixing cage hoops to wall — 4 bolts per hoop',
        ruleSet: [], criteriaKeys: [], variantTags: {},
        parameters: [
          { key: 'hoop_qty', label: 'No. of Hoops in Set', unit: 'hoops', default: 5, min: 1, max: 50 },
        ],
        bom: [
          { id: 'bom_bolt', materialId: 'mat_vl_bolt', qtyFormula: 'hoop_qty * 4', qtyUnit: 'pcs',
            notes: '4 × M10×75mm coach bolts per hoop' },
        ],
        fabActivities: [
          { id: 'fab_hoop', name: 'Cage hoop fitting',
            timeFormula: 'hoop_qty * 8', timeUnit: 'min',
            labourCategory: 'aluminium fabricator' },
        ],
      },
    ],

    // ── Work Activities ───────────────────────────────────────────────────────
    workActivities: [
      {
        id: 'wa_vl_erect', name: 'Ladder erection & section fixing',
        phase: 'installation', icon: '🪜', color: '#7c3aed',
        rateType: 'per_dim', sourceDimKey: 'height',
        speedMode: 'rate', ratePerHr: 4,
        crewSize: 2, labourCategory: 'aluminium installer',
        criteriaKeys: [],
      } satisfies WorkActivity,
    ],

    // ── Materials ─────────────────────────────────────────────────────────────
    materials: [
      mat('mat_vl_s3080', 'Vectaladder Section 3080mm', 'each', 'VL-3080',
        'stock_length_qty', { ruleStockDimKey: 'cd_vl_sec', ruleStockLength: 3080 },
        { notes: 'Aluminium 6063 T5; uprights 65×24mm; 600mm wide; 280mm rung pitch', unitPrice: 210.00 }),

      mat('mat_vl_s5880', 'Vectaladder Section 5880mm', 'each', 'VL-5880',
        'stock_length_qty', { ruleStockDimKey: 'cd_vl_sec', ruleStockLength: 5880 },
        { notes: 'Double-length section — solver uses to minimise joins', unitPrice: 375.00 }),

      mat('mat_vl_rung', 'Rung 400mm Step (30×30 serrated)', 'each', 'VL-RUNG',
        'ratio_length', { ruleQty: 1, ruleDivisor: 0.28, ruleOutUnit: 'each' },
        { notes: '1 rung per 280mm height (EN ISO 14122-4 pitch)', unitPrice: 8.50 }),

      mat('mat_vl_hoop', 'Safety Cage Hoop 700mm Ø', 'each', 'VL-HOOP',
        'ratio_length', { ruleQty: 1, ruleDivisor: 1.0, ruleOutUnit: 'each' },
        { notes: 'Max 1000mm spacing per EN ISO 14122-4 § 4.8.3', unitPrice: 88.00 }),

      mat('mat_vl_bracket', 'Wall Fixing Bracket', 'each', 'VL-WFIX',
        'ratio_length', { ruleQty: 1, ruleDivisor: 2.5, ruleOutUnit: 'each' },
        { notes: 'Ladder-to-wall bracket every 2.5m max; offset 205–750mm adjustable', unitPrice: 22.00 }),

      mat('mat_vl_base', 'Base Plate & Anchor Set', 'each', 'VL-BASE',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' }, { unitPrice: 95.00 }),

      mat('mat_vl_handrail', 'Top Handrail Extension 1000mm', 'each', 'VL-HRAIL',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: '1000mm extension above access level per EN ISO 14122-4', unitPrice: 45.00 }),

      mat('mat_vl_trapdoor', 'Access Trapdoor / Safety Hatch', 'each', 'VL-TRAP',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: 'Required where ladder terminates at platform', criteriaKeys: ['cr_platform'], unitPrice: 650.00 }),

      mat('mat_vl_gate', 'Self-Closing Safety Gate', 'each', 'VL-GATE',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: 'Auto-closing gate at platform opening', criteriaKeys: ['cr_platform'], unitPrice: 320.00 }),

      // VLL components — only included when "Vertical Lifeline" variant is active
      mat('mat_vl_vll_top', 'VLL Top Anchor + Absorber LDV233', 'each', 'LDV233',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: 'Fallprotec QuickSet — fixed at top of ladder structure',
          variantTags: { v_vl_sys: 'vll' }, unitPrice: 95.00 }),

      mat('mat_vl_vll_bot', 'VLL Bottom Anchor + Tensioner LDV266', 'each', 'LDV266',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: 'Fits 10–30mm diameter rungs; maintains cable tension',
          variantTags: { v_vl_sys: 'vll' }, unitPrice: 95.00 }),

      mat('mat_vl_vll_rope', 'VLL Wire Rope 8mm 7×7 SS (LDV006)', 'm', 'LDV006-VLL',
        'linear_metre', { ruleQty: 1.1, ruleOutUnit: 'm' },
        { notes: '10% extra for top overrun & bottom tensioner', variantTags: { v_vl_sys: 'vll' }, unitPrice: 6.20 }),

      mat('mat_vl_vll_glider', 'Fall Arrester Glider LDV250', 'each', 'LDV250',
        'fixed_qty', { ruleQty: 1, ruleOutUnit: 'each' },
        { notes: 'One per worker — locks instantly on fall; travels freely during climbing',
          variantTags: { v_vl_sys: 'vll' }, unitPrice: 185.00 }),

      mat('mat_vl_vll_guide', 'Intermediate Guide LDV241', 'each', 'LDV241',
        'ratio_length', { ruleQty: 1, ruleDivisor: 8, ruleOutUnit: 'each' },
        { notes: 'Mounted on rungs; guides cable — 1 per 8m of height (typical)',
          variantTags: { v_vl_sys: 'vll' }, unitPrice: 38.00 }),

      // Bracket reference material
      mat('mat_vl_bolt', 'Cage Fixing Bolt M10×75mm (coach)', 'each', 'VL-BOLT10',
        'fixed_qty', { ruleQty: 0, ruleOutUnit: 'each' },
        { notes: 'Issued via Cage Hoop Fixing Kit bracket — see Custom Brackets panel', unitPrice: 1.20 }),
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 3 — AKM Evorail Standard Freestanding Guardrail
// ══════════════════════════════════════════════════════════════════════════════

const EVORAIL: SampleSystem = {
  key:      'evorail_standard',
  category: 'Fall Protection',
  label:    'Evorail Standard Guardrail',
  description:
    'AKM Fabrications Evorail freestanding roof-edge guardrail (EN 13374:2013 Class A). ' +
    'A spacing custom dim drives both the post count and counterbalance weight count from ' +
    'one dimension, showing how a single custom dim feeds multiple materials.',
  highlights: [
    'Custom dim "Posts" (spacing 2.5m): feeds Long Upright AND Counterbalance Weight quantities',
    'Top rail + mid rail (MAGNAtube 48mm OD × 2500mm): ratio off Posts custom dim',
    'Finish variant: Galvanised vs Stainless 304 — selects different rail/post product codes',
    '"With Kickboard" criterion gates kickboard material',
    'Eazy Clamp × 2 per post: ratio off Posts dim (same custom dim, different multiplier)',
    'Warning fires when run exceeds 50m — wind loading check required',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Warning', 'Variant', 'Custom Bracket'],
  template: {
    name: 'Evorail Standard Guardrail (Sample)',
    icon: '🦺', color: '#dc2626',
    inputModel:  'linear',
    description: 'AKM Evorail freestanding roof-edge guardrail — EN 13374:2013 Class A',

    // ── Custom Dim: post count from spacing — referenced by multiple materials ─
    customDims: [
      dim({
        id:   'cd_er_posts', key: 'cd_er_posts',
        name: 'Posts (2.5m grid)',
        unit: 'posts', icon: '🪨', color: '#dc2626',
        derivType:         'spacing',
        spacing:           2.5,
        spacingMode:       'fixed',
        spacingLabel:      'Post spacing (m)',
        spacingTargetDim:  'length',
        includesEndpoints: true,   // includes end posts
        firstSupportMode:  'half',
        firstGap:          0,
      }),
    ],

    // ── Custom Criteria: optional kickboard/toeboard ───────────────────────────
    customCriteria: [
      crit('crit_kick', 'cr_kickboard',
        'With Kickboard / Toeboard',
        'Add 150mm kickboard along the full run to prevent objects rolling off the edge',
        '🦵', '#b45309'),
    ],

    // ── Warnings ──────────────────────────────────────────────────────────────
    warnings: [
      warn('w_er_length', 'w_er_length', 'length', 50,
        'Runs over 50m require site-specific wind loading calculation to EN 13700:2021'),
      warn('w_er_corners', 'w_er_corners', 'corners', 3,
        'More than 3 direction changes — verify structural stability with engineer'),
    ],

    // ── Variants: material finish affects post and rail product codes ──────────
    variants: [
      variant('v_er_finish', 'Material Finish', '✨', '#dc2626', [
        { key: 'galvanised', label: 'Pre-Galvanised (MAGNAtube)' },
        { key: 'ss304',      label: 'Stainless Steel 304' },
      ]),
    ],

    // ── Custom Bracket: post base assembly ────────────────────────────────────
    customBrackets: [
      {
        id: 'brk_er_post', name: 'Post Base Assembly',
        code: 'ER-PBASE', icon: '🏗️', color: '#dc2626',
        description: 'Counterbalance-weighted base kit — upright + counterbalance weight + clamps per bay',
        ruleSet: [], criteriaKeys: [], variantTags: {},
        parameters: [
          { key: 'bays', label: 'No. of Bays', unit: 'bays', default: 4, min: 1, max: 100 },
        ],
        bom: [
          { id: 'bom_post',    materialId: 'mat_er_post_galv', qtyFormula: 'bays',      qtyUnit: 'each',
            notes: 'One Long Upright per bay' },
          { id: 'bom_weight',  materialId: 'mat_er_cbal',      qtyFormula: 'bays',      qtyUnit: 'each',
            notes: '20kg counterbalance weight per post' },
          { id: 'bom_clamp',   materialId: 'mat_er_clamp',     qtyFormula: 'bays * 2',  qtyUnit: 'each',
            notes: 'Eazy Clamp × 2 per post (top + mid rail connection)' },
        ],
        fabActivities: [
          { id: 'fab_post', name: 'Post base assembly & weight fitting',
            timeFormula: 'bays * 8', timeUnit: 'min',
            labourCategory: 'guardrail installer' },
        ],
      },
    ],

    // ── Work Activities ───────────────────────────────────────────────────────
    workActivities: [
      {
        id: 'wa_er_install', name: 'Guardrail erection',
        phase: 'installation', icon: '🦺', color: '#dc2626',
        rateType: 'per_dim', sourceDimKey: 'length',
        speedMode: 'rate', ratePerHr: 15,
        crewSize: 2, labourCategory: 'guardrail installer',
        criteriaKeys: [],
      } satisfies WorkActivity,
    ],

    // ── Materials ─────────────────────────────────────────────────────────────
    materials: [
      // Posts — galvanised variant
      mat('mat_er_post_galv', 'Long Upright 1100mm (Galvanised)', 'each', 'ER-LU-GALV',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: 'Telescopic adjustable legs; 10° incline; 48mm OD', variantTags: { v_er_finish: 'galvanised' }, unitPrice: 78.00 }),

      mat('mat_er_post_ss', 'Long Upright 1100mm (Stainless 304)', 'each', 'ER-LU-SS304',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: 'Grade 304 stainless; seacoast/chemical environments', variantTags: { v_er_finish: 'ss304' }, unitPrice: 145.00 }),

      // Top rail — galvanised variant
      mat('mat_er_toprail_galv', 'Top Rail MAGNAtube 48mm × 2.5m', 'each', 'ER-TR-GALV',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: '1 rail section per post bay; 4.2 kg/rail', variantTags: { v_er_finish: 'galvanised' }, unitPrice: 95.00 }),

      mat('mat_er_toprail_ss', 'Top Rail Stainless 304 48mm × 2.5m', 'each', 'ER-TR-SS304',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: '1 rail section per post bay', variantTags: { v_er_finish: 'ss304' }, unitPrice: 185.00 }),

      // Mid rail — galvanised variant
      mat('mat_er_midrail_galv', 'Mid Rail MAGNAtube 48mm × 2.5m', 'each', 'ER-MR-GALV',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: 'Knee rail — 1 per bay', variantTags: { v_er_finish: 'galvanised' }, unitPrice: 68.00 }),

      mat('mat_er_midrail_ss', 'Mid Rail Stainless 304 48mm × 2.5m', 'each', 'ER-MR-SS304',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: 'Knee rail — 1 per bay', variantTags: { v_er_finish: 'ss304' }, unitPrice: 142.00 }),

      // Common components (no variant — same regardless of finish)
      mat('mat_er_cbal', 'Counterbalance Weight 20kg', 'each', 'ER-CBW20',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: '20kg recycled rubber; 1 per post — same count as Posts custom dim', unitPrice: 55.00 }),

      mat('mat_er_clamp', 'Eazy Clamp (rail-to-post connector)', 'each', 'ER-EACLAMP',
        'ratio', { ruleQty: 2, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: '2 clamps per post (top rail + mid rail); Grade A2 SS screws', unitPrice: 18.00 }),

      mat('mat_er_dend', 'D-End 500mm (run termination)', 'each', 'ER-DEND',
        'ratio', { ruleQty: 2, ruleDivisor: 1, ruleDimKey: 'both_ends', ruleOutUnit: 'each' },
        { notes: '2 D-ends per run termination (top + mid)', unitPrice: 42.00 }),

      mat('mat_er_corner', 'Corner Post Bracket Set', 'each', 'ER-CORNR',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'corners', ruleOutUnit: 'each' },
        { notes: 'Eazy Clamp angle adapter for direction changes', unitPrice: 145.00 }),

      mat('mat_er_kick', 'Kickboard 150mm (per 2.5m bay)', 'each', 'ER-KICK',
        'ratio', { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_er_posts', ruleOutUnit: 'each' },
        { notes: 'Slotted toeboard — clips to post base; add when "With Kickboard" is ON',
          criteriaKeys: ['cr_kickboard'], unitPrice: 32.00 }),
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 4 — Solar Panel Installation
// ══════════════════════════════════════════════════════════════════════════════

const SOLAR: SampleSystem = {
  key:      'solar_install',
  category: 'Solar & Electrical',
  label:    'Solar Panel Installation',
  description:
    'Residential / commercial rooftop PV system. Area-based input drives panel count via the ' +
    'spacing solver. Panel wattage variant swaps product codes. Criteria gates battery storage add-on.',
  highlights: [
    'Panel count: spacing custom dim (1.05m pitch) over roof area',
    'Mounting rails: linear metre rule per panel row',
    'Mid & end clamps: ratio off panel count',
    'Wattage variant (370W / 415W / 540W) swaps panel product code',
    '"Battery Storage" criteria gates inverter + battery materials',
    'Warning when panel count exceeds 30 (requires structural check)',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Warning', 'Variant'],
  template: {
    name: 'Solar Panel Installation (Sample)',
    icon: '☀️', color: '#d97706',
    inputModel: 'area',
    description: 'Rooftop PV system — panel count from roof area with wattage variants',
    customDims: [
      dim({ id: 'cd_sol_panels', key: 'cd_sol_panels', name: 'Panel Count', unit: 'panels',
        icon: '🔲', color: '#d97706', derivType: 'spacing',
        spacing: 1.05, spacingMode: 'fixed', spacingTargetDim: 'length',
        includesEndpoints: false, firstSupportMode: 'none', firstGap: 0 }),
      dim({ id: 'cd_sol_rows', key: 'cd_sol_rows', name: 'Panel Rows', unit: 'rows',
        icon: '↔️', color: '#b45309', derivType: 'spacing',
        spacing: 2.1, spacingMode: 'fixed', spacingTargetDim: 'width',
        includesEndpoints: false, firstSupportMode: 'none', firstGap: 0 }),
    ],
    customCriteria: [
      crit('crit_battery', 'cr_battery', 'With Battery Storage',
        'Adds hybrid inverter and battery bank to the BOM', '🔋', '#16a34a'),
    ],
    warnings: [
      warn('w_sol_load', 'w_sol_load', 'cd_sol_panels', 30,
        'Panel count >30 — structural roof load assessment required before proceeding'),
    ],
    variants: [
      variant('var_sol_watt', 'Panel Wattage', '⚡', '#d97706', [
        { key: 'w370', label: '370W' },
        { key: 'w415', label: '415W' },
        { key: 'w540', label: '540W' },
      ]),
    ],
    materials: [
      mat('sol_panel',   'Solar Panel',              'each', 'SOL-PANEL',  'ratio',       { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_sol_panels' }, { variantTags: { var_sol_watt: 'w370' }, unitPrice: 320.00 }),
      mat('sol_rail',    'Mounting Rail 4.4m',        'each', 'SOL-RAIL',   'ratio',       { ruleQty: 2, ruleDivisor: 1, ruleDimKey: 'cd_sol_rows'   }, { unitPrice: 42.00 }),
      mat('sol_midclamp','Mid Clamp',                 'each', 'SOL-MCLAMP', 'ratio',       { ruleQty: 2, ruleDivisor: 1, ruleDimKey: 'cd_sol_panels' }, { unitPrice: 8.50 }),
      mat('sol_endclamp','End Clamp',                 'each', 'SOL-ECLAMP', 'ratio',       { ruleQty: 4, ruleDivisor: 1, ruleDimKey: 'cd_sol_rows'   }, { unitPrice: 6.50 }),
      mat('sol_splice',  'Rail Splice Connector',     'each', 'SOL-SPLICE', 'ratio',       { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_sol_rows'   }, { unitPrice: 14.00 }),
      mat('sol_l_foot',  'L-Foot Roof Mount',         'each', 'SOL-LFOOT',  'ratio',       { ruleQty: 4, ruleDivisor: 1, ruleDimKey: 'cd_sol_rows'   }, { unitPrice: 12.00 }),
      mat('sol_inv',     'String Inverter',           'each', 'SOL-INV',    'fixed_qty',   { ruleQty: 1 },                                              { unitPrice: 2200.00 }),
      mat('sol_dc_cable','DC Cable 6mm² (m)',          'm',    'SOL-DC6',    'ratio_area',  { ruleQty: 3 },                                              { unitPrice: 3.20 }),
      mat('sol_ac_cable','AC Cable 6mm² (m)',          'm',    'SOL-AC6',    'fixed_qty',   { ruleQty: 6 },                                              { unitPrice: 2.80 }),
      mat('sol_battery', 'Battery Module 10kWh',      'each', 'SOL-BAT',    'fixed_qty',   { ruleQty: 1 }, { criteriaKeys: ['cr_battery'],               unitPrice: 3800.00 }),
      mat('sol_hyb_inv', 'Hybrid Inverter',           'each', 'SOL-HINV',   'fixed_qty',   { ruleQty: 1 }, { criteriaKeys: ['cr_battery'],               unitPrice: 2200.00 }),
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 5 — Paint Contractor
// ══════════════════════════════════════════════════════════════════════════════

const PAINT: SampleSystem = {
  key:      'paint_contractor',
  category: 'Coating & Finishing',
  label:    'Paint Contractor',
  description:
    'Interior / exterior painting take-off. Area input drives paint litres. A "Solvent Volume (L)" ' +
    'user input directly controls thinner quantity. Finish variant changes product codes. "New Surface" criteria adds primer.',
  highlights: [
    'Solvent / Thinner qty: ratio rule × user-entered volume (L) — direct volume input demo',
    'Paint qty: coverage rule (12 m² per litre)',
    'Finish variant (Flat / Eggshell / Satin / Semi-Gloss) swaps product codes',
    '"New Surface" criterion adds primer to BOM',
    'Warning when area exceeds 300m² (multi-crew planning)',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Warning', 'Variant'],
  template: {
    name: 'Paint Contractor (Sample)',
    icon: '🎨', color: '#be185d',
    inputModel: 'area',
    description: 'Interior / exterior painting — coverage-based material take-off',
    customDims: [
      dim({ id: 'cd_pt_vol', key: 'cd_pt_vol', name: 'Solvent / Thinner (L)', unit: 'L',
        icon: '🧴', color: '#be185d', derivType: 'user_input', inputStep: 1 }),
    ],
    customCriteria: [
      crit('crit_primer', 'cr_primer', 'New / Bare Surface',
        'Unpainted surface — adds primer coat to BOM', '🪣', '#b45309'),
    ],
    warnings: [
      warn('w_pt_area', 'w_pt_area', 'length', 300,
        'Area >300m² — consider multi-crew scheduling and phased delivery'),
    ],
    variants: [
      variant('var_pt_finish', 'Paint Finish', '🎨', '#be185d', [
        { key: 'flat',      label: 'Flat / Matt' },
        { key: 'eggshell',  label: 'Eggshell' },
        { key: 'satin',     label: 'Satin' },
        { key: 'semigloss', label: 'Semi-Gloss' },
      ]),
    ],
    materials: [
      mat('pt_primer',   'Primer 10L',             'tin',  'PT-PRIMER',   'coverage_per_item', { ruleQty: 1, ruleDivisor: 8,  ruleOutUnit: 'tin'  }, { criteriaKeys: ['cr_primer'],              unitPrice: 68.00 }),
      mat('pt_paint',    'Topcoat Paint 15L',       'tin',  'PT-TOPCOAT',  'coverage_per_item', { ruleQty: 1, ruleDivisor: 12, ruleOutUnit: 'tin'  }, { variantTags: { var_pt_finish: 'flat' },  unitPrice: 95.00 }),
      mat('pt_solvent',  'Thinner / Solvent 5L',    'tin',  'PT-SOLVENT',  'ratio',             { ruleQty: 1, ruleDivisor: 5, ruleOutUnit: 'tin', ruleDimKey: 'cd_pt_vol' },                  { unitPrice: 24.00 }),
      mat('pt_roller',   'Roller Frame + Cover',    'each', 'PT-ROLLER',   'fixed_qty',         { ruleQty: 4 },                                                                               { unitPrice: 18.00 }),
      mat('pt_brush',    'Paint Brush Set',         'each', 'PT-BRUSH',    'fixed_qty',         { ruleQty: 2 },                                                                               { unitPrice: 22.00 }),
      mat('pt_tape',     'Masking Tape 50m',        'roll', 'PT-TAPE',     'ratio_length',      { ruleQty: 1, ruleDivisor: 50 },                                                              { unitPrice: 8.50 }),
      mat('pt_drop',     'Drop Cloth 4×3m',         'each', 'PT-DROP',     'fixed_qty',         { ruleQty: 2 },                                                                               { unitPrice: 14.00 }),
      mat('pt_tray',     'Roller Tray',             'each', 'PT-TRAY',     'fixed_qty',         { ruleQty: 2 },                                                                               { unitPrice: 6.50 }),
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 6 — Tiler Contractor
// ══════════════════════════════════════════════════════════════════════════════

const TILER: SampleSystem = {
  key:      'tiler_contractor',
  category: 'Coating & Finishing',
  label:    'Tiler Contractor',
  description:
    'Floor and wall tiling take-off. Tile size variant drives sheet count. ' +
    'Adhesive and grout quantities derived from area. "Wet Area" criterion adds waterproofing.',
  highlights: [
    'Tile count: tile_size rule — sheet dimensions from variant (300×300, 600×600, 300×600)',
    'Adhesive: coverage rule (4 kg/m²)',
    'Grout: coverage rule (0.4 kg/m²) × joint width',
    '"Wet Area" criterion adds waterproofing membrane to BOM',
    'Wastage factor applied across all area rules',
    'Warning when area >100m² (bulk adhesive delivery)',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Warning', 'Variant'],
  template: {
    name: 'Tiler Contractor (Sample)',
    icon: '🟫', color: '#92400e',
    inputModel: 'area',
    description: 'Floor & wall tiling — tile count, adhesive and grout from area',
    customDims: [
      dim({ id: 'cd_tl_perimeter', key: 'cd_tl_perimeter', name: 'Perimeter (for trim)', unit: 'm',
        icon: '⬜', color: '#92400e', derivType: 'sum', sumKeys: ['length', 'width', 'length', 'width'] }),
    ],
    customCriteria: [
      crit('crit_wetarea', 'cr_wetarea', 'Wet Area / Shower',
        'Requires waterproofing membrane under tiles (AS 3740)', '🚿', '#0284c7'),
    ],
    warnings: [
      warn('w_tl_bulk', 'w_tl_bulk', 'length', 100,
        'Area >100m² — arrange bulk adhesive delivery and on-site storage'),
    ],
    variants: [
      variant('var_tl_size', 'Tile Size', '🟫', '#92400e', [
        { key: 't300x300', label: '300×300mm' },
        { key: 't600x600', label: '600×600mm' },
        { key: 't300x600', label: '300×600mm' },
        { key: 't600x1200', label: '600×1200mm' },
      ]),
    ],
    materials: [
      mat('tl_tile',       'Floor Tile (m²)',           'm²',   'TL-TILE',    'tile_size',         { ruleTileW: 300, ruleTileH: 300, ruleOutUnit: 'box', waste: 10 }, { variantTags: { var_tl_size: 't300x300' }, unitPrice: 45.00 }),
      mat('tl_adhesive',   'Tile Adhesive 20kg',        'bag',  'TL-ADH',     'kg_per_sqm',        { ruleQty: 4,  ruleOutUnit: 'bag', ruleBagSize: 20, waste: 5 },                            { unitPrice: 28.00 }),
      mat('tl_grout',      'Grout 5kg',                 'bag',  'TL-GROUT',   'kg_per_sqm',        { ruleQty: 0.4,ruleOutUnit: 'bag', ruleBagSize: 5,  waste: 5 },                            { unitPrice: 18.00 }),
      mat('tl_spacer',     'Tile Spacers 2mm (bag 100)','bag',  'TL-SPACER',  'ratio_area',        { ruleQty: 20 },                                                                            { unitPrice: 6.00 }),
      mat('tl_trim',       'Edge Trim (m)',              'm',    'TL-TRIM',    'linear_metre',      { ruleQty: 1 },                                                                             { unitPrice: 12.00 }),
      mat('tl_membrane',   'Waterproof Membrane 1L',    'tin',  'TL-MEMBRANE','coverage_per_item', { ruleQty: 1, ruleDivisor: 1.5, ruleOutUnit: 'tin' }, { criteriaKeys: ['cr_wetarea'],      unitPrice: 38.00 }),
      mat('tl_primer',     'Substrate Primer 5L',       'tin',  'TL-PRIMER',  'coverage_per_item', { ruleQty: 1, ruleDivisor: 6,   ruleOutUnit: 'tin' }, { criteriaKeys: ['cr_wetarea'],      unitPrice: 32.00 }),
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 7 — Kitchen Cabinetry
// ══════════════════════════════════════════════════════════════════════════════

const CABINETRY: SampleSystem = {
  key:      'kitchen_cabinetry',
  category: 'Joinery & Interiors',
  label:    'Kitchen Cabinetry',
  description:
    'Kitchen run take-off using linear run model. Cabinet count from spacing solver. ' +
    '"Overhead Cabinets" criterion doubles unit count. Material variant covers substrate type.',
  highlights: [
    'Base cabinet count: spacing dim at 600mm centres along linear run',
    '"Overhead Cabinets" criterion adds matching wall cabinets + extra hardware',
    'Material variant (Laminate / Veneer / Timber) swaps carcass product code',
    'Benchtop: linear metre rule from run length',
    'Hinges & handles: ratio off cabinet count',
    'Kickboard: linear metre from length',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Variant'],
  template: {
    name: 'Kitchen Cabinetry (Sample)',
    icon: '🪵', color: '#92400e',
    inputModel: 'linear',
    description: 'Kitchen cabinetry take-off — base + overhead units, benchtop, hardware',
    customDims: [
      dim({ id: 'cd_cab_count', key: 'cd_cab_count', name: 'Base Cabinet Count', unit: 'units',
        icon: '🗄️', color: '#92400e', derivType: 'spacing',
        spacing: 0.6, spacingMode: 'fixed', spacingTargetDim: 'length',
        includesEndpoints: true, firstSupportMode: 'none', firstGap: 0 }),
    ],
    customCriteria: [
      crit('crit_overhead', 'cr_overhead', 'With Overhead Cabinets',
        'Adds wall-mounted overhead cabinet units and additional fixings', '📦', '#7c3aed'),
      crit('crit_island', 'cr_island', 'With Island Bench',
        'Adds island carcass, legs, and benchtop extension', '🏝️', '#0284c7'),
    ],
    variants: [
      variant('var_cab_material', 'Cabinet Material', '🪵', '#92400e', [
        { key: 'laminate', label: 'Laminate' },
        { key: 'veneer',   label: 'Timber Veneer' },
        { key: 'solid',    label: 'Solid Timber' },
      ]),
      variant('var_bench_top', 'Benchtop', '⬛', '#475569', [
        { key: 'lam',    label: 'Laminate' },
        { key: 'stone',  label: 'Stone' },
        { key: 'timber', label: 'Timber' },
      ]),
    ],
    materials: [
      mat('cab_base',     'Base Cabinet Carcass',    'each', 'CAB-BASE',   'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_cab_count' }, { variantTags: { var_cab_material: 'laminate' }, unitPrice: 185.00 }),
      mat('cab_wall',     'Wall Cabinet Carcass',    'each', 'CAB-WALL',   'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_cab_count' }, { criteriaKeys: ['cr_overhead'], variantTags: { var_cab_material: 'laminate' }, unitPrice: 165.00 }),
      mat('cab_bench',    'Benchtop (per m)',         'm',    'CAB-BENCH',  'linear_metre', { ruleQty: 1 }, { variantTags: { var_bench_top: 'lam' },    unitPrice: 95.00 }),
      mat('cab_hinge',    'Concealed Hinge Pair',    'each', 'CAB-HINGE',  'ratio',        { ruleQty: 2, ruleDivisor: 1, ruleDimKey: 'cd_cab_count' }, { unitPrice: 14.00 }),
      mat('cab_handle',   'Cabinet Handle',          'each', 'CAB-HANDLE', 'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_cab_count' }, { unitPrice: 18.00 }),
      mat('cab_kick',     'Kickboard (per m)',        'm',    'CAB-KICK',   'linear_metre', { ruleQty: 1 },                                             { unitPrice: 22.00 }),
      mat('cab_panel',    'End Panel',               'each', 'CAB-PANEL',  'fixed_qty',    { ruleQty: 2 },                                             { unitPrice: 45.00 }),
      mat('cab_island',   'Island Carcass 1800mm',   'each', 'CAB-ISLE',   'fixed_qty',    { ruleQty: 1 }, { criteriaKeys: ['cr_island'],              unitPrice: 480.00 }),
      mat('cab_ileg',     'Island Leg Set',           'set',  'CAB-ILEG',   'fixed_qty',    { ruleQty: 1 }, { criteriaKeys: ['cr_island'],              unitPrice: 85.00 }),
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 8 — Bridge Bearings
// ══════════════════════════════════════════════════════════════════════════════

const BRIDGE_BEARINGS: SampleSystem = {
  key:      'bridge_bearings',
  category: 'Civil & Structural',
  label:    'Bridge Bearings',
  description:
    'Structural bridge bearing installation take-off. Simple dims input (span × girder count). ' +
    'Bearing type variant (elastomeric / pot / PTFE slide). Seismic criteria adds hold-down anchors.',
  highlights: [
    'Bearing count: formula dim — girder count × 2 (both ends)',
    'Bearing type variant (Elastomeric / Pot / PTFE Slide) swaps product code',
    '"Seismic Zone" criterion adds anchor bolts + base plate set',
    'Grout pads: ratio off bearing count',
    'Epoxy grout 25kg bags from bearing area',
    'Warning when span >40m (special bearing design required)',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Warning', 'Variant'],
  template: {
    name: 'Bridge Bearings (Sample)',
    icon: '🌉', color: '#475569',
    inputModel: 'linear',
    description: 'Bridge bearing installation — elastomeric, pot, or slide bearings with grouting',
    customDims: [
      dim({ id: 'cd_br_count', key: 'cd_br_count', name: 'Bearing Count', unit: 'bearings',
        icon: '🔩', color: '#475569', derivType: 'formula', formulaQty: 2, formulaDimKey: 'custom_a' }),
      dim({ id: 'cd_br_girders', key: 'cd_br_girders', name: 'Girder Count', unit: 'girders',
        icon: '⬛', color: '#334155', derivType: 'user_input', inputStep: 1 }),
    ],
    customCriteria: [
      crit('crit_seismic', 'cr_seismic', 'Seismic Zone',
        'High seismic area — adds anchor bolts and hold-down base plates', '⚡', '#dc2626'),
    ],
    warnings: [
      warn('w_br_span', 'w_br_span', 'length', 40,
        'Span >40m — non-standard bearing design and engineering certification required'),
    ],
    variants: [
      variant('var_br_type', 'Bearing Type', '🔩', '#475569', [
        { key: 'elastomeric', label: 'Elastomeric' },
        { key: 'pot',         label: 'Pot Bearing' },
        { key: 'ptfe',        label: 'PTFE Slide' },
      ]),
    ],
    materials: [
      mat('br_bearing',    'Elastomeric Bearing Pad',   'each', 'BR-ELAST',  'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_br_count' }, { variantTags: { var_br_type: 'elastomeric' }, unitPrice: 280.00 }),
      mat('br_pot',        'Pot Bearing Assembly',      'each', 'BR-POT',    'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_br_count' }, { variantTags: { var_br_type: 'pot' },         unitPrice: 1200.00 }),
      mat('br_ptfe',       'PTFE Slide Bearing',        'each', 'BR-PTFE',   'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_br_count' }, { variantTags: { var_br_type: 'ptfe' },        unitPrice: 850.00 }),
      mat('br_grout',      'Epoxy Grout 25kg',          'bag',  'BR-GROUT',  'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_br_count' },                                               { unitPrice: 42.00 }),
      mat('br_mortar',     'Bedding Mortar 25kg',       'bag',  'BR-MORTAR', 'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_br_count' },                                               { unitPrice: 28.00 }),
      mat('br_anchor',     'Anchor Bolt M24 Set',       'set',  'BR-ANCHOR', 'ratio',        { ruleQty: 4, ruleDivisor: 1, ruleDimKey: 'cd_br_count' }, { criteriaKeys: ['cr_seismic'],               unitPrice: 38.00 }),
      mat('br_baseplate',  'Hold-Down Base Plate',      'each', 'BR-BPLT',   'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_br_count' }, { criteriaKeys: ['cr_seismic'],               unitPrice: 195.00 }),
      mat('br_shim',       'Steel Shim Pack',           'set',  'BR-SHIM',   'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_br_count' },                                               { unitPrice: 55.00 }),
    ],
  },
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM 9 — Cladding & Roofing Contractor
// ══════════════════════════════════════════════════════════════════════════════

const CLADDING: SampleSystem = {
  key:      'cladding_roofing',
  category: 'Cladding & Roofing',
  label:    'Cladding & Roofing',
  description:
    'Metal cladding / roofing sheet take-off. Stock-length solver minimises sheet waste. ' +
    'Wind zone criterion increases fastener density. Profile variant swaps sheet product code.',
  highlights: [
    'Sheet count: stock-length solver — cover runs from standard lengths (3m, 4.5m, 6m)',
    'Fastener count: spacing dim at 300mm (High Wind zone: 200mm via criteria)',
    'Profile variant (Corrugated / Trapezoidal / Standing Seam) swaps sheet code',
    '"High Wind Zone" criterion triggers closer fastener spacing',
    'Ridge cap, flashing, sealant: linear metre rules',
    'Warning when run >30m (thermal expansion joint required)',
  ],
  featureTags: ['Custom Dim', 'Custom Criteria', 'Warning', 'Variant'],
  template: {
    name: 'Cladding & Roofing (Sample)',
    icon: '🏠', color: '#0891b2',
    inputModel: 'area',
    description: 'Metal roofing / wall cladding — sheet count via stock solver, profile variants',
    customDims: [
      dim({ id: 'cd_cl_sheets', key: 'cd_cl_sheets', name: 'Sheet Count (solver)', unit: 'sheets',
        icon: '📦', color: '#0891b2', derivType: 'stock_length',
        stockTargetDim: 'length', stockLengths: [3000, 4500, 6000], stockOptimMode: 'min_waste' }),
      dim({ id: 'cd_cl_fast', key: 'cd_cl_fast', name: 'Fasteners', unit: 'fasteners',
        icon: '🔩', color: '#0369a1', derivType: 'spacing',
        spacing: 0.3, spacingMode: 'fixed', spacingTargetDim: 'length',
        includesEndpoints: true, firstSupportMode: 'none', firstGap: 0 }),
    ],
    customCriteria: [
      crit('crit_highwind', 'cr_highwind', 'High Wind Zone (N3+)',
        'Increases fastener count — 200mm centres instead of 300mm', '💨', '#dc2626'),
      crit('crit_insulation', 'cr_insulation', 'With Insulation',
        'Adds insulation batts and double-sided tape to BOM', '🧱', '#16a34a'),
    ],
    warnings: [
      warn('w_cl_exp', 'w_cl_exp', 'length', 30,
        'Run >30m — thermal expansion joint required per AS 1562'),
    ],
    variants: [
      variant('var_cl_profile', 'Sheet Profile', '🏠', '#0891b2', [
        { key: 'corrugated',   label: 'Corrugated' },
        { key: 'trapezoidal',  label: 'Trapezoidal' },
        { key: 'standing_seam',label: 'Standing Seam' },
      ]),
      variant('var_cl_colour', 'Colour', '🎨', '#475569', [
        { key: 'monument',    label: 'Monument' },
        { key: 'colorbond',   label: 'Colorbond Grey' },
        { key: 'zincalume',   label: 'Zincalume' },
      ]),
    ],
    materials: [
      mat('cl_sheet',    'Roofing Sheet',           'each', 'CL-SHEET',   'ratio',        { ruleQty: 1, ruleDivisor: 1, ruleDimKey: 'cd_cl_sheets' }, { variantTags: { var_cl_profile: 'corrugated' }, unitPrice: 48.00 }),
      mat('cl_fastener', 'Tek Screw 12-14×35 (pk50)','pk',  'CL-SCREW',   'ratio',        { ruleQty: 1, ruleDivisor: 50, ruleDimKey: 'cd_cl_fast' },                                 { unitPrice: 18.00 }),
      mat('cl_ridge',    'Ridge Cap (m)',             'm',   'CL-RIDGE',   'linear_metre', { ruleQty: 1 },                                                                             { unitPrice: 24.00 }),
      mat('cl_flash',    'Flashing 300mm (m)',        'm',   'CL-FLASH',   'linear_metre', { ruleQty: 2 },                                                                             { unitPrice: 16.00 }),
      mat('cl_seal',     'Butyl Sealant Tape 10m',  'roll', 'CL-SEAL',    'ratio_length', { ruleQty: 1, ruleDivisor: 10 },                                                            { unitPrice: 28.00 }),
      mat('cl_foam',     'Foam Closure Strip (m)',    'm',   'CL-FOAM',    'linear_metre', { ruleQty: 2 },                                                                             { unitPrice: 8.50 }),
      mat('cl_insul',    'Insulation Batt R2.0',    'each', 'CL-INSUL',   'ratio_area',   { ruleQty: 1 },    { criteriaKeys: ['cr_insulation'],                                       unitPrice: 35.00 }),
      mat('cl_tape',     'Double-Sided Tape 30m',   'roll', 'CL-TAPE',    'ratio_area',   { ruleQty: 0.05 }, { criteriaKeys: ['cr_insulation'],                                       unitPrice: 12.00 }),
    ],
  },
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const SAMPLE_SYSTEMS: SampleSystem[] = [HLL, VECTALADDER, EVORAIL, SOLAR, PAINT, TILER, CABINETRY, BRIDGE_BEARINGS, CLADDING]

export function getSampleSystem(key: string): SampleSystem | undefined {
  return SAMPLE_SYSTEMS.find(s => s.key === key)
}
