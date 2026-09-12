import type { ReactNode } from 'react'

interface SectionHeaderProps {
  eyebrow: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  headingId?: string
  as?: 'h1' | 'h2'
  className?: string
}

export function SectionHeader({ eyebrow, title, description, actions, headingId, as = 'h2', className = '' }: SectionHeaderProps) {
  const Heading = as
  return (
    <div className={`mb-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end ${className}`.trim()}>
      <div className="max-w-2xl">
        <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
          <span className="inline-block size-2 rounded-full bg-orange" aria-hidden="true" />
          {eyebrow}
        </p>
        <Heading id={headingId} className="m-0 text-4xl font-bold leading-tight tracking-[-0.05em] text-green-dark sm:text-5xl">
          {title}
        </Heading>
        {description && <p className="mt-4 text-base leading-7 text-muted">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  )
}