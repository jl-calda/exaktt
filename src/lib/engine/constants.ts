// src/lib/engine/constants.ts
// Shared constants used by both the engine and UI components

export const PRIMITIVE_DIMS = [
  { key: 'length',    label: 'Length',        unit: 'm',       icon: '📏', step: '0.1' },
  { key: 'width',     label: 'Width',         unit: 'm',       icon: '↔️',  step: '0.1' },
  { key: 'height',    label: 'Height',        unit: 'm',       icon: '↕️',  step: '0.1' },
  { key: 'perimeter', label: 'Perimeter',     unit: 'm',       icon: '⬜', step: '0.1' },
  { key: 'corners',   label: 'Corners',       unit: 'corners', icon: '🔲', step: '1'   },
  { key: 'ends',      label: 'Ends',          unit: 'ends',    icon: '🔚', step: '1'   },
  { key: 'workers',   label: 'Workers',       unit: 'workers', icon: '👷', step: '1'   },
  { key: 'levels',    label: 'Levels/Floors', unit: 'levels',  icon: '🏢', step: '1'   },
  { key: 'openings',  label: 'Openings',      unit: 'openings',icon: '🚪', step: '1'   },
  { key: 'custom_a',  label: 'Custom A',      unit: '',        icon: '🔧', step: '1'   },
  { key: 'custom_b',  label: 'Custom B',      unit: '',        icon: '⚙️',  step: '1'   },
] as const

export const LIBRARY_CATEGORIES = [
  { id: 'plates',      label: 'Plates & Sections', icon: '⬛' },
  { id: 'fasteners',   label: 'Fasteners',          icon: '🔩' },
  { id: 'ladder',      label: 'Ladder & Access',    icon: '🪜' },
  { id: 'lifeline',    label: 'Lifeline & Safety',  icon: '🦺' },
  { id: 'consumables', label: 'Consumables',         icon: '🪣' },
  { id: 'hardware',    label: 'Hardware',            icon: '🔧' },
  { id: 'electrical',  label: 'Electrical',          icon: '⚡' },
  { id: 'other',       label: 'Other',               icon: '📦' },
] as const

export const MATERIAL_PROPERTIES: Record<string, {
  key: string; label: string; unit: string; type: 'number' | 'text' | 'select'; step?: string; options?: string[]
}[]> = {
  plates: [
    { key: 'width_mm',      label: 'Width',      unit: 'mm', type: 'number', step: '1' },
    { key: 'length_mm',     label: 'Length',     unit: 'mm', type: 'number', step: '1' },
    { key: 'thk_mm',        label: 'Thickness',  unit: 'mm', type: 'number', step: '0.5' },
    { key: 'grade',         label: 'Grade',      unit: '',   type: 'select', options: ['S275','S355','S420','SS304','SS316','AL5052','AL6061','Other'] },
    { key: 'material_type', label: 'Material',   unit: '',   type: 'select', options: ['Mild Steel','Stainless Steel','Aluminium','Galvanised Steel','Other'] },
  ],
  fasteners: [
    { key: 'diameter_mm', label: 'Diameter', unit: 'mm', type: 'number', step: '0.5' },
    { key: 'length_mm',   label: 'Length',   unit: 'mm', type: 'number', step: '1' },
    { key: 'grade',       label: 'Grade',    unit: '',   type: 'select', options: ['4.6','8.8','10.9','A2-70','A4-80','HDG','Other'] },
    { key: 'coating',     label: 'Coating',  unit: '',   type: 'select', options: ['None','Hot Dip Galv','Zinc Plated','Stainless','Epoxy','Other'] },
    { key: 'standard',    label: 'Standard', unit: '',   type: 'text' },
  ],
  ladder: [
    { key: 'length_mm', label: 'Length', unit: 'mm', type: 'number', step: '1' },
    { key: 'width_mm',  label: 'Width',  unit: 'mm', type: 'number', step: '1' },
    { key: 'finish',    label: 'Finish', unit: '',   type: 'select', options: ['Raw','Anodised','Powder Coat','Hot Dip Galv','Other'] },
  ],
  lifeline: [
    { key: 'length_mm', label: 'Length', unit: 'mm', type: 'number', step: '1' },
    { key: 'swl_kg',    label: 'SWL',    unit: 'kg', type: 'number', step: '1' },
    { key: 'standard',  label: 'Standard', unit: '', type: 'text' },
  ],
}

export const RULE_GROUPS = [
  { id: 'ratio',  label: 'Ratio (N per N)', color: '#7c3aed', bg: '#faf5ff', icon: '⚖️' },
  { id: 'length', label: 'Length-Based',    color: '#0369a1', bg: '#f0f9ff', icon: '📏' },
  { id: 'area',   label: 'Area-Based',      color: '#059669', bg: '#f0fdf4', icon: '⬛' },
  { id: 'weight', label: 'Weight-Based',    color: '#c2410c', bg: '#fff7ed', icon: '⚖️' },
  { id: 'fixed',  label: 'Fixed / System',  color: '#b45309', bg: '#fffbeb', icon: '📌' },
] as const

export const RULE_TYPES = [
  { value: 'ratio',             label: 'Ratio (N per N)',             group: 'ratio',  fields: ['ruleQty','ruleOutUnit','ruleDivisor','ruleDimKey'] },
  { value: 'ratio_length',      label: 'Ratio per metre run',         group: 'ratio',  fields: ['ruleQty','ruleOutUnit','ruleDivisor'] },
  { value: 'ratio_area',        label: 'Ratio per m² area',           group: 'ratio',  fields: ['ruleQty','ruleOutUnit','ruleDivisor'] },
  { value: 'linear_metre',      label: 'Linear metres',               group: 'length', fields: ['ruleQty'] },
  { value: 'base_plus_length',  label: 'Base qty + 1 per N metres',   group: 'length', fields: ['ruleQty','ruleDivisor'] },
  { value: 'coverage_per_item', label: 'Coverage per item (m²)',      group: 'area',   fields: ['ruleOutUnit','ruleDivisor'] },
  { value: 'sheet_size',        label: 'Sheet/board size',            group: 'area',   fields: ['ruleTileW','ruleTileH'] },
  { value: 'tile_size',         label: 'Tile size',                   group: 'area',   fields: ['ruleOutUnit','ruleTileW','ruleTileH'] },
  { value: 'kg_per_sqm',        label: 'kg per m²',                   group: 'weight', fields: ['ruleQty'] },
  { value: 'kg_per_metre',      label: 'kg per m run',                group: 'weight', fields: ['ruleQty'] },
  { value: 'kg_per_item',       label: 'kg per item count',           group: 'weight', fields: ['ruleQty','ruleDimKey'] },
  { value: 'bags_from_kg',      label: 'Bags from kg/m²',             group: 'weight', fields: ['ruleQty','ruleOutUnit','ruleBagSize'] },
  { value: 'fixed_qty',         label: 'Fixed quantity',              group: 'fixed',  fields: ['ruleQty','ruleOutUnit'] },
  { value: 'stock_length_qty',  label: 'Stock length qty (from solver)', group: 'ratio', fields: ['ruleStockDimKey','ruleStockLength'] },
] as const

export const DERIV_TYPES = [
  { value: 'user_input',   label: 'User Input',            icon: '📥', desc: 'A value the user types directly into the calculator.' },
  { value: 'spacing',      label: 'Spaced along length',   icon: '📐', desc: 'Count items spaced along a run.' },
  { value: 'sum',          label: 'Sum of dimensions',     icon: '➕', desc: 'Sum of selected primitive dims.' },
  { value: 'area',         label: 'Area (L × W)',          icon: '⬛', desc: 'Length × width in m².' },
  { value: 'formula',      label: 'Multiplier × dim',      icon: '✖️',  desc: 'Fixed multiplier × one dim.' },
  { value: 'stock_length', label: 'Stock Length Solver',   icon: '📦', desc: 'Optimally cover a target length with stock sections.' },
  { value: 'sheet_cut',    label: 'Sheet / Plate Solver',  icon: '✂️',  desc: 'Parts from sheets — uses plate material properties.' },
] as const
