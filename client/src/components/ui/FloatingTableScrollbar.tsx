import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import type { TableScrollbarState } from '../../hooks/useTableScrollbar'

interface FloatingTableScrollbarProps {
  state: TableScrollbarState
  onScrollTo: (scrollLeft: number) => void
  label?: string
}

const BAR_PADDING = 16
const MIN_THUMB_WIDTH = 32

export function FloatingTableScrollbar({ state, onScrollTo, label }: FloatingTableScrollbarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const trackWidth = state.width - BAR_PADDING
  const thumbWidth = state.viewportWidth > 0
    ? Math.max(MIN_THUMB_WIDTH, Math.min(trackWidth, (state.viewportWidth / state.contentWidth) * trackWidth))
    : trackWidth
  const thumbOffset = state.maxScroll > 0 ? (state.scrollLeft / state.maxScroll) * (trackWidth - thumbWidth) : 0

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      onScrollTo(state.scrollLeft + delta)
    }
    bar.addEventListener('wheel', onWheel, { passive: false })
    return () => bar.removeEventListener('wheel', onWheel)
  }, [onScrollTo, state.scrollLeft])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: state.scrollLeft }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const travel = trackWidth - thumbWidth
    const deltaX = event.clientX - drag.startX
    onScrollTo(drag.startScrollLeft + (travel > 0 ? (deltaX / travel) * state.maxScroll : 0))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = state.viewportWidth * 0.1
    let nextScrollLeft = state.scrollLeft
    switch (event.key) {
      case 'ArrowLeft': nextScrollLeft -= step; break
      case 'ArrowRight': nextScrollLeft += step; break
      case 'Home': nextScrollLeft = 0; break
      case 'End': nextScrollLeft = state.maxScroll; break
      case 'PageUp': nextScrollLeft -= state.viewportWidth; break
      case 'PageDown': nextScrollLeft += state.viewportWidth; break
      default: return
    }
    event.preventDefault()
    onScrollTo(nextScrollLeft)
  }

  if (!state.visible || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={barRef}
      className="responsive-table-floating-bar"
      role="scrollbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={state.maxScroll}
      aria-valuenow={state.scrollLeft}
      aria-orientation="horizontal"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        left: `${state.left}px`,
        width: `${state.width}px`,
      }}
    >
      <div className="responsive-table-track">
        <div
          ref={thumbRef}
          className={`responsive-table-thumb${isDragging ? ' is-dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: `${thumbWidth}px`,
            transform: `translateX(${thumbOffset}px)`,
          }}
        />
      </div>
    </div>,
    document.body,
  )
}