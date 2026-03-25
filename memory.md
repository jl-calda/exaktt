# Exakt Platform — Codebase Logic Reference

## Overview

Exakt is a multi-tenant **Material Take-Off (MTO) SaaS platform** for QS (Quantity Surveyor) and logistics teams. Users define piping/structural systems, configure material rules, run calculations that produce BOMs (Bills of Materials), work schedules, and cost reports.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 (CSS-first config) |
| Auth | Supabase Auth (Google + Email/Password) |
| Database | PostgreSQL via Supabase + Prisma 6 |
| State | Zustand 5 (5 stores, 3 persisted) |
| Billing | Stripe (Checkout + Webhooks) |
| PDF | @react-pdf/renderer (server-side) |

## Multi-Tenant Architecture

- **Company** is the tenant. All data is company-scoped via `companyId` FK.
- **CompanyMember** links users to companies with roles: OWNER, ADMIN, MEMBER, VIEWER.
- **RBAC** via `src/lib/auth/access.ts`: 5 modules (systems, library, reports, logistics, tenders) × 3 permissions (write, read, none).
- Every API route calls `requireAccess(userId, module, action)` before any DB operation.
- `verifyOwnership(model, id, companyId)` guards all update/delete queries.

## Route Groups

### `(app)` — Dashboard shell
- `/dashboard` — Stats, recent products, active tenders
- `/products` — System list (MtoSystem)
- `/tenders` — RFQ/tender tracking
- `/clients` — Client contacts
- `/logistics` — Suppliers, POs, DOs, Fabrication tab (labour rates, work categories, activity rates)
- `/settings` — Profile, tags, team
- `/billing` — Stripe checkout + portal

### `(calculator)` — System editor
- `/products/[id]` — Main editor with tabs: Setup, Materials, Calculator, Graph, Settings
- `/system/[id]` — Legacy redirect → `/products/[id]`

Both groups share the same layout: Sidebar + TopNav + auth guard.

## Core Domain: MtoSystem

An `MtoSystem` is the central configuration object. It stores everything as JSON columns in Prisma:

```
MtoSystem {
  inputModel:      'linear' | 'area' | 'volume' | 'mass' | 'count' | 'time'
  materials:       Material[]        — BOM items with rules
  customDims:      CustomDim[]       — derived dimensions (spacing, formulas, stock solver, sheet solver)
  customCriteria:  CustomCriterion[] — gates (input toggles or derived thresholds)
  variants:        Variant[]         — user-choice swaps (hierarchical nodes)
  warnings:        Warning[]         — threshold-based alerts
  customBrackets:  WorkBracket[]     — sub-assembly templates with parametric BOM
  setupBrackets:   SetupBracket[]    — bracket instances with parameter values + rules
  workActivities:  WorkActivity[]    — labour/scheduling activities
  isLocked:        boolean           — locks setup to protect material versions
  materialSnapshot: Record<string, number> — version hashes at lock time
}
```

## Calculation Engine (`src/lib/engine/`)

### Flow: Input → Dimensions → Rules → BOM

1. **Input normalization** (`compute.ts`):
   - User enters primitive dimensions (length, width, height, etc.) in their chosen unit
   - `getUnitFactor()` converts everything to **meters** internally
   - Segments (if segmented input mode) are resolved via `segments.ts`

2. **Custom dimension resolution** (`compute.ts`):
   - `user_input` — direct user entry
   - `spacing` — count items along a length (e.g., brackets every 1.5m)
   - `sum` — sum of other dimensions
   - `area` — length × width
   - `formula_mult` — custom formula × dimension
   - `stock_length` — calls `solveStockLengths()` from `solver.ts`
   - `sheet_size` — calls `solveSheetCut()` from `solver.ts`

3. **Criteria evaluation**:
   - `input` type: user toggles ON/OFF in calculator
   - `derived` type: auto-evaluates threshold (e.g., "length > 6m")
   - Materials with `criteriaKeys` are blocked when criteria are OFF

4. **Variant evaluation**:
   - Hierarchical node trees (up to 3 levels)
   - User selects leaf node per variant
   - Materials with `variantTags` are blocked when tag doesn't match selection

5. **Rule evaluation** (`RuleRow`):
   - Each material has a `ruleSet: RuleRow[]`
   - First matching row wins (condition-based)
   - Rule types: `fixed_qty`, `ratio`, `linear_metre`, `coverage`, `per_unit`, `weight`, `area_coverage`, `sheet_size`, `per_dim`
   - Output: `raw` quantity → apply `wastePercent` → `Math.ceil()` → `qty`

6. **Multi-run aggregation** (`computeMultiRun`):
   - Multiple runs combined into `MultiRunResult`
   - Per-material `grandTotal` across runs

### Optimization (`solver.ts`)

- **Stock length solver**: Greedy + depth-limited search (max depth 12) to find optimal combination of stock sections. Modes: `min_waste` or `min_sections`.
- **Sheet cutting solver**: Calculates optimal sheet cutting layout. Tries both orientations. Returns parts/sheet, utilization %, waste %.

### Work Schedule (`work.ts`)

- **Formula evaluator**: Safe recursive descent parser (no `eval()`). Supports `+`, `-`, `*`, `/`, `()`, and named parameters.
- **`computeWorkSchedule()`**: For each WorkActivity, resolves source qty based on `rateType`, computes time and cost.
- **`computeBracketBOM()`**: Expands bracket BOM items with formula-driven quantities.
- **`computeCutList()`**: First Fit Decreasing bin packing for 1D cut optimization.

### Rate Types for Work Activities

| rateType | Source quantity |
|----------|---------------|
| `per_material_qty` | Material's `grandTotal` |
| `per_bracket_qty` | Bracket quantity from rules |
| `per_dim` | Dimension value (e.g., total length) |
| `per_run` | `runCount` |
| `per_job` | Always 1 |
| `third_party_unit/day/lump` | Third-party pricing |

### Results Snapshot (`results-snapshot.ts`)

`buildLastResults()` creates an immutable snapshot for job persistence:
- BOM with codes, prices, line totals
- Per-run breakdown (dims, criteria, variants, formulas)
- Cost rollup: material + labour + third-party = grand total

## State Management (Zustand — `src/store/index.ts`)

| Store | Persisted | Purpose |
|-------|-----------|---------|
| `useMtoStore` | Yes (`mto-systems`) | Systems list, active system, material CRUD |
| `useLibraryStore` | Yes (`mto-library`) | Material library items |
| `useTagsStore` | Yes (`mto-tags`) | Global tags |
| `useCalcStore` | **No** | Calculator runs, multiResults, stockOptimMode |
| `useMtoJobsStore` | Yes (`mto-jobs`) | Saved jobs (max 100) |

## Work Activity Rate System

Three-tier hierarchy managed in the Fabrication tab (`/logistics`):

1. **LabourRate** — Cost rate (e.g., "Worker @ $45/hr", "Powder coat @ $12/m²")
2. **WorkCategory** — Activity grouping (e.g., "Cutting", "Welding", "Assembly")
3. **WorkActivityRate** = WorkCategory + LabourRate + default speed + crew size

On the Setup tab (Step 7), users add activities via **rate-first flow**:
- Pick a WorkActivityRate → pre-fills name, speed, crew, cost snapshots
- Configure source type (per material, per bracket, per dim, etc.) and phase
- Or "Add Manual" for third-party activities

Snapshot fields (`_categoryName`, `_rateValue`, `_labourRateHr`, etc.) are captured at save time so calculations work offline.

## Auto-Save Architecture

- **System auto-save**: `SystemShellSaaS.tsx` debounces (1.5s) → `PATCH /api/mto/systems/{id}`
- **Draft auto-save**: `useAutoSaveDraft` hook → `PUT /api/mto/drafts` (calculator run state per user per system)
- **Library sync**: Fire-and-forget `PATCH /api/mto/library` when materials added/removed from system

## Plan & Billing

| Feature | FREE | PRO |
|---------|------|-----|
| Currently | Both unlimited (TODO: restore limits) | Both unlimited |

- Stripe Checkout → webhook updates `Company.plan`
- `getLimits(plan)` → `PlanLimits` object
- `withinLimit(current, max)` and `atLimit(current, max)` for enforcement
- Limits enforced server-side in `queries.ts` (atomic transactions to prevent TOCTOU)

## Database Key Patterns

- **JSON columns**: Materials, rules, dims, variants stored as JSON (read/written as whole unit)
- **Soft deletes**: `isArchived: true` (systems, jobs, labour rates, work categories)
- **Ownership guard**: `verifyOwnership()` before every update/delete
- **Atomic limit checks**: `prisma.$transaction(async (tx) => { count + create })` to prevent race conditions
- **Snapshot fields**: WorkActivity and BracketWorkActivityRef store rate snapshots for offline computation

## Key File Map

```
src/
├── app/
│   ├── (app)/                    Dashboard shell routes
│   ├── (calculator)/             System editor routes
│   ├── api/mto/                  Main API (systems, jobs, library, drafts, grades, etc.)
│   ├── api/billing/              Stripe checkout/portal/webhook
│   └── api/logistics/            PO, DO, suppliers
├── components/
│   ├── calculator/
│   │   ├── SystemShellSaaS.tsx   Main shell: tabs, auto-save, locking, reports
│   │   ├── SetupTab.tsx          7-step system config wizard
│   │   ├── CalculatorTab.tsx     Run management, BOM display, work schedule
│   │   ├── MaterialsTab.tsx      Material list + library + brackets sub-tabs
│   │   ├── SystemGraphTab.tsx    Interactive dependency graph
│   │   └── panels/               Sub-panels (CustomDims, Criteria, Variants, Brackets, WorkActivities, Materials)
│   ├── logistics/
│   │   ├── FabricationTab.tsx    Labour rates, work categories, activity rates management
│   │   └── ...                   POs, DOs, suppliers, materials, overview
│   └── ui/                       Shared UI components
├── lib/
│   ├── engine/
│   │   ├── compute.ts            Main calculation engine
│   │   ├── solver.ts             Stock length + sheet cutting optimization
│   │   ├── work.ts               Work schedule, bracket BOMs, cut lists, formula parser
│   │   ├── formula.ts            Human-readable formula display
│   │   ├── constants.ts          Dimensions, input models, rule types, categories
│   │   ├── segments.ts           Linear segment resolution
│   │   ├── run-dims.ts           Dimension extraction/normalization
│   │   └── results-snapshot.ts   Immutable result snapshots
│   ├── db/
│   │   ├── queries.ts            All Prisma queries (CRUD, limits, ownership)
│   │   └── prisma.ts             Singleton client
│   ├── auth/access.ts            RBAC (role → module → permission)
│   ├── limits/index.ts           Plan limits definition + enforcement helpers
│   ├── stripe/index.ts           Stripe client + billing operations
│   ├── hooks/                    useAutoSave, useSystemSync, useMaterialMutations, useAuth
│   └── supabase/                 Server + client Supabase factories
├── store/index.ts                5 Zustand stores
└── types/index.ts                All domain types (70+ interfaces)
```

## Supabase Project

- **Project ID**: `xexbezgihltddgcdhjre`
- **Region**: `ap-northeast-1`
- **Database**: PostgreSQL 17 via Supabase pooler
- **RLS**: Enabled on all tables with `companyId = auth.uid()` policies
