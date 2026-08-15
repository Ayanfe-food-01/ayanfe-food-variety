import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav className={`flex flex-wrap items-center gap-2 text-xs font-medium text-muted ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1

        return (
          <span className="contents" key={`${item.label}-${index}`}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href && !isCurrent ? (
              <Link className="transition-colors hover:text-green" to={item.href}>{item.label}</Link>
            ) : (
              <span className={isCurrent ? 'font-semibold text-green-dark' : undefined} aria-current={isCurrent ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

interface PublicBreadcrumbProps {
  items: BreadcrumbItem[]
}

export function PublicBreadcrumb({ items }: PublicBreadcrumbProps) {
  return (
    <div className="border-b border-line/70 bg-white">
      <div className="container py-4 sm:py-5">
        <Breadcrumb items={items} />
      </div>
    </div>
  )
}