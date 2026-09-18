const cardClass = 'rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8'
const shimmerClass = 'block rounded-lg bg-[linear-gradient(90deg,var(--color-line)_20%,var(--color-sage)_50%,var(--color-line)_80%)] bg-[length:220%_100%] animate-admin-shimmer motion-reduce:animate-none'

interface ProductFormSkeletonProps {
  isEditing: boolean
}

export function ProductFormSkeleton({ isEditing }: ProductFormSkeletonProps) {
  const label = isEditing ? 'Loading product details' : 'Loading product form'
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cardClass}>
          <div className="space-y-5" aria-hidden="true">
            <span className={`${shimmerClass} h-6 w-40`} />
            <span className={`${shimmerClass} mt-2 block h-3 max-w-xs`} />
            <span className={`${shimmerClass} h-12 w-full`} />
            <div className="grid gap-5 sm:grid-cols-2">
              <span className={`${shimmerClass} h-12 w-full`} />
              <span className={`${shimmerClass} h-12 w-full`} />
            </div>
            <span className={`${shimmerClass} h-32 w-full`} />
          </div>
        </div>
        <div className={cardClass}>
          <div className="space-y-5" aria-hidden="true">
            <span className={`${shimmerClass} h-6 w-40`} />
            <span className={`${shimmerClass} mt-2 block h-3 max-w-xs`} />
            <span className={`${shimmerClass} h-40 w-full`} />
            <span className={`${shimmerClass} h-16 w-full`} />
          </div>
        </div>
        <div className={cardClass}>
          <div className="space-y-5" aria-hidden="true">
            <span className={`${shimmerClass} h-6 w-40`} />
            <span className={`${shimmerClass} mt-2 block h-3 max-w-xs`} />
            <div className="grid gap-5 sm:grid-cols-2">
              <span className={`${shimmerClass} h-12 w-full`} />
              <span className={`${shimmerClass} h-12 w-full`} />
            </div>
            <span className={`${shimmerClass} h-32 w-full`} />
          </div>
        </div>
        <div className={cardClass}>
          <div className="space-y-5" aria-hidden="true">
            <span className={`${shimmerClass} h-6 w-40`} />
            <span className={`${shimmerClass} mt-2 block h-3 max-w-xs`} />
            <div className="grid gap-5 sm:grid-cols-2">
              <span className={`${shimmerClass} h-20 w-full`} />
              <span className={`${shimmerClass} h-20 w-full`} />
            </div>
            <span className={`${shimmerClass} h-10 w-full`} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-1" aria-hidden="true">
        <span className={`${shimmerClass} h-11 w-24`} />
        <span className={`${shimmerClass} h-11 w-32`} />
      </div>
    </div>
  )
}