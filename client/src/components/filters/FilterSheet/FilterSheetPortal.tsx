import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface FilterSheetPortalProps {
  children: ReactNode
}

export function FilterSheetPortal({ children }: FilterSheetPortalProps) {
  return createPortal(children, document.body)
}