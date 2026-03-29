'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, ArrowUpRight } from 'lucide-react'
import { useTaskStore } from '@/store'
import TaskList from './TaskList'
import TaskDetail from './TaskDetail'
import TaskForm from './TaskForm'
import { Button } from '@/components/ui/Button'

type DrawerTab = 'linked' | 'all'

export default function TaskDrawer() {
  const router = useRouter()
  const { drawerOpen, closeDrawer, activeTaskId, setActiveTask, linkedFilter, createMode, linkedLabel: storeLinkedLabel } = useTaskStore()
  const [creating, setCreating] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [allTasks, setAllTasks] = useState<any[]>([])
  const [drawerTab, setDrawerTab] = useState<DrawerTab>(linkedFilter ? 'linked' : 'all')

  // Reset tab when drawer opens with different filter; auto-open create mode
  useEffect(() => {
    if (drawerOpen) {
      setDrawerTab(linkedFilter ? 'linked' : 'all')
      if (createMode) setCreating(true)
    }
  }, [drawerOpen, linkedFilter, createMode])

  // Fetch linked tasks
  useEffect(() => {
    if (!drawerOpen) return
    if (linkedFilter) {
      fetch(`/api/tasks?linkedUrl=${encodeURIComponent(linkedFilter)}`)
        .then(r => r.json()).then(j => { if (j.data) setTasks(j.data) })
    }
    // Always fetch all tasks too
    fetch('/api/tasks').then(r => r.json()).then(j => { if (j.data) setAllTasks(j.data) })
  }, [drawerOpen, linkedFilter])

  const refresh = () => {
    if (linkedFilter) {
      fetch(`/api/tasks?linkedUrl=${encodeURIComponent(linkedFilter)}`)
        .then(r => r.json()).then(j => { if (j.data) setTasks(j.data) })
    }
    fetch('/api/tasks').then(r => r.json()).then(j => { if (j.data) setAllTasks(j.data) })
  }

  if (!drawerOpen) return null

  const displayTasks = drawerTab === 'linked' ? tasks : allTasks
  const linkedLabel = linkedFilter
    ? linkedFilter.includes('/report/') ? 'This Report'
    : linkedFilter.includes('/tenders/') ? 'This Tender'
    : linkedFilter.includes('/products/') ? 'This Product'
    : 'This Page'
    : null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={closeDrawer} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-surface border-l border-surface-200 shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="card-header">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-ink">Tasks</span>
          </div>
          <div className="flex gap-2">
            <Button size="xs" variant="primary" icon={<Plus className="w-3 h-3" />} onClick={() => { setCreating(true); setActiveTask(null) }}>New</Button>
            <button onClick={() => { closeDrawer(); router.push('/tasks') }} title="Open Tasks page" className="p-1.5 rounded text-ink-faint hover:text-ink hover:bg-surface-100"><ArrowUpRight className="w-4 h-4" /></button>
            <button onClick={closeDrawer} className="p-1.5 rounded text-ink-faint hover:text-ink hover:bg-surface-100"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Tabs — only show when there's a linked filter and not creating/viewing */}
        {linkedFilter && !creating && !activeTaskId && (
          <div className="flex border-b border-surface-200">
            <button onClick={() => setDrawerTab('linked')}
              className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${
                drawerTab === 'linked' ? 'text-primary border-b-2 border-primary' : 'text-ink-muted hover:text-ink'
              }`}>
              {linkedLabel} <span className="text-ink-faint">({tasks.length})</span>
            </button>
            <button onClick={() => setDrawerTab('all')}
              className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${
                drawerTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-ink-muted hover:text-ink'
              }`}>
              All Tasks <span className="text-ink-faint">({allTasks.length})</span>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {creating ? (
            <TaskForm linkedUrl={linkedFilter} linkedLabel={storeLinkedLabel} onSave={() => { setCreating(false); refresh() }} onCancel={() => setCreating(false)} />
          ) : activeTaskId ? (
            <TaskDetail taskId={activeTaskId} onBack={() => setActiveTask(null)} onRefresh={refresh} />
          ) : (
            <TaskList tasks={displayTasks} onSelect={(id) => setActiveTask(id)} />
          )}
        </div>
      </div>
    </>
  )
}
