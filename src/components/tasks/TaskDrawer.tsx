'use client'
import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { useTaskStore } from '@/store'
import TaskList from './TaskList'
import TaskDetail from './TaskDetail'
import TaskForm from './TaskForm'
import { Button } from '@/components/ui/Button'

export default function TaskDrawer() {
  const { drawerOpen, closeDrawer, activeTaskId, setActiveTask, filter, linkedFilter } = useTaskStore()
  const [creating, setCreating] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])

  useEffect(() => {
    if (!drawerOpen) return
    const params = new URLSearchParams()
    if (linkedFilter) params.set('linkedUrl', linkedFilter)
    fetch(`/api/tasks?${params}`).then(r => r.json()).then(j => { if (j.data) setTasks(j.data) })
  }, [drawerOpen, linkedFilter])

  const refresh = () => {
    const params = new URLSearchParams()
    if (linkedFilter) params.set('linkedUrl', linkedFilter)
    fetch(`/api/tasks?${params}`).then(r => r.json()).then(j => { if (j.data) setTasks(j.data) })
  }

  if (!drawerOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={closeDrawer} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-surface border-l border-surface-200 shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-ink">Tasks</span>
            <span className="text-[10px] text-ink-faint">({tasks.length})</span>
          </div>
          <div className="flex gap-2">
            <Button size="xs" variant="primary" icon={<Plus className="w-3 h-3" />} onClick={() => { setCreating(true); setActiveTask(null) }}>New</Button>
            <button onClick={closeDrawer} className="p-1.5 rounded text-ink-faint hover:text-ink hover:bg-surface-100"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {creating ? (
            <TaskForm linkedUrl={linkedFilter} onSave={() => { setCreating(false); refresh() }} onCancel={() => setCreating(false)} />
          ) : activeTaskId ? (
            <TaskDetail taskId={activeTaskId} onBack={() => setActiveTask(null)} onRefresh={refresh} />
          ) : (
            <TaskList tasks={tasks} onSelect={(id) => setActiveTask(id)} />
          )}
        </div>
      </div>
    </>
  )
}
