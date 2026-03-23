// src/components/ui/Tooltip.tsx
export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <span className="relative group">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-ink text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink" />
      </span>
    </span>
  )
}
