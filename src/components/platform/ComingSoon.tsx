// src/components/platform/ComingSoon.tsx
interface Props {
  module:      string
  emoji:       string
  description: string
  color:       string
}

export default function ComingSoon({ module, emoji, description, color }: Props) {
  return (
    <div className="min-h-screen bg-surface-100">
      <main className="max-w-6xl mx-auto px-4 py-24 flex flex-col items-center text-center">
        <div className="text-7xl mb-6">{emoji}</div>
        <h1 className="font-display font-black text-3xl text-ink tracking-tight mb-3">{module}</h1>
        <p className="text-ink-muted text-base max-w-md mb-8">{description}</p>
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-surface-100 border border-surface-200"
          style={{ color }}>
          This module is in development — stay tuned.
        </div>
      </main>
    </div>
  )
}
