import type { ReactNode } from 'react'
import { FloatingTableScrollbar } from './FloatingTableScrollbar'
import { useTableScrollbar } from '../../hooks/useTableScrollbar'

interface ResponsiveDataTableProps {
  children: ReactNode
  className?: string
  label?: string
}

/**
 * Wraps a horizontally scrollable table and mirrors its scrollbar near the
 * viewport edge. The real scroller stays the single source of truth; the
 * floating bar is only a second control for the same scroll position. It does
 * not create a second table or a second vertical scrolling region.
 */
export function ResponsiveDataTable({ children, className = '', label = 'Table horizontal scroll' }: ResponsiveDataTableProps) {
  const { frameRef, scrollerRef, state, scrollTo } = useTableScrollbar()

  return (
    <div ref={frameRef} className={`relative min-w-0 ${className}`}>
      <div
        ref={scrollerRef}
        className="relative min-w-0 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [&_table]:border-separate [&_table]:border-spacing-0 [&_th]:[overflow-wrap:normal] [&_td]:[overflow-wrap:normal]"
      >
        {children}
      </div>
      <FloatingTableScrollbar state={state} onScrollTo={scrollTo} label={label} />
    </div>
  )
}