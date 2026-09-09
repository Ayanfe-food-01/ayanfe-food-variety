import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export interface TableScrollbarState {
  left: number
  width: number
  contentWidth: number
  viewportWidth: number
  scrollLeft: number
  maxScroll: number
  visible: boolean
}

const initialState: TableScrollbarState = {
  left: 0,
  width: 0,
  contentWidth: 0,
  viewportWidth: 0,
  scrollLeft: 0,
  maxScroll: 0,
  visible: false,
}

export interface TableScrollbar {
  frameRef: RefObject<HTMLDivElement | null>
  scrollerRef: RefObject<HTMLDivElement | null>
  state: TableScrollbarState
  scrollTo: (scrollLeft: number) => void
  scrollBy: (delta: number) => void
}

/**
 * Drives a mirrored floating scrollbar for any horizontally overflowing
 * container. The bar rerenders from CSS variables measured against the real
 * scroller, so the component stays reusable and the container stays the single
 * source of truth for scrolling.
 */
export function useTableScrollbar(): TableScrollbar {
  const frameRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<TableScrollbarState>(initialState)

  const measure = useCallback(() => {
    const frame = frameRef.current
    const scroller = scrollerRef.current
    if (!frame || !scroller) return

    const rect = frame.getBoundingClientRect()
    const hasHorizontalOverflow = scroller.scrollWidth > scroller.clientWidth + 1
    const isInViewport = rect.bottom > 0 && rect.top < window.innerHeight
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 44))
    const width = Math.max(0, Math.min(rect.width, window.innerWidth - left - 12))
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)

    setState((current) => {
      const next: TableScrollbarState = {
        left,
        width,
        contentWidth: scroller.scrollWidth,
        viewportWidth: scroller.clientWidth,
        scrollLeft: scroller.scrollLeft,
        maxScroll,
        visible: hasHorizontalOverflow && isInViewport && width > 80,
      }
      return sameState(current, next) ? current : next
    })
  }, [])

  useEffect(() => {
    const frame = frameRef.current
    const scroller = scrollerRef.current
    if (!frame || !scroller) return

    const onScroll = () => {
      const scrollLeft = scroller.scrollLeft
      setState((current) => (current.scrollLeft === scrollLeft ? current : { ...current, scrollLeft }))
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resizeObserver?.observe(frame)
    resizeObserver?.observe(scroller)

    measure()

    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
      resizeObserver?.disconnect()
    }
  }, [measure])

  const scrollTo = useCallback((scrollLeft: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = Math.max(0, Math.min(scrollLeft, scroller.scrollWidth - scroller.clientWidth))
  }, [])

  const scrollBy = useCallback((delta: number) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = Math.max(0, Math.min(scroller.scrollLeft + delta, scroller.scrollWidth - scroller.clientWidth))
  }, [])

  return { frameRef, scrollerRef, state, scrollTo, scrollBy }
}

const sameState = (a: TableScrollbarState, b: TableScrollbarState): boolean =>
  a.left === b.left &&
  a.width === b.width &&
  a.contentWidth === b.contentWidth &&
  a.viewportWidth === b.viewportWidth &&
  a.scrollLeft === b.scrollLeft &&
  a.maxScroll === b.maxScroll &&
  a.visible === b.visible