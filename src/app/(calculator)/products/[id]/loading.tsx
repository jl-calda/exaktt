export default function CalculatorLoading() {
  return (
    <div className="flex h-screen animate-pulse">
      <div className="w-full p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-surface-200 rounded" />
          <div className="h-6 w-48 bg-surface-200 rounded" />
        </div>
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 w-24 bg-surface-200 rounded" />
          ))}
        </div>
        <div className="card p-5 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
