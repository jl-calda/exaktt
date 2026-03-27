# Claude Code Memory

## Design System — Apple-style UI Guidelines

This app follows an Apple/iOS-inspired design language. All UI work MUST follow these rules.

### Typography
- Fonts: **Inter** (sans) + **JetBrains Mono** (mono), loaded via `next/font/google`
- Font features: `font-feature-settings: "cv11", "ss01"` (alt single-storey a, open digits)
- Body letter-spacing: `-0.011em` (Apple-like tight text)
- Headings: `letter-spacing: -0.025em` to `-0.035em`, `line-height: 1.2`
- Tabular numbers on `.font-mono`, `td`, `th`: `font-variant-numeric: tabular-nums`

### Color Philosophy
- **Primary color** (`--color-primary`) is theme-aware (changes per preset)
- **Secondary color** (`--color-secondary: #ff9f0a`) is fixed Apple orange — used sparingly for warnings/alerts
- Use primary ONLY for: buttons, links, focus rings, input focus borders, toggle ON states, sidebar active icons, and the hero stat card
- Use **fixed semantic colors** for data categories (emerald, blue, amber, violet) — these do NOT change with theme
- NEVER use `bg-primary/10` or translucent primary tints for card selection or badges
- NEVER put colored borders or tinted backgrounds on emoji containers

### Theme Presets
| Preset | Primary | Surface tone |
|--------|---------|-------------|
| Zinc (default) | `#34c759` (Apple green) | Cool gray |
| Amber | `#c9a225` (gold) | Warm cream |
| Ocean | `#2563eb` (blue) | Cool slate |
| Rose | `#e11d48` (crimson) | Neutral white |

Each preset overrides `--color-primary`, `--color-surface-*`, `--color-ink-*`, and `--sidebar-*` tokens. Dark mode has separate overrides via `.dark` and `[data-theme].dark`.

### Emoji & Icon Containers
- Emoji icons go in **neutral surface wells**: `bg-surface-200/40 rounded-lg` — no colored borders, no color-tinted backgrounds
- Lucide icons in sidebars use `icon-well` class; active icons get `text-primary`
- Dashboard/stat card icons use fixed semantic colored wells (e.g., `bg-blue-100 text-blue-600`)

### Card Selection Pattern
- **Selected card**: `bg-surface-50 border-primary shadow-sm ring-1 ring-primary/20` (lifted white + thin primary ring)
- **Unselected card**: `bg-surface-100/60 border-surface-200 hover:bg-surface-100`
- NEVER use `bg-primary/10 border-primary` for selected states

### Run Card (Calculator)
- Container: `border-surface-200/60 bg-surface-50 border-l-2 border-l-primary`
- Header: `bg-surface-100/80 border-surface-200/60`
- Run number pill: `bg-primary/10 text-primary`
- All labels: `text-ink-faint tracking-wide` (NOT secondary colored)
- Toggle active: `bg-primary text-white`

### Sidebar Active State
- Background: `color-mix(in srgb, var(--color-primary) 10%, transparent)`
- Text: `var(--color-ink)` (NOT primary — labels stay dark)
- Icon: `text-primary` (only the icon gets accent color)
- Font-weight: 600

### Tab Pills (`.tab-pill.active`)
- White raised chip: `bg-surface-50`, `color: ink`, `font-weight: 600`, `box-shadow: var(--shadow-card)`
- NOT a colored tint — this matches iOS segmented controls

### Filter Pills (`.filter-pill.active`)
- Dark ink toggle: `bg-ink`, `color: surface-50`, `border-color: ink`

### Button Micro-interactions
- `.btn-primary`: inner highlight (`inset 0 1px 0 rgb(255 255 255 / 0.12)`), hover lifts (`translateY(-0.5px)`), press scales (`scale: 0.97`)
- `.btn-secondary`: uses **surface colors** (NOT the `--color-secondary` token), subtle shadow on hover
- `.btn-ghost`: transparent bg, hover fills with surface-100

### Button Component Variants (`src/components/ui/Button.tsx`)
| Variant | Use for | Style |
|---------|---------|-------|
| `primary` | Primary actions (Save, Submit, Create) | `bg-primary text-white` |
| `secondary` | Secondary actions (Cancel, Change) | `border-surface-300 bg-surface-50` |
| `ghost` | Tertiary/icon-only actions (Edit) | `text-ink-muted hover:bg-surface-100` |
| `danger` | Confirm modal destructive buttons WITH text | `bg-red-50 border-red-200 text-red-600` |
| `danger-ghost` | Icon-only delete buttons in tables/lists | `text-ink-faint hover:text-red-600 hover:bg-red-50` |
| `success` | Positive actions (Delivered, Approve) | `bg-emerald-50 text-emerald-700` |

- Use `danger-ghost` for all icon-only trash/delete buttons — neutral at rest, red on hover
- Reserve `danger` for destructive confirm buttons that have text labels

### Toggle Switches
- ON state: `bg-primary` (use the primary token, not dynamic colors)
- OFF state: `bg-surface-200 border-surface-300`

### Type Scale (base: 14px on html)
| Token    | Size | CSS class usage                                    | Tailwind inline     |
|----------|------|----------------------------------------------------|---------------------|
| caption  | 10px | `.label`, `.badge`, `.filter-pill`, `.section-title`, `th` | `text-[10px]`  |
| body-sm  | 11px | `.tab-pill`, `.empty-state p`                      | `text-[11px]`       |
| body     | 12px | `.input`, `.btn-*`, `.card-header`, table body     | `text-xs`           |
| subhead  | 13px | `.empty-state h3`, section headings                | `text-[13px]`       |
| title    | 14px | Page titles                                        | `text-sm`           |

- NEVER use `text-[9px]` — minimum readable size is 10px
- Use `text-[12px]` → `text-xs` (they're equivalent at 14px base)
- All CSS component class font-sizes use clean px values, not rem

### Stat Card Grids (Dashboard Pattern)
- First/primary stat card is a **hero card**: `bg-primary border-transparent` with white text, `bg-white/20 text-white` icon well
- Other cards: white `card` with semantic colored icon wells
- Category colors: Products=emerald, Tenders/Suppliers=blue, Reports/Orders=amber, Clients/Deliveries=violet

### Table & List Hover
- Table row hover: `color-mix(in srgb, var(--color-primary) 3%, transparent)` — barely-there primary tint
- List row hover: same 3% primary tint
- These subtle hovers are intentional — keeps the Apple feel without being heavy

### DataTable Component (`src/components/ui/DataTable.tsx`)
The **preferred way to render any data table** in the app. Use `DataTable<T>` for all new tables.
- **Exports**: `DataTable` (default), `useTableSort`, `Column<T>`, `GroupDef<T>`, `DataTableProps<T>`
- **Sortable columns**: click header to sort; uses `ArrowUp`/`ArrowDown` indicators
- **Grouping**: pass `groups: GroupDef<T>[]` with `filter` functions; collapsible group headers with left border accent
- **Expandable rows**: pass `expandable: { canExpand, render }` for nested content
- **Toolbar slot**: `toolbar` prop renders above the table inside `card-header`
- **Row class**: `<tr>` gets `group/row` class — use `group-hover/row:` for child hover effects
- **Empty state**: `emptyIcon`, `emptyTitle`, `emptyMessage` props
- **CSS**: uses `.table-wrap` class (defined in `globals.css`) with `data-sortable`/`data-sort-active` attributes on `<th>`

**Column definition pattern:**
```tsx
const columns: Column<MyType>[] = [
  { key: 'name', label: 'Name', sortable: true, sortKey: (item) => item.name, render: (item) => <span>{item.name}</span> },
  { key: 'actions', label: '', width: 'w-20', align: 'right', render: (item) => <ActionButtons item={item} /> },
]
const { sorted, sortKey, sortDir, onSort } = useTableSort(items, columns)
```

**Group definition pattern:**
```tsx
const groups: GroupDef<MyType>[] = [
  { key: 'active', label: 'Active', color: '#10b981', filter: (item) => item.status === 'active' },
  { key: 'archived', label: 'Archived', filter: (item) => item.status === 'archived' },
]
```

**When NOT to use DataTable**: Complex form-editor rows (e.g., `MatRow` with inline editing, expandable rule configs, floating panels). Use raw `<table>` with `.table-wrap` CSS class + `group-header` class for group rows instead.

### Table Row Actions (Apple Pattern)
- **Hidden by default, reveal on hover**: wrap actions in `opacity-0 group-hover/row:opacity-100 transition-opacity`
- **All icons neutral at rest**: `text-ink-faint` — no color until individual button hover
- **Edit icon**: `hover:text-ink hover:bg-surface-200` (subtle darken)
- **Delete icon**: `hover:text-red-500 hover:bg-red-50` (red only on hover)
- **Add/Plus icon**: `hover:text-emerald-600 hover:bg-surface-200`
- **No text labels** on icon-only actions in table rows
- Use `variant="danger-ghost"` on `<Button>` delete buttons (neutral at rest, red on hover)
- Use `variant="danger"` only for confirm modal destructive buttons with text labels
- NEVER use always-visible red icons — draws attention to destructive action at rest

### Focus Ring
- `outline: 2px solid color-mix(in srgb, var(--color-primary) 60%, transparent)`
- `outline-offset: 3px`
- `border-radius: var(--radius-sm)`

### Animations
- Spring easing: `var(--ease-spring): cubic-bezier(0.22, 1, 0.36, 1)` for all transitions
- Out-expo easing: `var(--ease-out-expo): cubic-bezier(0.16, 1, 0.3, 1)`
- `animate-fade-in`: fadeIn 0.25s (translateY(6px) + scale(0.98) → origin)
- `animate-slide-in-right`: slideInRight 0.35s
- `animate-scale-in`: scaleIn 0.25s
- `animate-slide-up`: slideUp 0.35s (translateY(12px) + scale(0.96))
- Stagger utilities: `.stagger-1` through `.stagger-5` (30ms increments)
- Dropdown panels: add `animate-fade-in` class
- Conditional forms: add `animate-fade-in` on wrapper div
- Collapsible sections: use `.collapse-wrap` / `.collapse-wrap.open` CSS grid pattern
- Card hover: `transition-all duration-200`

### Shadows
- Card: `var(--shadow-card)` — subtle multi-layer with 1px ring
- Panel: `var(--shadow-panel)` — elevated panels/dropdowns
- Float: `var(--shadow-float)` — modals/overlays
- Dark mode has heavier shadows with white ring borders

### Radii
- `--radius: 10px` — inputs, buttons, pills
- `--radius-card: 14px` — cards, panels
- `--radius-sm: 8px` — icon wells, small elements
- `--radius-badge: 20px` — badges, pills
- `--radius-full: 9999px` — circles, scrollbar thumbs

### Dependency Graph (`SystemGraphTab.tsx`)
- Pill-shaped nodes: `borderRadius: NODE_H / 2`, width: 160px
- Muted color palette — barely-there tinted backgrounds, soft borders
- All level labels use neutral `#64748b`
- Nodes have native `title` tooltips
- Edges: soft stroke widths (1.5 active, 0.8 dimmed), arrow opacity 0.5

### Badge Component (`Badge.tsx`)
- With color prop: `style={{ color }}` + `bg-surface-100 border-surface-200/60` (text carries semantic color, container is neutral)
- Without color: `bg-surface-100 text-ink-muted border-surface-300`

### CSS Architecture
- Design tokens in `@theme` block of `globals.css`
- Component classes in `@layer components`
- 4 theme presets via `[data-theme]` attribute
- Dark mode via `.dark` class
- Use `color-mix()` for soft borders: `color-mix(in srgb, var(--color-surface-200) 60%, transparent)`
- Sidebar tokens in `:root` (not in `@theme`): `--sidebar-bg`, `--sidebar-border`, radius vars

### Branding
- App name: **Exaktt** (double t) — used in login page, sidebar logo, top nav, PDF reports, footer
- Never use "MaterialMTO" or "Exakt" (single t)

### URL-based Tab Navigation (Product Page Pattern)
- Product page uses optional catch-all route: `/products/[id]/[[...tab]]/page.tsx`
- Tab state synced to URL via `window.history.replaceState()` — NOT `router.replace()` (which triggers server navigation + loading flash)
- Server component parses `tab` segments into `initialTab` + `initialSubTab` props
- Client component initializes state from props, then updates URL on state change
- Valid slugs: `setup`, `materials`, `subassemblies`, `library`, `dependency`, `calculator`, `runs`

### Tender Page Architecture
- `/tenders/[id]` — Tender detail with unified DataTable (estimates + quotations merged), predefined items, no status buttons
- `/tenders/[id]/report/[reportId]` — Quotation report builder with tender-level status dropdown (Won/Lost/Cancelled) in the top bar
- Tender status changes happen INSIDE the report page, not on the tender detail page

### What NOT to Do
- No colored borders on emoji (`border: 1px solid ${color}20`)
- No `background: color + '18'` hex concatenation for tinting
- No `bg-primary/10` for selected states (use lifted card pattern instead)
- No `text-primary` on sidebar item labels (only on icons)
- No rem values for font-sizes in CSS component classes (use px)
- No `text-[9px]` anywhere (minimum is 10px)
- No dynamic `style={{ background: color }}` on emoji containers
- `.btn-secondary` does NOT use `--color-secondary` — it uses surface colors
- No always-visible red delete icons in tables — use `opacity-0 group-hover/row:opacity-100` + `text-ink-faint`
- No `variant="danger"` on icon-only table delete buttons — use `variant="danger-ghost"`
- No `router.replace()` for cosmetic URL updates — use `window.history.replaceState()` to avoid loading flash
- No raw `<table>` for standard data listings — use `DataTable<T>` component
- No `bg-white` in modals/cards — use `bg-surface-50` or `bg-surface`
- No "Edit" text labels on table row action buttons — use icon-only with tooltip (`title` attr)

