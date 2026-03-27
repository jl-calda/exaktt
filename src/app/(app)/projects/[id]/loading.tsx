export default function ProjectDetailLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 bg-surface-200 rounded" />
        <div className="h-6 w-48 bg-surface-200 rounded" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-6 w-20 bg-surface-200 rounded-full" />
        <div className="h-4 w-32 bg-surface-200 rounded" />
        <div className="h-4 w-24 bg-surface-200 rounded" />
      </div>
      <div className="card p-0">
        <div className="h-10 bg-surface-100 rounded-t-xl" />
        <div className="space-y-2 p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 bg-surface-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
