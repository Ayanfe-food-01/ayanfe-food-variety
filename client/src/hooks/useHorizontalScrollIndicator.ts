import { useCallback, useEffect, useRef, useState } from 'react'

interface HorizontalScrollIndicator {
  isScrolling: boolean
  thumbWidth: number
  thumbOffset: number
  onScroll: (rail: HTMLDivElement) => void
}

export function useHorizontalScrollIndicator(): HorizontalScrollIndicator {
  const [isScrolling, setIsScrolling] = useState(false)
  const [thumb, setThumb] = useState({ width: 100, offset: 0 })
  const timeoutRef = useRef<number | null>(null)

  const onScroll = useCallback((rail: HTMLDivElement) => {
    const overflow = rail.scrollWidth - rail.clientWidth
    if (overflow <= 0) return

    const width = Math.max(20, (rail.clientWidth / rail.scrollWidth) * 100)
    const offset = (rail.scrollLeft / overflow) * (100 - width)
    setThumb({ width, offset })
    setIsScrolling(true)

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false)
      timeoutRef.current = null
    }, 700)
  }, [])

  useEffect(() => () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }
  }, [])

  return { isScrolling, thumbWidth: thumb.width, thumbOffset: thumb.offset, onScroll }
}