import type { ReactNode } from 'react'
import { AccountCard } from './AccountCard'

interface AccountSectionProps {
  label: string
  action?: ReactNode
  children: ReactNode
}

export function AccountSection({ label, action, children }: AccountSectionProps) {
  const sectionId = `account-section-${label.toLowerCase().replace(/\s+/g, '-')}`
  const header = (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange" id={sectionId}>
        {label}
      </h2>
      {action}
    </div>
  )

  return (
    <section aria-labelledby={sectionId}>
      <AccountCard header={header}>{children}</AccountCard>
    </section>
  )
}