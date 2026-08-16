import { useCallback, useEffect, useRef, useState } from 'react'

interface HorizontalScrollIndicator {
  isScrolling: boolean
  onScroll: () => void
}

export function useHorizontalScrollIndicator(): HorizontalScrollIndicator {
  const [isScrolling, setIsScrolling] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const onScroll = useCallback(() => {
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

  return { isScrolling, onScroll }
}