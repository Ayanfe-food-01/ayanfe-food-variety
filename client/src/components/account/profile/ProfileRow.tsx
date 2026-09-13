import type { ReactNode } from 'react'
import { PencilIcon } from '../../../assets/icons'

interface ProfileRowProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  onEdit?: () => void
  editLabel?: string
}

export function ProfileRow({ label, value, hint, onEdit, editLabel }: ProfileRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
        <div className="mt-1 text-sm text-green-dark">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      </div>
      {onEdit && (
        <button
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sage/40 hover:text-green-dark focus:outline-none focus:ring-2 focus:ring-green/20"
          type="button"
          onClick={onEdit}
          aria-label={editLabel ?? `Edit ${label.toLowerCase()}`}
        >
          <PencilIcon size={17} />
        </button>
      )}
    </div>
  )
}