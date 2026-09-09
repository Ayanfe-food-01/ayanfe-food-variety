interface AdminPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function AdminPagination({ currentPage, totalPages, onPageChange, className = '' }: AdminPaginationProps) {
  if (totalPages <= 1) return null

  const buttonClassName = 'rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`.trim()}>
      <button
        className={buttonClassName}
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      <span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span>
      <button
        className={buttonClassName}
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </div>
  )
}