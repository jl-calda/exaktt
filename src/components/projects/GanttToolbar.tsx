// src/components/projects/GanttToolbar.tsx
'use client'
import { Plus, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const VIEW_MODES = [
  { value: 'days',   label: 'Days' },
  { value: 'weeks',  label: 'Weeks' },
  { value: 'months', label: 'Months' },
] as const

interface Props {
  viewMode: 'days' | 'weeks' | 'months'
  onViewModeChange: (mode: 'days' | 'weeks' | 'months') => void
  onAddMilestone?: () => void
  onCollapseAll: () => void
  onExpandAll: () => void
  showCriticalPath?: boolean
  onToggleCriticalPath?: () => void
}

export default function GanttToolbar({ viewMode, onViewModeChange, onAddMilestone, onCollapseAll, onExpandAll, showCriticalPath, onToggleCriticalPath }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* View mode toggle */}
      <div className="tab-bar">
        {VIEW_MODES.map(m => (
          <button key={m.value}
            className={`tab-pill ${viewMode === m.value ? 'active' : ''}`}
            onClick={() => onViewModeChange(m.value)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Critical Path toggle */}
      {onToggleCriticalPath && (
        <Button
          variant={showCriticalPath ? 'primary' : 'ghost'}
          size="xs"
          onClick={onToggleCriticalPath}
        >
          Critical Path
        </Button>
      )}

      {/* Collapse/Expand */}
      <Button variant="ghost" size="xs" onClick={onCollapseAll}
        icon={<ChevronsDownUp className="w-3 h-3" />}
        title="Collapse all" />
      <Button variant="ghost" size="xs" onClick={onExpandAll}
        icon={<ChevronsUpDown className="w-3 h-3" />}
        title="Expand all" />

      {/* Add milestone */}
      {onAddMilestone && (
        <Button variant="primary" size="xs" onClick={onAddMilestone}
          icon={<Plus className="w-3 h-3" />}>
          Milestone
        </Button>
      )}
    </div>
  )
}
