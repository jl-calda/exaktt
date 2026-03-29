export default function ProjectsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-surface-200 rounded" />
        <div className="h-9 w-28 bg-surface-200 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-4 w-16 bg-surface-200 rounded" />
            <div className="h-7 w-10 bg-surface-200 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-surface-200 rounded" />
              <div className="h-3 w-1/4 bg-surface-200 rounded" />
            </div>
            <div className="h-6 w-16 bg-surface-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
