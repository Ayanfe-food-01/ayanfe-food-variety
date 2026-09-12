import type { ReactNode } from 'react'
import { Breadcrumb, type BreadcrumbItem } from '../ui/Breadcrumb'

interface AdminPageHeaderProps {
  eyebrow: string
  title: string
  description?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  className?: string
}

export function AdminPageHeader({ eyebrow, title, description, breadcrumbs, actions, className = '' }: AdminPageHeaderProps) {
  return (
    <div className={`flex flex-col justify-between gap-5 sm:flex-row sm:items-end ${className}`.trim()}>
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumb className="mb-5" items={breadcrumbs} />}
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{title}</h1>
        {description && <div className="mt-3 text-sm text-muted">{description}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}