// src/app/(app)/tasks/[id]/TaskPageClient.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import {
  ArrowLeft, Check, X, Send, Clock,
  CheckCircle2, Circle, AlertTriangle, Link as LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

/* ── Status config ── */
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  open:        { label: 'To Do',       color: '#64748b', bg: 'bg-surface-100 text-ink-muted' },
  in_progress: { label: 'In Progress', color: '#2563eb', bg: 'bg-blue-100 text-blue-700' },
  submitted:   { label: 'Submitted',   color: '#d97706', bg: 'bg-amber-100 text-amber-700' },
  approved:    { label: 'Done',        color: '#16a34a', bg: 'bg-emerald-100 text-emerald-700' },
  rejected:    { label: 'Rejected',    color: '#dc2626', bg: 'bg-red-100 text-red-700' },
}

const STEPS = ['open', 'in_progress', 'submitted', 'approved'] as const

const PRIORITY_LABELS: Record<string, { label: string; class: string }> = {
  low:    { label: 'Low',    class: 'text-ink-faint' },
  medium: { label: 'Medium', class: 'text-ink-muted' },
  high:   { label: 'High',   class: 'text-amber-600' },
  urgent: { label: 'Urgent', class: 'text-red-600' },
}

interface Props { taskId: string; userId: string }

export default function TaskPageClient({ taskId, userId }: Props) {
  const router = useRouter()
  const [task, setTask] = useState<any>(null)
  const [comment, setComment] = useState('')
  const [outputText, setOutputText] = useState('')
  const [sending, setSending] = useState(false)

  const fetchTask = useCallback(() => {
    fetch(`/api/tasks/${taskId}`).then(r => r.json()).then(j => { if (j.data) setTask(j.data) })
  }, [taskId])

  useEffect(() => { fetchTask() }, [fetchTask])

  const updateStatus = async (status: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchTask()
  }

  const toggleChecklist = async (itemId: string) => {
    if (!task) return
    const checklist = (task.checklist ?? []).map((c: any) =>
      c.id === itemId ? { ...c, checked: !c.checked } : c
    )
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist }),
    })
    fetchTask()
  }

  const submitOutput = async () => {
    if (!outputText.trim()) return
    setSending(true)
    const output = [...(task?.output ?? []), { id: nanoid(), type: 'text', content: outputText }]
    await fetch(`/api/tasks/${taskId}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ output }),
    })
    setOutputText('')
    setSending(false)
    fetchTask()
  }

  const approve = async () => {
    await fetch(`/api/tasks/${taskId}/approve`, { method: 'POST' })
    fetchTask()
  }

  const reject = async () => {
    const reason = window.prompt('Reason for rejection:')
    if (!reason) return
    await fetch(`/api/tasks/${taskId}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    fetchTask()
  }

  const addComment = async () => {
    if (!comment.trim()) return
    await fetch(`/api/tasks/${taskId}/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    })
    setComment('')
    fetchTask()
  }

  if (!task) {
    return (
      <main className="flex flex-col flex-1 px-4 py-4 md:px-6 md:py-5 max-w-3xl">
        <div className="py-16 text-center text-sm text-ink-faint">Loading...</div>
      </main>
    )
  }

  const isAssignee = task.assigneeId === userId
  const isCreator = task.createdById === userId
  const checklist = task.checklist ?? []
  const checklistDone = checklist.filter((c: any) => c.checked).length
  const outputs = task.output ?? []
  const comments = task.comments ?? []
  const currentStepIdx = STEPS.indexOf(task.status === 'rejected' ? 'in_progress' : task.status)
  const pri = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS.medium

  return (
    <main className="flex flex-col flex-1 px-4 py-4 md:px-6 md:py-5 max-w-3xl">
      {/* Back */}
      <button onClick={() => router.push('/tasks')}
        className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink mb-4 w-fit">
        <ArrowLeft className="w-3 h-3" /> Back to Tasks
      </button>

      {/* Header card */}
      <div className="card mb-4">
        <div className="px-4 py-4">
          {/* Status + Priority */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_META[task.status]?.bg ?? ''}`}>
              {STATUS_META[task.status]?.label ?? task.status}
            </span>
            <span className={`text-[10px] font-semibold ${pri.class} flex items-center gap-0.5`}>
              {(task.priority === 'high' || task.priority === 'urgent') && <AlertTriangle className="w-2.5 h-2.5" />}
              {pri.label}
            </span>
            {task.linkedUrl && (
              <a href={task.linkedUrl} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                <LinkIcon className="w-2.5 h-2.5" />
                {task.linkedLabel || 'Linked page'}
              </a>
            )}
          </div>

          {/* Title */}
          <h1 className="font-semibold text-base text-ink">{task.title}</h1>
          {task.description && <p className="text-xs text-ink-muted mt-1.5">{task.description}</p>}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-ink-faint flex-wrap">
            <span>From: <span className="text-ink-muted font-medium">{task.createdBy?.name ?? 'Unknown'}</span></span>
            <span>To: <span className="text-ink-muted font-medium">{task.assignee?.name ?? 'Unassigned'}</span></span>
            {(task.startDate || task.targetDate) && (
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {task.startDate && task.targetDate ? (
                  <><span className="text-ink-muted font-medium">{format(new Date(task.startDate), 'dd MMM')}</span> – <span className="text-ink-muted font-medium">{format(new Date(task.targetDate), 'dd MMM yyyy')}</span></>
                ) : task.targetDate ? (
                  <>Due: <span className="text-ink-muted font-medium">{format(new Date(task.targetDate), 'dd MMM yyyy')}</span></>
                ) : (
                  <>Start: <span className="text-ink-muted font-medium">{format(new Date(task.startDate), 'dd MMM yyyy')}</span></>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Status flow */}
        <div className="px-4 py-3 border-t border-surface-200/60">
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
              const meta = STATUS_META[step]
              const isDone = i < currentStepIdx
              const isCurrent = i === currentStepIdx
              return (
                <div key={step} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                      isDone ? 'border-emerald-500 bg-emerald-500'
                        : isCurrent ? `border-current bg-surface-50` : 'border-surface-300 bg-surface-50'
                    }`} style={isCurrent ? { borderColor: meta.color, color: meta.color } : {}}>
                      {isDone ? <Check className="w-3 h-3 text-white" /> : isCurrent ? <Circle className="w-2 h-2 fill-current" /> : null}
                    </div>
                    <span className={`text-[9px] font-medium ${isCurrent ? 'text-ink' : isDone ? 'text-emerald-600' : 'text-ink-faint'}`}>
                      {meta.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 w-full -mt-4 ${isDone ? 'bg-emerald-500' : 'bg-surface-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Rejected notice */}
          {task.status === 'rejected' && (
            <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              This task was rejected. Please rework and resubmit.
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {task.status === 'open' && isAssignee && (
              <Button size="xs" variant="primary" onClick={() => updateStatus('in_progress')}>Start Working</Button>
            )}
            {task.status === 'rejected' && isAssignee && (
              <Button size="xs" variant="primary" onClick={() => updateStatus('in_progress')}>Rework</Button>
            )}
            {task.status === 'submitted' && isCreator && (
              <>
                <Button size="xs" variant="primary" icon={<Check className="w-3 h-3" />} onClick={approve}>Approve</Button>
                <Button size="xs" variant="danger" icon={<X className="w-3 h-3" />} onClick={reject}>Reject</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Linked Source */}
      {(task.linkedUrl || task.metadata) && (
        <div className="card mb-4">
          <div className="card-header">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wide">Linked Source</span>
          </div>
          <div className="px-4 py-3">
            {task.linkedUrl && (
              <a href={task.linkedUrl}
                className="flex items-center gap-2 text-xs text-primary hover:underline font-medium">
                <LinkIcon className="w-3 h-3" />
                {task.linkedLabel || 'View linked page'}
              </a>
            )}
            {task.metadata?.source === 'activity' && (
              <div className="flex items-center gap-3 mt-2 text-[10px] text-ink-faint flex-wrap">
                {task.metadata.estimatedHours != null && (
                  <span>Est: <span className="text-ink-muted font-medium">{task.metadata.estimatedHours}h</span></span>
                )}
                {task.metadata.skills?.length > 0 && (
                  <span>Skills: <span className="text-ink-muted font-medium">{task.metadata.skills.join(', ')}</span></span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wide">Checklist</span>
            <span className="text-[10px] text-ink-faint font-mono">{checklistDone}/{checklist.length}</span>
          </div>
          <div className="px-4 py-2">
            {/* Progress bar */}
            <div className="h-1.5 bg-surface-200 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: checklist.length > 0 ? `${(checklistDone / checklist.length) * 100}%` : '0%' }} />
            </div>
            {checklist.map((item: any) => (
              <label key={item.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                <input type="checkbox" checked={item.checked}
                  onChange={() => toggleChecklist(item.id)}
                  className="w-3.5 h-3.5 rounded border-surface-300 text-primary accent-primary" />
                <span className={`text-xs transition-colors ${item.checked ? 'line-through text-ink-faint' : 'text-ink'}`}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Output */}
      <div className="card mb-4">
        <div className="card-header">
          <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wide">Output</span>
          {outputs.length > 0 && <span className="text-[10px] text-ink-faint font-mono">{outputs.length}</span>}
        </div>
        <div className="px-4 py-3">
          {outputs.length > 0 ? (
            <div className="space-y-2 mb-3">
              {outputs.map((o: any) => (
                <div key={o.id} className="p-2.5 bg-surface-100/60 border border-surface-200/60 rounded-lg text-xs text-ink">
                  {o.type === 'text' && o.content}
                  {o.type === 'file' && <a href={o.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">{o.fileName}</a>}
                  {o.type === 'link' && <a href={o.linkedUrl} target="_blank" rel="noreferrer" className="text-primary underline">{o.linkedUrl}</a>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-faint mb-3">No output submitted yet.</p>
          )}

          {/* Submit output form */}
          {task.status === 'in_progress' && isAssignee && (
            <div className="border-t border-surface-200/60 pt-3">
              <textarea className="input text-xs resize-none w-full" rows={2} value={outputText}
                onChange={e => setOutputText(e.target.value)}
                placeholder="Describe your output or deliverables..." />
              <Button size="xs" variant="primary" className="mt-2" loading={sending}
                icon={<Send className="w-3 h-3" />} onClick={submitOutput}
                disabled={!outputText.trim()}>
                Submit for Approval
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="card">
        <div className="card-header">
          <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wide">Comments</span>
          <span className="text-[10px] text-ink-faint font-mono">{comments.length}</span>
        </div>
        <div className="px-4 py-3">
          {comments.length > 0 ? (
            <div className="space-y-3 mb-3">
              {comments.map((c: any) => (
                <div key={c.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink">{c.user?.name ?? 'Unknown'}</span>
                    <span className="text-[10px] text-ink-faint">{format(new Date(c.createdAt), 'dd MMM HH:mm')}</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">{c.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-faint mb-3">No comments yet.</p>
          )}

          {/* Add comment */}
          <div className="flex gap-2">
            <input className="input text-xs flex-1" value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              onKeyDown={e => { if (e.key === 'Enter') addComment() }} />
            <Button size="xs" variant="secondary" onClick={addComment}
              disabled={!comment.trim()} icon={<Send className="w-3 h-3" />} />
          </div>
        </div>
      </div>
    </main>
  )
}
