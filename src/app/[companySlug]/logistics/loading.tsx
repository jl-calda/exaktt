export default function LogisticsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="h-8 w-36 bg-surface-200 rounded" />
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-surface-200 rounded" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 h-16 bg-surface-200 rounded" />
        ))}
      </div>
    </div>
  )
}
