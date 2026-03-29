export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-surface-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-4 w-20 bg-surface-200 rounded" />
            <div className="h-8 w-16 bg-surface-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <div className="h-5 w-32 bg-surface-200 rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-200 rounded" />
          ))}
        </div>
        <div className="card p-5 space-y-4">
          <div className="h-5 w-32 bg-surface-200 rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
