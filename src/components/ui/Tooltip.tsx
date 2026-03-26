// src/components/ui/Tooltip.tsx
export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <span className="relative group">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 bg-ink/90 backdrop-blur-md text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 shadow-lg z-50">
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink/90" />
      </span>
    </span>
  )
}
