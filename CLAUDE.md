# Claude Code Memory

## Design System — Apple-style UI Guidelines

This app follows an Apple/iOS-inspired design language. All UI work MUST follow these rules.

### Color Philosophy
- **Primary color** (`--color-primary`) is theme-aware (changes per preset: zinc/amber/ocean/rose)
- Use primary ONLY for: buttons, links, focus rings, input focus borders, toggle ON states, sidebar active icons, and the hero stat card
- Use **fixed semantic colors** for data categories (emerald, blue, amber, violet) — these do NOT change with theme
- NEVER use `bg-primary/10` or translucent primary tints for card selection or badges
- NEVER put colored borders or tinted backgrounds on emoji containers

### Emoji & Icon Containers
- Emoji icons go in **neutral surface wells**: `bg-surface-200/40 rounded-lg` — no colored borders, no color-tinted backgrounds
- Lucide icons in sidebars use `icon-well` class; active icons get `text-primary`
- Dashboard/stat card icons use fixed semantic colored wells (e.g., `bg-blue-100 text-blue-600`)

### Card Selection Pattern
- **Selected card**: `bg-surface-50 border-primary shadow-sm ring-1 ring-primary/20` (lifted white + thin primary ring)
- **Unselected card**: `bg-surface-100/60 border-surface-200 hover:bg-surface-100`
- NEVER use `bg-primary/10 border-primary` for selected states

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

### Animations
- Spring easing: `var(--ease-spring): cubic-bezier(0.22, 1, 0.36, 1)` for all transitions
- Dropdown panels: add `animate-fade-in` class
- Conditional forms: add `animate-fade-in` on wrapper div
- Collapsible sections: use `.collapse-wrap` / `.collapse-wrap.open` CSS grid pattern
- Card hover: `transition-all duration-200`

### Shadows
- Card: `var(--shadow-card)` — subtle multi-layer
- Panel: `var(--shadow-panel)` — elevated panels/dropdowns
- Float: `var(--shadow-float)` — modals/overlays

### Radii
- `--radius: 10px` — inputs, buttons, pills
- `--radius-card: 14px` — cards, panels
- `--radius-sm: 8px` — icon wells, small elements
- `--radius-badge: 20px` — badges, pills
- `--radius-full: 9999px` — circles, scrollbar thumbs

### Dependency Graph (`SystemGraphTab.tsx`)
- Pill-shaped nodes: `borderRadius: NODE_H / 2`
- Muted color palette — barely-there tinted backgrounds, soft borders
- All level labels use neutral `#64748b`
- Nodes have native `title` tooltips
- Edges: soft stroke widths (1.5 active, 0.8 dimmed)

### Badge Component (`Badge.tsx`)
- With color prop: `style={{ color }}` + `bg-surface-100 border-surface-200/60` (text carries semantic color, container is neutral)
- Without color: `bg-surface-100 text-ink-muted border-surface-300`

### CSS Architecture
- Design tokens in `@theme` block of `globals.css`
- Component classes in `@layer components`
- 4 theme presets via `[data-theme]` attribute
- Dark mode via `.dark` class
- Use `color-mix()` for soft borders: `color-mix(in srgb, var(--color-surface-200) 60%, transparent)`

### What NOT to Do
- No colored borders on emoji (`border: 1px solid ${color}20`)
- No `background: color + '18'` hex concatenation for tinting
- No `bg-primary/10` for selected states (use lifted card pattern instead)
- No `text-primary` on sidebar item labels (only on icons)
- No rem values for font-sizes in CSS component classes (use px)
- No `text-[9px]` anywhere (minimum is 10px)
