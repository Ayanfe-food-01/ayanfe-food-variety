import type { ReactNode } from 'react'

interface AccountCardProps {
  id?: string
  className?: string
  header?: ReactNode
  children: ReactNode
}

export function AccountCard({ id, className = '', header, children }: AccountCardProps) {
  return (
    <div id={id} className={`rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8 ${className}`}>
      {header}
      {children && <div className={header ? 'mt-5' : ''}>{children}</div>}
    </div>
  )
}