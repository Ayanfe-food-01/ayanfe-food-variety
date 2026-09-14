const cardClass = 'rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8'

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
            <span className="admin-list-skeleton-block h-6 w-40" />
            <span className="admin-list-skeleton-block mt-2 block h-3 max-w-xs" />
            <span className="admin-list-skeleton-block h-12 w-full" />
            <div className="grid gap-5 sm:grid-cols-2">
              <span className="admin-list-skeleton-block h-12 w-full" />
              <span className="admin-list-skeleton-block h-12 w-full" />
            </div>
            <span className="admin-list-skeleton-block h-32 w-full" />
          </div>
        </div>
        <div className={cardClass}>
          <div className="space-y-5" aria-hidden="true">
            <span className="admin-list-skeleton-block h-6 w-40" />
            <span className="admin-list-skeleton-block mt-2 block h-3 max-w-xs" />
            <span className="admin-list-skeleton-block h-40 w-full" />
            <span className="admin-list-skeleton-block h-16 w-full" />
          </div>
        </div>
        <div className={cardClass}>
          <div className="space-y-5" aria-hidden="true">
            <span className="admin-list-skeleton-block h-6 w-40" />
            <span className="admin-list-skeleton-block mt-2 block h-3 max-w-xs" />
            <div className="grid gap-5 sm:grid-cols-2">
              <span className="admin-list-skeleton-block h-12 w-full" />
              <span className="admin-list-skeleton-block h-12 w-full" />
            </div>
            <span className="admin-list-skeleton-block h-32 w-full" />
          </div>
        </div>
        <div className={cardClass}>
          <div className="space-y-5" aria-hidden="true">
            <span className="admin-list-skeleton-block h-6 w-40" />
            <span className="admin-list-skeleton-block mt-2 block h-3 max-w-xs" />
            <div className="grid gap-5 sm:grid-cols-2">
              <span className="admin-list-skeleton-block h-20 w-full" />
              <span className="admin-list-skeleton-block h-20 w-full" />
            </div>
            <span className="admin-list-skeleton-block h-10 w-full" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-1" aria-hidden="true">
        <span className="admin-list-skeleton-block h-11 w-24" />
        <span className="admin-list-skeleton-block h-11 w-32" />
      </div>
    </div>
  )
}