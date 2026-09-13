import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '../../../assets/icons'

interface DisclosureRowProps {
  icon: ReactNode
  label: string
  description?: string
  danger?: boolean
  chevron?: boolean
  to?: string
  onClick?: () => void
}

const rowClassName = (danger: boolean) =>
  `flex w-full items-center gap-4 px-1 py-4 text-left first:pt-1 last:pb-1 transition-colors ${
    danger ? 'text-orange hover:text-orange' : 'text-green-dark hover:text-ink'
  }`

const iconClassName = (danger: boolean) =>
  `grid size-9 shrink-0 place-items-center rounded-full ${
    danger ? 'bg-orange/10 text-orange' : 'bg-sage/60 text-green'
  }`

export function DisclosureRow({ icon, label, description, danger = false, chevron = true, to, onClick }: DisclosureRowProps) {
  const content = (
    <>
      <span className={iconClassName(danger)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-bold ${danger ? 'text-orange' : 'text-green-dark'}`}>{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span>}
      </span>
      {chevron && (
        <span className={`shrink-0 ${danger ? 'text-orange/60' : 'text-muted'}`}>
          <ChevronRightIcon size={17} />
        </span>
      )}
    </>
  )

  if (to) {
    return (
      <Link className={rowClassName(danger)} to={to}>
        {content}
      </Link>
    )
  }
  return (
    <button className={rowClassName(danger)} type="button" onClick={onClick}>
      {content}
    </button>
  )
}