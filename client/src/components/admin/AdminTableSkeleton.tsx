import type { CSSProperties } from 'react'

interface AdminTableSkeletonProps {
  desktopColumns?: number
  mobileDetails?: number
  rows?: number
  label?: string
}

const shimmerClass = 'block rounded-lg bg-[linear-gradient(90deg,var(--color-line)_20%,var(--color-sage)_50%,var(--color-line)_80%)] bg-[length:220%_100%] animate-admin-shimmer motion-reduce:animate-none'

export function AdminTableSkeleton({
  desktopColumns = 8,
  mobileDetails = 6,
  rows = 6,
  label = 'Loading',
}: AdminTableSkeletonProps) {
  const desktopColumnStyle = { '--admin-skeleton-cols': desktopColumns } as CSSProperties
  const headerColumns = desktopColumns + 2
  const bodyColumns = desktopColumns + 2

  return (
    <div className="p-5" role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-3 lg:hidden" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="rounded-2xl border border-line bg-cream/55 p-4" key={index}>
            <div className="flex min-w-0 items-start gap-3">
              <span className={`${shimmerClass} h-4 w-4 flex-none rounded-[3px] mt-[3px]`} />
              <span className={`${shimmerClass} size-16 flex-none rounded-xl`} />
              <span className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
                <span className={`${shimmerClass} h-[15px] w-[min(180px,80%)]`} />
                <span className={`${shimmerClass} h-[11px] w-[min(240px,95%)]`} />
                <span className={`${shimmerClass} h-[11px] w-[110px]`} />
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4">
              {Array.from({ length: mobileDetails }, (_, detailIndex) => (
                <span className="flex flex-col gap-[7px]" key={detailIndex}>
                  <span className={`${shimmerClass} h-[9px] w-[68px]`} />
                  <span className={`${shimmerClass} h-[13px] w-[92px]`} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block" aria-hidden="true">
        <div className="overflow-x-auto">
          <div className="min-w-[1120px]" style={desktopColumnStyle}>
            <div className="grid min-h-[52px] items-center gap-4 border-b border-line bg-sage/30 px-5 py-4 [grid-template-columns:24px_minmax(260px,2fr)_repeat(var(--admin-skeleton-cols,8),minmax(84px,1fr))]" style={desktopColumnStyle}>
              {Array.from({ length: headerColumns }, (_, index) => (
                <span className={`${shimmerClass} h-[10px] w-[66px] first:h-4 first:w-4`} key={index} />
              ))}
            </div>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div className="grid items-center gap-4 border-b border-line px-5 py-4 [grid-template-columns:24px_minmax(260px,2fr)_repeat(var(--admin-skeleton-cols,8),minmax(84px,1fr))]" style={desktopColumnStyle} key={rowIndex}>
                <span className={`${shimmerClass} h-4 w-4 flex-none rounded-[3px] mt-[3px]`} />
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`${shimmerClass} size-16 flex-none rounded-xl`} />
                  <span className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
                    <span className={`${shimmerClass} h-[15px] w-[min(180px,80%)]`} />
                    <span className={`${shimmerClass} h-[11px] w-[min(240px,95%)]`} />
                  </span>
                </span>
                {Array.from({ length: bodyColumns - 2 }, (_, cellIndex) => (
                  <span className={`${shimmerClass} h-[13px] w-[68px]`} key={cellIndex} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
