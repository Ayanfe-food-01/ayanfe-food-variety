import type { ReactNode } from 'react'
import { accountCardClassName, accountSectionLabelClassName } from './accountStyles'

interface AccountSectionProps {
  label: string
  action?: ReactNode
  children: ReactNode
}

export function AccountSection({ label, action, children }: AccountSectionProps) {
  return (
    <section className="flex h-full flex-col" aria-labelledby={`account-section-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2
          className={accountSectionLabelClassName}
          id={`account-section-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {label}
        </h2>
        {action}
      </div>
      <div className={`${accountCardClassName} mt-3 grow`}>{children}</div>
    </section>
  )
}