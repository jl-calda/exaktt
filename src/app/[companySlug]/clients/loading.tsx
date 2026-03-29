export default function ClientsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-surface-200 rounded" />
        <div className="h-9 w-28 bg-surface-200 rounded" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-surface-200 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-surface-200 rounded" />
              <div className="h-3 w-1/4 bg-surface-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
