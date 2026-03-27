// src/components/projects/TeamPill.tsx
'use client'

interface Props {
  team?: { name: string; members?: { name?: string | null; avatarUrl?: string | null }[] } | null
  assignee?: { name?: string | null; avatarUrl?: string | null } | null
  assigneeName?: string | null
}

export default function TeamPill({ team, assignee, assigneeName }: Props) {
  const name = assignee?.name ?? assigneeName ?? team?.name
  if (!name) return null

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarUrl = assignee?.avatarUrl ?? null

  return (
    <div className="flex items-center gap-1 shrink-0" title={name + (team ? ` (${team.name})` : '')}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-4 h-4 rounded-full object-cover" />
      ) : (
        <div className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[7px] font-bold">
          {initials}
        </div>
      )}
      <span className="text-[10px] text-ink-faint truncate max-w-[60px]">{name.split(' ')[0]}</span>
    </div>
  )
}
