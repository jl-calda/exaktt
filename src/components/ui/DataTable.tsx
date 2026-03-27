// src/components/ui/DataTable.tsx
'use client'
import { useState, useMemo, useCallback } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────────────── */

export interface Column<T> {
  key:           string
  label:         string
  sortable?:     boolean
  sortKey?:      (item: T) => string | number | Date
  width?:        string
  align?:        'left' | 'center' | 'right'
  render:        (item: T) => React.ReactNode
  headerRender?: () => React.ReactNode
}

export interface GroupDef<T> {
  key:     string
  label:   string
  desc?:   string
  filter:  (item: T) => boolean
  color?:  string
}

export interface DataTableProps<T> {
  items:            T[]
  getRowId:         (item: T) => string
  columns:          Column<T>[]

  // Sorting (controlled)
  sortKey?:         string | null
  sortDir?:         'asc' | 'desc'
  onSort?:          (key: string) => void

  // Grouping
  groups?:          GroupDef<T>[]
  defaultCollapsed?: boolean

  // Row behavior
  onRowClick?:      (item: T) => void
  expandable?:      {
    canExpand:      (item: T) => boolean
    render:         (item: T) => React.ReactNode
  }

  // Toolbar slot
  toolbar?:         React.ReactNode

  // Empty state
  emptyIcon?:       string
  emptyTitle?:      string
  emptyMessage?:    string

  // Styling
  className?:       string
  compact?:         boolean
  stickyHeader?:    boolean
}

/* ── useTableSort hook ───────────────────────────────────────────────── */

export function useTableSort<T>(items: T[], columns: Column<T>[]) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const onSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return key
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const sorted = useMemo(() => {
    if (!sortKey) return items
    const col = columns.find(c => c.key === sortKey)
    if (!col?.sortKey) return items
    const accessor = col.sortKey
    return [...items].sort((a, b) => {
      const va = accessor(a)
      const vb = accessor(b)
      let cmp = 0
      if (va < vb) cmp = -1
      else if (va > vb) cmp = 1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [items, sortKey, sortDir, columns])

  return { sorted, sortKey, sortDir, onSort }
}

/* ── DataTable component ─────────────────────────────────────────────── */

export default function DataTable<T>({
  items,
  getRowId,
  columns,
  sortKey,
  sortDir,
  onSort,
  groups,
  defaultCollapsed = false,
  onRowClick,
  expandable,
  toolbar,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  className,
  compact = false,
  stickyHeader = false,
}: DataTableProps<T>) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    if (!defaultCollapsed || !groups) return new Set()
    return new Set(groups.map(g => g.key))
  })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const colCount = columns.length + (expandable ? 1 : 0)

  const toggleGroup = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  /* ── Header ── */
  const renderHeader = () => (
    <thead className={stickyHeader ? 'sticky top-0 z-10' : undefined}>
      <tr>
        {expandable && <th className="w-8"></th>}
        {columns.map(col => {
          const isSortable = col.sortable && onSort
          const isActive = sortKey === col.key
          const align = col.align ?? 'left'
          return (
            <th
              key={col.key}
              className={clsx(col.width, align === 'center' && 'text-center', align === 'right' && 'text-right')}
              data-sortable={isSortable ? '' : undefined}
              data-sort-active={isActive ? '' : undefined}
              onClick={isSortable ? () => onSort(col.key) : undefined}
            >
              {col.headerRender ? col.headerRender() : (
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {isSortable && isActive && (
                    sortDir === 'asc'
                      ? <ArrowUp className="w-3 h-3 opacity-60" />
                      : <ArrowDown className="w-3 h-3 opacity-60" />
                  )}
                  {isSortable && !isActive && (
                    <ArrowUp className="w-3 h-3 opacity-0 group-hover/th:opacity-30 transition-opacity" />
                  )}
                </span>
              )}
            </th>
          )
        })}
      </tr>
    </thead>
  )

  /* ── Data row ── */
  const renderRow = (item: T) => {
    const id = getRowId(item)
    const isExpandable = expandable?.canExpand(item)
    const isExpanded = expanded.has(id)
    const clickable = onRowClick || isExpandable

    return (
      <tr
        key={id}
        className={clsx('group/row', clickable && 'cursor-pointer')}
        onClick={() => {
          if (isExpandable) toggleExpand(id)
          else if (onRowClick) onRowClick(item)
        }}
      >
        {expandable && (
          <td className="w-8 px-2">
            {isExpandable && (
              isExpanded
                ? <ChevronDown className="w-3.5 h-3.5 text-ink-faint" />
                : <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />
            )}
          </td>
        )}
        {columns.map(col => (
          <td
            key={col.key}
            className={clsx(
              col.align === 'center' && 'text-center',
              col.align === 'right' && 'text-right',
            )}
          >
            {col.render(item)}
          </td>
        ))}
      </tr>
    )
  }

  /* ── Expanded content row ── */
  const renderExpandedContent = (item: T) => {
    const id = getRowId(item)
    if (!expandable || !expanded.has(id)) return null
    return (
      <tr key={`${id}-expand`} className="!border-b-0">
        <td colSpan={colCount} className="!p-0">
          <div className="animate-fade-in">
            {expandable.render(item)}
          </div>
        </td>
      </tr>
    )
  }

  /* ── Flat body (no groups) ── */
  const renderFlat = () => (
    <tbody>
      {items.map(item => (
        <>
          {renderRow(item)}
          {renderExpandedContent(item)}
        </>
      ))}
    </tbody>
  )

  /* ── Grouped body ── */
  const renderGrouped = () => {
    if (!groups) return renderFlat()
    return groups.map(group => {
      const groupItems = items.filter(group.filter)
      if (groupItems.length === 0) return null
      const isCollapsed = collapsed.has(group.key)
      const Chevron = isCollapsed ? ChevronRight : ChevronDown
      return (
        <tbody key={group.key}>
          <tr
            className="group-header"
            onClick={() => toggleGroup(group.key)}
          >
            <td
              colSpan={colCount}
              style={group.color ? { borderLeft: `3px solid ${group.color}` } : undefined}
            >
              <div className="flex items-center gap-2">
                <Chevron className="w-3.5 h-3.5 text-ink-muted" />
                <span className="font-semibold text-xs text-ink">{group.label}</span>
                <span className="text-[10px] text-ink-faint">({groupItems.length})</span>
                {group.desc && <span className="text-[10px] text-ink-faint ml-1">{group.desc}</span>}
              </div>
            </td>
          </tr>
          {!isCollapsed && groupItems.map(item => (
            <>
              {renderRow(item)}
              {renderExpandedContent(item)}
            </>
          ))}
        </tbody>
      )
    })
  }

  /* ── Empty state ── */
  const renderEmpty = () => (
    <tbody>
      <tr>
        <td colSpan={colCount} className="!py-12 text-center">
          {emptyIcon && <div className="text-3xl mb-2">{emptyIcon}</div>}
          {emptyTitle && <div className="text-[13px] font-semibold text-ink mb-1">{emptyTitle}</div>}
          <div className="text-xs text-ink-faint">{emptyMessage ?? 'No items to display.'}</div>
        </td>
      </tr>
    </tbody>
  )

  /* ── Render ── */
  return (
    <div className={clsx('table-wrap', compact && 'compact', className)}>
      {toolbar && <div className="card-header flex-wrap gap-3">{toolbar}</div>}
      <div className="overflow-x-auto">
        <table>
          {renderHeader()}
          {items.length === 0 ? renderEmpty() : groups ? renderGrouped() : renderFlat()}
        </table>
      </div>
    </div>
  )
}
