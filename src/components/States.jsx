export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden" aria-hidden="true">
      <div className="skeleton aspect-square w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 rounded w-3/4" />
        <div className="skeleton h-4 rounded w-1/2" />
        <div className="skeleton h-9 rounded-lg w-full" />
      </div>
    </div>
  )
}
export function SectionError({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 flex flex-wrap items-center justify-between gap-3" role="alert">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="min-h-[44px] px-4 rounded-lg bg-red-600 text-white font-medium">আবার চেষ্টা করুন / Retry</button>}
    </div>
  )
}
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-surface/60 p-8 text-center">
      {Icon && <Icon className="h-10 w-10 mx-auto text-muted mb-3" />}
      <p className="font-semibold text-lg">{title}</p>
      {text && <p className="text-muted text-sm mt-1">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
