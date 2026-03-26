'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import { ArrowLeft, Check, X, Send, Upload, Link as LinkIcon, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-surface-100 text-ink-muted', in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
}

interface Props { taskId: string; onBack: () => void; onRefresh: () => void }

export default function TaskDetail({ taskId, onBack, onRefresh }: Props) {
  const [task, setTask] = useState<any>(null)
  const [comment, setComment] = useState('')
  const [outputText, setOutputText] = useState('')

  useEffect(() => { fetchTask() }, [taskId])

  const fetchTask = () => fetch(`/api/tasks/${taskId}`).then(r => r.json()).then(j => { if (j.data) setTask(j.data) })

  const updateStatus = async (status: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    fetchTask(); onRefresh()
  }

  const toggleChecklist = async (itemId: string) => {
    if (!task) return
    const checklist = (task.checklist ?? []).map((c: any) => c.id === itemId ? { ...c, checked: !c.checked } : c)
    await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checklist }) })
    fetchTask()
  }

  const addComment = async () => {
    if (!comment.trim()) return
    await fetch(`/api/tasks/${taskId}/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: comment }) })
    setComment(''); fetchTask()
  }

  const submitOutput = async () => {
    if (!outputText.trim()) return
    const output = [...(task?.output ?? []), { id: nanoid(), type: 'text', content: outputText }]
    await fetch(`/api/tasks/${taskId}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ output }) })
    setOutputText(''); fetchTask(); onRefresh()
  }

  const approve = async () => {
    await fetch(`/api/tasks/${taskId}/approve`, { method: 'POST' })
    fetchTask(); onRefresh()
  }

  const reject = async () => {
    const reason = window.prompt('Reason for rejection:')
    if (!reason) return
    await fetch(`/api/tasks/${taskId}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) })
    fetchTask(); onRefresh()
  }

  if (!task) return <div className="p-8 text-center text-sm text-ink-faint">Loading...</div>

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="card-header flex-col !items-start">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink mb-2"><ArrowLeft className="w-3 h-3" /> Back</button>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>{task.status.replace('_', ' ')}</span>
          <span className="text-[10px] text-ink-faint capitalize">{task.priority}</span>
        </div>
        <h3 className="font-semibold text-sm text-ink mt-1">{task.title}</h3>
        {task.description && <p className="text-xs text-ink-muted mt-1">{task.description}</p>}
        <div className="text-[10px] text-ink-faint mt-2 space-x-3">
          <span>From: {task.createdBy?.name}</span>
          <span>To: {task.assignee?.name}</span>
          {task.targetDate && <span>Due: {format(new Date(task.targetDate), 'dd MMM yyyy')}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Status actions */}
        <div className="flex gap-2 flex-wrap">
          {task.status === 'open' && <Button size="xs" variant="primary" onClick={() => updateStatus('in_progress')}>Start</Button>}
          {task.status === 'rejected' && <Button size="xs" variant="primary" onClick={() => updateStatus('in_progress')}>Rework</Button>}
          {task.status === 'submitted' && (
            <>
              <Button size="xs" variant="primary" icon={<Check className="w-3 h-3" />} onClick={approve}>Approve</Button>
              <Button size="xs" variant="danger" icon={<X className="w-3 h-3" />} onClick={reject}>Reject</Button>
            </>
          )}
        </div>

        {/* Checklist */}
        {(task.checklist ?? []).length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Checklist</div>
            {task.checklist.map((item: any) => (
              <label key={item.id} className="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" checked={item.checked} onChange={() => toggleChecklist(item.id)}
                  className="w-3.5 h-3.5 rounded border-surface-300 text-primary" />
                <span className={`text-xs ${item.checked ? 'line-through text-ink-faint' : 'text-ink'}`}>{item.text}</span>
              </label>
            ))}
          </div>
        )}

        {/* Output */}
        {(task.output ?? []).length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Output</div>
            {task.output.map((o: any) => (
              <div key={o.id} className="p-2 bg-surface-50 border border-surface-200 rounded text-xs text-ink mb-1">
                {o.type === 'text' && o.content}
                {o.type === 'file' && <a href={o.fileUrl} target="_blank" className="text-primary underline">{o.fileName}</a>}
                {o.type === 'link' && <a href={o.linkedUrl} className="text-primary underline">{o.linkedUrl}</a>}
              </div>
            ))}
          </div>
        )}

        {/* Submit output (assignee only, when in_progress) */}
        {task.status === 'in_progress' && (
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Submit Output</div>
            <textarea className="input text-xs resize-none w-full" rows={2} value={outputText}
              onChange={e => setOutputText(e.target.value)} placeholder="Describe your output..." />
            <Button size="xs" variant="primary" className="mt-1" icon={<Send className="w-3 h-3" />} onClick={submitOutput}>Submit for Approval</Button>
          </div>
        )}

        {/* Comments */}
        <div>
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wide mb-1">Comments ({(task.comments ?? []).length})</div>
          <div className="space-y-2 mb-2">
            {(task.comments ?? []).map((c: any) => (
              <div key={c.id} className="text-xs">
                <span className="font-semibold text-ink">{c.user?.name}</span>
                <span className="text-ink-faint ml-2">{format(new Date(c.createdAt), 'dd MMM HH:mm')}</span>
                <p className="text-ink mt-0.5">{c.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input text-xs flex-1" value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..." onKeyDown={e => { if (e.key === 'Enter') addComment() }} />
            <Button size="xs" variant="secondary" onClick={addComment} icon={<Send className="w-3 h-3" />} />
          </div>
        </div>
      </div>
    </div>
  )
}
