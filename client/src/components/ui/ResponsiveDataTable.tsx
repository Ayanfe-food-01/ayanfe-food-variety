import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ResponsiveDataTableProps {
  children: ReactNode
  className?: string
  label?: string
}

interface FloatingBarPosition {
  left: number
  width: number
  contentWidth: number
  viewportWidth: number
  scrollLeft: number
  visible: boolean
}

const initialPosition: FloatingBarPosition = {
  left: 0,
  width: 0,
  contentWidth: 0,
  viewportWidth: 0,
  scrollLeft: 0,
  visible: false,
}

/**
 * Keeps one real table scroller and mirrors its scrollbar near the viewport
 * edge. The proxy is only a second control for the same scroll position; it
 * does not create a second table or a second vertical scrolling region.
 */
export function ResponsiveDataTable({ children, className = '', label = 'Table horizontal scroll' }: ResponsiveDataTableProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const tableScrollerRef = useRef<HTMLDivElement>(null)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(initialPosition)

  useEffect(() => {
    const frame = frameRef.current
    const tableScroller = tableScrollerRef.current
    const scrollbar = scrollbarRef.current
    if (!frame || !tableScroller) return

    let frameRequest = 0
    let positionRequest = 0

    const syncScrollbarFromTable = () => {
      if (scrollbar && Math.abs(scrollbar.scrollLeft - tableScroller.scrollLeft) > 1) {
        scrollbar.scrollLeft = tableScroller.scrollLeft
      }
      setPosition((current) => current.scrollLeft === tableScroller.scrollLeft ? current : { ...current, scrollLeft: tableScroller.scrollLeft })
    }

    const syncTableFromScrollbar = () => {
      if (Math.abs(tableScroller.scrollLeft - (scrollbar?.scrollLeft ?? 0)) > 1) {
        tableScroller.scrollLeft = scrollbar?.scrollLeft ?? 0
      }
    }

    const measure = () => {
      cancelAnimationFrame(positionRequest)
      positionRequest = requestAnimationFrame(() => {
        const rect = frame.getBoundingClientRect()
        const hasHorizontalOverflow = tableScroller.scrollWidth > tableScroller.clientWidth + 1
        const isInViewport = rect.bottom > 0 && rect.top < window.innerHeight
        const left = Math.max(12, Math.min(rect.left, window.innerWidth - 44))
        const width = Math.max(0, Math.min(rect.width, window.innerWidth - left - 12))

        setPosition({
          left,
          width,
          contentWidth: tableScroller.scrollWidth,
          viewportWidth: tableScroller.clientWidth,
          scrollLeft: tableScroller.scrollLeft,
          visible: hasHorizontalOverflow && isInViewport && width > 80,
        })
        syncScrollbarFromTable()
      })
    }

    const onTableScroll = () => {
      cancelAnimationFrame(frameRequest)
      frameRequest = requestAnimationFrame(syncScrollbarFromTable)
    }

    tableScroller.addEventListener('scroll', onTableScroll, { passive: true })
    scrollbar?.addEventListener('scroll', syncTableFromScrollbar, { passive: true })
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resizeObserver?.observe(frame)
    resizeObserver?.observe(tableScroller)
    measure()

    return () => {
      cancelAnimationFrame(frameRequest)
      cancelAnimationFrame(positionRequest)
      tableScroller.removeEventListener('scroll', onTableScroll)
      scrollbar?.removeEventListener('scroll', syncTableFromScrollbar)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
      resizeObserver?.disconnect()
    }
  }, [position.visible])

  const floatingScrollbar = position.visible && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="responsive-table-floating-scrollbar fixed z-40 flex h-8 items-center rounded-full border border-line bg-white/95 px-2 shadow-lg backdrop-blur"
          style={{
            bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            left: `${position.left}px`,
            width: `${position.width}px`,
          }}
        >
          <div
            ref={scrollbarRef}
            className="responsive-table-proxy-scrollbar absolute inset-x-2 inset-y-0 z-10 h-8 overflow-x-auto overscroll-x-contain rounded-full opacity-0"
            aria-label={label}
            role="scrollbar"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, position.contentWidth - position.viewportWidth)}
            aria-valuenow={position.scrollLeft}
            tabIndex={0}
          >
            <div className="h-px" style={{ width: `${position.contentWidth}px` }} />
          </div>
          <div className="pointer-events-none relative h-2 w-full rounded-full bg-sage/80">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-green shadow-sm"
              style={{
                width: `${Math.max(32, Math.min(position.width - 16, (position.width - 16) * position.viewportWidth / position.contentWidth))}px`,
                transform: `translateX(${position.contentWidth > position.viewportWidth
                  ? (position.width - 16 - Math.max(32, Math.min(position.width - 16, (position.width - 16) * position.viewportWidth / position.contentWidth))) * position.scrollLeft / (position.contentWidth - position.viewportWidth)
                  : 0}px)`,
              }}
            />
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <div ref={frameRef} className={`relative min-w-0 ${className}`}>
      <div ref={tableScrollerRef} className="responsive-table-scrollbar-hidden overflow-x-auto overscroll-x-contain">
        {children}
      </div>
      {floatingScrollbar}
    </div>
  )
}