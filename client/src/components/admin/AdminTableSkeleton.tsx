import type { CSSProperties } from 'react'

interface AdminTableSkeletonProps {
  desktopColumns?: number
  mobileDetails?: number
  rows?: number
  label?: string
}

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
    <div className="admin-list-loading" role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="admin-list-skeleton-mobile" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="admin-list-skeleton-card" key={index}>
            <div className="admin-list-skeleton-card-header">
              <span className="admin-list-skeleton-block admin-list-skeleton-checkbox" />
              <span className="admin-list-skeleton-block admin-list-skeleton-image" />
              <span className="admin-list-skeleton-copy">
                <span className="admin-list-skeleton-block admin-list-skeleton-title" />
                <span className="admin-list-skeleton-block admin-list-skeleton-description" />
                <span className="admin-list-skeleton-block admin-list-skeleton-category" />
              </span>
            </div>
            <div className="admin-list-skeleton-details">
              {Array.from({ length: mobileDetails }, (_, detailIndex) => (
                <span className="admin-list-skeleton-detail" key={detailIndex}>
                  <span className="admin-list-skeleton-block admin-list-skeleton-label" />
                  <span className="admin-list-skeleton-block admin-list-skeleton-value" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-list-skeleton-desktop" aria-hidden="true">
        <div className="admin-list-skeleton-table">
          <div className="admin-list-skeleton-table-row admin-list-skeleton-table-header" style={desktopColumnStyle}>
            {Array.from({ length: headerColumns }, (_, index) => (
              <span className="admin-list-skeleton-block" key={index} />
            ))}
          </div>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div className="admin-list-skeleton-table-row" style={desktopColumnStyle} key={rowIndex}>
              <span className="admin-list-skeleton-block admin-list-skeleton-checkbox" />
              <span className="admin-list-skeleton-product">
                <span className="admin-list-skeleton-block admin-list-skeleton-image" />
                <span className="admin-list-skeleton-copy">
                  <span className="admin-list-skeleton-block admin-list-skeleton-title" />
                  <span className="admin-list-skeleton-block admin-list-skeleton-description" />
                </span>
              </span>
              {Array.from({ length: bodyColumns - 2 }, (_, cellIndex) => (
                <span className="admin-list-skeleton-block admin-list-skeleton-cell" key={cellIndex} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}