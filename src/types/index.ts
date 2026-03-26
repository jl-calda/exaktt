// src/types/index.ts
// Complete domain types for MaterialMTO SaaS

export type Plan = 'FREE' | 'PRO'
export type InputModel = 'linear' | 'area' | 'volume' | 'mass' | 'count' | 'time'
export type CompanyRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

// ─── Company + Team ───────────────────────────────────────────────────────────

export interface Company {
  id:               string
  name:             string
  slug:             string
  plan:             Plan
  seatLimit:        number
  stripeCustomerId?: string | null
  stripeSubId?:     string | null
  stripePriceId?:   string | null
  planExpiresAt?:   Date | null
  createdAt:        Date
  updatedAt:        Date
}

export type ModuleName = 'systems' | 'library' | 'reports' | 'logistics' | 'tenders'
export type ModulePermission = 'write' | 'read' | 'none'

export interface CompanyMember {
  companyId:    string
  userId:       string
  role:         CompanyRole
  permissions:  Record<ModuleName, ModulePermission>
  joinedAt:     Date
  company?:     Company
  user?:        Pick<User, 'id' | 'email' | 'name' | 'avatarUrl'>
}

export interface CompanyInvite {
  id:          string
  companyId:   string
  email:       string
  role:        CompanyRole
  permissions: Record<ModuleName, ModulePermission>
  token:       string
  invitedById: string
  expiresAt:   Date
  acceptedAt?: Date | null
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id:             string
  email:          string
  name?:          string | null
  avatarUrl?:     string | null
  profile?:       Profile | null
  companyMembers?: CompanyMember[]
}

// ─── Company Profile (report branding) ──────────────────────────────────────

export interface Profile {
  id:                   string
  userId:               string
  companyName?:         string | null
  tradingName?:         string | null
  logo?:                string | null  // base64 or URL
  companyLogo?:         string | null  // alias used in report branding
  address?:             string | null
  city?:                string | null
  country?:             string | null
  postcode?:            string | null
  phone?:               string | null
  website?:             string | null
  abn?:                 string | null
  registrationLabel:    string         // "ABN", "UEN", "GST Reg", "CRN"
  registrationNumber?:  string | null  // the actual number
  qs_license?:          string | null  // QS licence number
  defaultPreparedBy?:   string | null
  defaultReportNotes?:  string | null
  defaultDisclaimer?:   string | null
  defaultCurrency:      string
  defaultShowPricing:   boolean
  reportLogoPosition?:  string         // 'left' | 'center' | 'right'
  reportAccentColor?:   string         // hex colour for report header
}

// ─── Material domain (same as artifact) ─────────────────────────────────────

export interface MaterialProperties {
  width_mm?:     number
  length_mm?:    number
  thk_mm?:       number
  grade?:        string
  material_type?: string
  diameter_mm?:  number
  coating?:      string
  standard?:     string
  finish?:       string
  swl_kg?:       number
  [key: string]: string | number | undefined
}

export interface RuleRow {
  id:              string
  condition:       null | { criterionKey: string; whenValue: boolean }
  ruleType:        string | null
  ruleQty:         number
  ruleDivisor:     number
  ruleDimKey:      string
  ruleTileW:       number
  ruleTileH:       number
  waste:           number
  ruleStockDimKey: string
  ruleStockLength: number
}

export interface Material {
  id:           string
  name:         string
  unit:         string
  notes:        string
  photo:        string | null
  productCode:  string
  category:     string
  properties:   MaterialProperties
  tags:         string[]
  substrate:    string
  ruleSet:      RuleRow[]
  unitPrice?:   number | null
  criteriaKeys: string[]
  variantTags:  Record<string, string>
  libraryRef:   string | null
  spec?:        LibraryItemSpec | null
  _libSyncedAt: number | null
  _systemSpecific: boolean
  _createdInSystem: string | null
  _createdAt:   number | null
  _updatedAt:   number | null
  _wasLibrary:  string | null
  _madeUniqueAt: number | null
  // computed
  _isPlateAuto?: boolean
  _sheetDimKey?: string
  _sheetResult?: SheetSolveResult
}

// ─── Material Spec (pricing + stock) ─────────────────────────────────────────

export interface MaterialSpec {
  id:            string
  companyId:     string
  createdById:   string
  productCode?:  string | null
  materialId?:   string | null

  // Stock & logistics
  stockLength?:  number | null   // mm
  storageLength?: number | null  // mm
  weightPerM?:   number | null   // kg/m
  supplier?:     string | null
  leadTimeDays?: number | null

  // Pricing
  unitPrice?:    number | null
  currency:      string
  priceDate?:    Date | null
  priceNotes?:   string | null

  createdAt:     Date
  updatedAt:     Date
}

// ─── Library Item Spec (embedded on LibraryItem + Material) ──────────────────

export interface LibraryItemSpec {
  stockLengthMm?:   number
  storageLengthMm?: number
  unitPrice?:       number
  currency?:        string
  supplier?:        string
  supplierCode?:    string
  leadTimeDays?:    number
  packSize?:        number   // units per pack/box
  moq?:             number   // minimum order quantity
}

// ─── Custom Dimensions ────────────────────────────────────────────────────────

export interface CustomDim {
  id:   string
  key:  string
  name: string
  unit: string
  icon: string
  color: string
  derivType: string
  spacing:           number
  spacingMode:       'fixed' | 'user'
  spacingLabel:      string
  spacingTargetDim:  string
  firstSupportMode:  string
  firstGap:          number
  includesEndpoints: boolean
  sumKeys:           string[]
  formulaQty:        number
  formulaDimKey:     string
  stockLengths:      number[]
  stockTargetDim:    string
  stockOptimMode:    string
  plateMaterialId:   string
  partW:             number
  partH:             number
  kerf:              number
  sheetAllowRotation: boolean
  sheetPartsNeededDim: string
  inputStep?: number   // user_input type only: increment for the number field

  // Adaptive derivation features
  criteriaOverrides?: CriteriaParamOverride[]             // #1: criteria-gated param overrides
  allowOverride?: boolean                                 // #4: allow user to override computed value
}

export interface CriteriaParamOverride {
  criterionKey: string
  whenActive:   boolean
  params:       Record<string, any>
}

export interface CustomCriterion {
  id:          string
  key:         string
  name:        string
  description: string
  icon:        string
  color:       string
  type:        'input' | 'derived'
  dimKey:      string
  operator:    '>' | '>=' | '<' | '<='
  threshold:   number
}

export interface VariantNode {
  key:      string
  label:    string
  children: VariantNode[]
  paramDefs?: { key: string; label: string; unit: string }[]
  params?:    Record<string, number>
}

export interface Variant {
  id:          string
  name:        string
  icon:        string
  color:       string
  levelLabels: [string, string, string]
  nodes:       VariantNode[]
}

export interface Warning {
  id?:       string
  key:       string
  dimKey:    string
  operator:  '>' | '>=' | '<' | '<='
  threshold: number
  message:   string
}

export interface MtoSystem {
  id:             string
  name:           string
  shortName?:     string | null
  description?:   string | null
  icon:           string
  color:          string
  inputModel:     InputModel
  dimOverrides?:  Record<string, { label?: string; unit?: string }>
  materials:      Material[]
  customDims:     CustomDim[]
  customCriteria: CustomCriterion[]
  variants:       Variant[]
  warnings:       Warning[]
  customBrackets?: WorkBracket[]
  setupBrackets?:  SetupBracket[]
  workActivities?: WorkActivity[]
  isLocked?:       boolean
  materialSnapshot?: Record<string, number> | null
  createdAt?:     Date
  updatedAt?:     Date
}

// ─── Runs / Jobs ──────────────────────────────────────────────────────────────

export interface Segment {
  id:      string
  type:    string
  length:  string
  spacing: string
}

export interface Run {
  id:             string
  name:           string
  inputMode:      'simple' | 'segment'
  job:            Record<string, string | number>
  simpleJob:      { length: string; corners: string }
  segments:       Segment[]
  stockOverrides: Record<string, Record<string, number>>
  qty:            number
  criteriaState?: Record<string, boolean>
  variantState?:  Record<string, string>
}

export interface SavedJob {
  id:              string
  systemId:        string
  name:            string
  notes?:          string | null
  runs:            Run[]
  criteriaState?:  Record<string, boolean>   // legacy — now per-run
  variantState?:   Record<string, string>    // legacy — now per-run
  stockOptimMode:  string
  calculatedAt?:   Date | null
  matVersions?:    Record<string, number>
  lastResults?:    JobLastResults | null
  createdAt:       Date
  updatedAt:       Date
}

export interface JobLastResults {
  runs: { id: string; name: string; qty: number }[]
  bom: {
    id: string; name: string; productCode: string; unit: string
    unitPrice: number | null
    grandTotal: number
    lineTotal: number | null
    perRun: { runName: string; runQty: number; unitQty: number; totalQty: number }[]
  }[]
  gated: { id: string; name: string }[]
  breakdown: {
    runName: string; qty: number
    dims: Record<string, number>
    criteriaState: Record<string, boolean>
    variantState: Record<string, string>
    materials: {
      id: string; name: string
      ruleType: string; formula: string
      raw: number; unitQty: number
      unitPrice: number | null; lineTotal: number | null
    }[]
  }[]
  workSchedule: any | null
  totals: {
    materialCost: number
    labourCost: number
    thirdPartyCost: number
    grandTotal: number
  }
}

// ─── Engine results ───────────────────────────────────────────────────────────

export interface MaterialResult extends Material {
  raw:       number
  withWaste: number
  qty:       number
  blocked:   boolean
  blockedBy: string[]
  activeRow: RuleRow | null
  noMatch?:  boolean
}

export interface SheetSolveResult {
  sheetsNeeded:  number
  partsPerSheet: number
  cols:          number
  rows:          number
  effectivePartW: number
  effectivePartH: number
  waste_pct:     number
  utilisation:   number
  rotated:       boolean
  sheetW:        number
  sheetH:        number
  kerf:          number
}

export interface StockSolveResult {
  items:        { length: number; qty: number; covered: number }[]
  totalQty:     number
  totalCovered: number
  cutWaste:     number
}

export interface MultiRunResult {
  combined: MultiRunMaterial[]
  runs:     Run[]
}

export interface MultiRunMaterial extends MaterialResult {
  perRun:     PerRunResult[]
  grandTotal: number
  allBlocked: boolean
}

/** @deprecated Use MultiRunMaterial */
export type MultiRunCombined = MultiRunMaterial

export interface PerRunResult {
  runId:    string
  runName:  string
  runQty:   number
  unitQty:  number
  totalQty: number
  blocked:  boolean
  blockedBy: string[]
  raw:      number
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface ReportConfig {
  title:       string
  jobRef?:     string
  preparedBy?: string
  preparedFor?: string
  reportDate:  Date
  revisionNo:  string
  notes?:      string
  showPricing: boolean
  showWeights: boolean
  currency:    string
}

export interface Report {
  id:           string
  companyId:    string
  createdById:  string
  systemId?:    string | null
  jobId?:       string | null
  title:        string
  jobRef?:      string | null
  preparedBy?:  string | null
  preparedFor?: string | null
  reportDate:   Date
  revisionNo:   string
  notes?:       string | null
  isPublic:     boolean
  publicToken?: string | null
  companyName?: string | null
  companyLogo?: string | null
  companyAddr?: string | null
  abn?:         string | null
  showPricing:  boolean
  showWeights:  boolean
  currency:     string
  systemName?:  string | null
  resultsSnapshot?: MultiRunResult | null
  specsSnapshot?:   Record<string, MaterialSpec> | null
  isArchived:   boolean
  createdAt:    Date
  updatedAt:    Date
}

// ─── Library ──────────────────────────────────────────────────────────────────

export interface LibraryItem {
  id:              string
  name:            string
  unit:            string
  notes?:          string | null
  productCode?:    string | null
  category:        string
  photo?:          string | null
  properties:      MaterialProperties
  tags?:           string[]
  spec?:           LibraryItemSpec | null
  usedInSystems?:  { id: string; name: string; shortName?: string | null }[]
  gradeId?:        string | null
  grade?:          { id: string; name: string; materialType?: string | null; density?: number | null } | null
  manufacturerId?: string | null
  manufacturer?:   { id: string; name: string } | null
  certifications?: MaterialCertification[]
  createdAt:       Date
  updatedAt:       Date
}

// ─── Logistics ────────────────────────────────────────────────────────────────

export interface MaterialGrade {
  id:           string
  companyId:    string
  createdById:  string
  name:         string
  materialType?: string | null
  standard?:    string | null
  density?:     number | null
  notes?:       string | null
  createdAt:    Date
  updatedAt:    Date
}

export interface Manufacturer {
  id:            string
  companyId:     string
  createdById:   string
  name:          string
  contactPerson?: string | null
  email?:        string | null
  phone?:        string | null
  country?:      string | null
  website?:      string | null
  notes?:        string | null
  isArchived:    boolean
  createdAt:     Date
  updatedAt:     Date
}

export type CertType = 'mill_cert' | 'ce' | 'iso' | 'test_report' | 'msds' | 'other'
export interface MaterialCertification {
  id:            string
  libraryItemId: string
  companyId:     string
  createdById:   string
  type:          string
  certNumber?:   string | null
  issuedBy?:     string | null
  issuedDate?:   Date | null
  expiryDate?:   Date | null
  fileUrl?:      string | null
  fileName?:     string | null
  notes?:        string | null
  createdAt:     Date
}

export interface MaterialCategory {
  id:          string
  companyId:   string
  createdById: string
  name:      string
  icon:      string
  sortOrder: number
  createdAt: Date
}

export interface Supplier {
  id:            string
  companyId:     string
  createdById:   string
  name:          string
  contactPerson?: string | null
  email?:        string | null
  phone?:        string | null
  address?:      string | null
  paymentTerms?: string | null
  notes?:        string | null
  isArchived:    boolean
  createdAt:     Date
  updatedAt:     Date
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrder {
  id:           string
  companyId:    string
  createdById:  string
  supplierId?:  string | null
  supplierName?: string | null
  supplier?:    Pick<Supplier, 'id' | 'name'> | null
  ref?:         string | null
  status:       PurchaseOrderStatus
  orderDate:    Date
  expectedDate?: Date | null
  notes?:       string | null
  lines?:       PurchaseOrderLine[]
  createdAt:    Date
  updatedAt:    Date
}

export interface PurchaseOrderLine {
  id:            string
  poId:          string
  libraryItemId?: string | null
  itemName:      string
  itemUnit:      string
  qtyOrdered:    number
  unitPrice?:    number | null
  notes?:        string | null
  createdAt:     Date
}

export type DeliveryOrderStatus = 'PENDING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED'

export interface DeliveryOrder {
  id:            string
  companyId:     string
  createdById:   string
  poId?:         string | null
  po?:           Pick<PurchaseOrder, 'id' | 'ref' | 'supplierName'> | null
  ref?:          string | null
  status:        DeliveryOrderStatus
  expectedDate?: Date | null
  deliveredDate?: Date | null
  notes?:        string | null
  lines?:        DeliveryOrderLine[]
  createdAt:     Date
  updatedAt:     Date
}

export interface DeliveryOrderLine {
  id:            string
  doId:          string
  poLineId?:     string | null
  libraryItemId?: string | null
  itemName:      string
  itemUnit:      string
  qtyExpected:   number
  qtyDelivered:  number
  createdAt:     Date
}

// Alias used in SystemShellSaaS + ReportBuilder
export type CompanyProfile = Profile

// ─── Global Tags ──────────────────────────────────────────────────────────────

export interface GlobalTag {
  id:    string
  name:  string
  color: string
  order: number
}

// ─── Custom Brackets (sub-assemblies) ─────────────────────────────────────────

export interface BracketParameter {
  key:     string    // e.g. "projection_mm"
  label:   string    // e.g. "Projection"
  unit:    string    // e.g. "mm"
  default: number
  dimKey?: string    // optional: pull value from a system dim at calc time instead of using default
  source?: 'input' | 'stock_length'   // where the value comes from
  stockMaterialId?: string            // when source='stock_length', which BOM material to read spec from
}

// Setup-specific parameter configuration (lives on SetupBracket, not the template)
export interface SetupBracketParam {
  key:              string
  source:           'input' | 'stock_length'
  value:            number
  stockMaterialId?: string    // when source='stock_length', which material to read spec from
}

// Instance of a bracket in Setup — references a WorkBracket template
export interface SetupBracket {
  bracketId:    string
  params:       SetupBracketParam[]
  ruleSet:      RuleRow[]
  criteriaKeys: string[]
  variantTags:  Record<string, string>
}

export interface BracketBOMItem {
  id:          string
  materialId:  string    // references Material in system; empty string when using customName
  customName?: string    // free-text material name when not from system library
  qtyFormula:  string    // e.g. "2" or "projection_mm + 50"
  qtyUnit:     string    // "pcs" | "mm" | "m" | "kg" | "L"
  notes?:      string
}

export type LabourRateUnitType = 'per_piece' | 'per_dim' | 'per_hour' | 'lump_sum'

export interface CrewRole {
  labourRateId: string    // ref to company LabourRate
  roleName:     string    // snapshot: "Supervisor", "Worker"
  count:        number    // how many of this role
  ratePerHr:    number    // snapshot: hourly rate
}

export interface WorkScheduleRoleCost {
  roleName:   string
  count:      number
  ratePerHr:  number
  manHours:   number    // elapsedHours × count
  cost:       number    // manHours × ratePerHr
}

export interface LabourRate {
  id:         string
  name:       string
  category:   string
  unitType:   LabourRateUnitType
  unitLabel:  string       // "pc", "m", "m²", "hr", "lot"
  rate:       number       // price per unit
  notes?:     string | null
  isArchived: boolean
}

// ─── Work Categories & Activity Rates ────────────────────────────────────────

export interface WorkCategory {
  id:          string
  name:        string       // "Cutting", "Welding", "Handling"
  icon:        string
  color:       string
  description?: string | null
  sortOrder:   number
  isArchived:  boolean
}

export interface WorkActivityRate {
  id:             string
  name:           string             // e.g. "Welding @ $85/hr"
  workCategoryId: string
  labourRateId:   string

  // Snapshots for display / offline computation
  categoryName:   string
  categoryIcon:   string
  rateName:       string
  rateValue:      number
  rateUnitType:   LabourRateUnitType
  rateUnitLabel:  string

  // Default speed definition
  speedMode:      SpeedMode          // 'time_per_unit' | 'rate'
  defaultTimePerUnit?: number        // min per unit
  defaultRatePerHr?:   number        // units per hr
  crewSize:       number
  defaultCrewRoles?: CrewRole[]      // default crew composition (pre-fills when activity is created from this rate)
  notes?:         string | null
  isArchived:     boolean
  systemTags?:    string[]
}

// Instance of a WorkActivityRate applied to a bracket
export interface BracketWorkActivityRef {
  id:                 string
  workActivityRateId: string

  // Instance-specific (supports formula or fixed value)
  timeFormula:        string          // "5" or "3 + projection_mm / 100"
  timeUnit:           'min' | 'hr'
  speedMode?:         SpeedMode       // override WAR default
  ratePerHr?:         number          // override WAR default
  crewSize?:          number          // override WAR default
  crewRoles?:         CrewRole[]     // optional per-role breakdown

  // Snapshots (populated at save time from the WorkActivityRate)
  _categoryName:      string
  _categoryIcon:      string
  _rateName:          string
  _rateValue:         number
  _rateUnitType:      LabourRateUnitType
  _rateUnitLabel:     string
  _labourRateHr?:     number
  _unitCost?:         number
}

export interface WorkBracket {
  id:            string
  name:          string
  code?:         string
  description?:  string
  icon:          string
  color:         string
  parameters:       BracketParameter[]       // drive BOM item formulas (parametric dims)
  bom:              BracketBOMItem[]
  workActivityRefs: BracketWorkActivityRef[]
}

// ─── Work Activities ──────────────────────────────────────────────────────────

export type ActivityPhase =
  | 'fabrication' | 'installation' | 'commissioning' | 'transport' | 'third_party'

export type ActivityRateType =
  | 'per_material_qty'
  | 'per_bracket_qty'
  | 'per_dim'
  | 'per_run'
  | 'per_job'
  | 'third_party_unit'
  | 'third_party_day'
  | 'third_party_lump'

export type SpeedMode = 'time_per_unit' | 'rate'

export interface WorkActivity {
  id:    string
  name:  string
  phase: ActivityPhase
  icon:  string
  color: string

  // Source — what quantity drives this activity
  rateType:          ActivityRateType
  sourceMaterialId?: string
  sourceBracketId?:  string
  sourceDimKey?:     string

  // Time definition
  speedMode:    SpeedMode
  timePerUnit?: number     // minutes per unit
  ratePerHr?:   number     // units per hour (rate mode — inverted to get time)
  rateDimKey?:  string     // which dim key is the "distance" for rate mode

  // Third party
  thirdPartyRate?:     number
  thirdPartySupplier?: string

  // Work Activity Rate reference (replaces inline labour fields)
  workActivityRateId?: string
  crewSize:            number    // default 1 (auto-computed as sum of role counts when crewRoles present)
  crewRoles?:          CrewRole[]  // optional per-role breakdown (supervisor, worker, etc.)

  // Snapshots from WorkActivityRate (populated at save time)
  _categoryName?:  string
  _categoryIcon?:  string
  _rateName?:      string
  _rateValue?:     number
  _rateUnitType?:  LabourRateUnitType
  _rateUnitLabel?: string
  _labourRateHr?:  number
  _unitCost?:      number

  // Criteria gating
  criteriaKeys: string[]

  // Library link
  libraryRef?:     string
  _savedToGlobal?: boolean
}

// ─── Global Activity Library ──────────────────────────────────────────────────

export interface ActivityLibraryItem {
  id:              string
  companyId:       string
  createdById:     string
  name:            string
  phase:           ActivityPhase
  icon?:           string | null
  description?:    string | null
  rateType:        ActivityRateType
  defaultTimeMin?: number | null
  speedMode?:      SpeedMode | null
  defaultRate?:    number | null
  workActivityRateId?: string | null
  supplier?:       string | null
  supplierContact?: string | null
  createdAt:       Date
  updatedAt:       Date
}

// ─── Engine: Work Schedule results ────────────────────────────────────────────

export interface WorkScheduleResult {
  activityId:      string
  phase:           ActivityPhase
  activityName:    string
  sourceQty:       number
  sourceUnit:      string
  timePerUnit:     number     // minutes
  totalMinutes:    number
  totalHours:      number
  crewSize:        number
  elapsedHours:    number    // totalHours / crewSize
  categoryName?:   string
  labourCost?:     number    // Pro+ only
  crewRoles?:      WorkScheduleRoleCost[]  // per-role breakdown (when activity has crewRoles)
  isThirdParty:    boolean
  thirdPartyCost?: number
}

export interface WorkScheduleSummary {
  byPhase:               Record<string, WorkScheduleResult[]>
  totalFabHours:         number
  totalInstallHours:     number
  totalElapsedHours:     number
  totalLabourCost?:      number
  totalThirdPartyCost?:  number
}

// ─── Tender Settings ──────────────────────────────────────────────────────────

export interface TenderReportDefaults {
  paymentTerms?: string
  disclaimer?: string
  validityPeriod?: string
}

export interface PredefinedItemTemplate {
  id: string
  description: string
  amount: number
  category?: string
}

// ─── Tender Predefined Items ──────────────────────────────────────────────────

export interface TenderPredefinedItem {
  id: string
  description: string
  amount: number
}

// ─── Tender Report (Quotation Builder) ────────────────────────────────────────

export type TenderReportSectionType = 'job_line' | 'custom_line' | 'text_block'

export interface TenderReportJobLine {
  type: 'job_line'
  id: string
  tenderItemId: string
  systemName: string
  jobName: string
  description: string
  amount: number
  marginPct: number
  resultSnapshot: JobLastResults | null
}

export interface TenderReportCustomLine {
  type: 'custom_line'
  id: string
  description: string
  amount: number
  marginPct: number
}

export type TenderBlockCategory = 'header' | 'scope' | 'exclusions' | 'payment_terms' | 'assumptions' | 'notes' | 'custom'

export interface TenderReportTextBlock {
  type: 'text_block'
  id: string
  category: TenderBlockCategory
  title?: string
  content: string            // supports basic markup: **bold**, *italic*, - bullet lists
  templateId?: string
}

export interface TenderReportImageBlock {
  type: 'image_block'
  id: string
  images: {
    url: string        // Supabase storage public URL
    caption?: string
    width?: number     // percentage (default 100/columns for equal split)
  }[]
  columns: number      // 1-4 images per row
}

export type TenderReportSection = TenderReportJobLine | TenderReportCustomLine | TenderReportTextBlock | TenderReportImageBlock

export interface TenderReport {
  id: string
  companyId: string
  createdById: string
  tenderId: string
  title: string
  reference?: string | null
  date: Date
  validUntil?: Date | null
  preparedBy?: string | null
  revisionNo: string
  status: 'draft' | 'submitted'
  companyName?: string | null
  companyLogo?: string | null
  companyAddr?: string | null
  registrationNo?: string | null
  registrationLabel?: string | null
  accentColor?: string | null
  clientName?: string | null
  clientContact?: string | null
  clientEmail?: string | null
  clientAddr?: string | null
  sections: TenderReportSection[]
  overallMarginPct: number
  paymentTerms?: string | null
  validityPeriod?: string | null
  disclaimer?: string | null
  notes?: string | null
  internalNotes?: string | null
  currency: string
  showAppendix: boolean
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TenderTemplate {
  id: string
  name: string
  category: 'full' | 'header' | 'footer' | 'text_block'
  title?: string
  preparedBy?: string
  validityPeriod?: string
  paymentTerms?: string
  disclaimer?: string
  notes?: string
  blockTitle?: string
  blockContent?: string
  defaultSections?: TenderReportSection[]
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'open' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskChecklistItem { id: string; text: string; checked: boolean }
export interface TaskOutput { id: string; type: 'text' | 'file' | 'link' | 'checklist'; content?: string; fileUrl?: string; fileName?: string; linkedUrl?: string }

export interface Task {
  id: string
  companyId: string
  createdById: string
  assigneeId: string
  title: string
  description?: string | null
  priority: TaskPriority
  status: TaskStatus
  startDate?: Date | null
  targetDate?: Date | null
  linkedUrl?: string | null
  linkedType?: string | null
  linkedLabel?: string | null
  checklist: TaskChecklistItem[]
  output: TaskOutput[]
  ccUserIds: string[]
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
  createdBy?: { id: string; name: string | null }
  assignee?: { id: string; name: string | null }
  comments?: TaskComment[]
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  attachments: { url: string; name: string }[]
  createdAt: Date
  user?: { id: string; name: string | null }
}

export interface AppNotification {
  id: string
  userId: string
  type: string
  title: string
  body?: string | null
  taskId?: string | null
  isRead: boolean
  createdAt: Date
}

// ─── Engine: Cut list ─────────────────────────────────────────────────────────

export interface CutItem {
  componentName: string
  bracketId?:    string
  materialId:    string
  lengthMm:      number
  qty:           number
}

export interface OffcutItem {
  barIndex: number
  lengthMm: number
  canReuse: boolean
}

export interface CutListBar {
  cuts:      { componentName: string; lengthMm: number }[]
  offcutMm:  number
}

export interface CutListResult {
  stockMaterialId:   string
  stockMaterialName: string
  stockLengthMm:     number
  barsRequired:      number
  cuts:              CutItem[]
  bars:              CutListBar[]
  totalUsedMm:       number
  totalWasteMm:      number
  wastePct:          number
  largeOffcuts:      OffcutItem[]
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?:  T
  error?: string
  limit?: { feature: string; message: string }
}
