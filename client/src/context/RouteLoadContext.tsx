import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { RouteLoadContext } from './routeLoadContext'

const MIN_SHOW_MS = 650
const SAFETY_TIMEOUT = 10000

/**
 * Coordinates the global branded route loader with page-level initial data
 * loading.
 *
 * - beginNavigation() starts the loader on every page-to-page navigation
 *   (link clicks, back/forward, programmatic navigations). It is shown for at
 *   least MIN_SHOW_MS so brand transitions always "feel" present.
 * - Pages that fetch their own initial data call hold() while that request is
 *   pending and release() once it resolves (success or error). While a hold is
 *   active the loader stays visible past the minimum window, so the page's own
 *   inline "Loading…" state is never flashed to the user.
 * - A safety timeout guarantees the loader can never get stuck.
 */
export function RouteLoadProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const holdCountRef = useRef(0)
  const navigationStartRef = useRef<number | null>(null)
  const minShowTimeoutRef = useRef<number | undefined>(undefined)
  const safetyTimeoutRef = useRef<number | undefined>(undefined)

  const clearMinShow = useCallback(() => {
    if (minShowTimeoutRef.current !== undefined) {
      window.clearTimeout(minShowTimeoutRef.current)
      minShowTimeoutRef.current = undefined
    }
  }, [])

  const clearSafety = useCallback(() => {
    if (safetyTimeoutRef.current !== undefined) {
      window.clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = undefined
    }
  }, [])

  const hideLoader = useCallback(() => {
    clearMinShow()
    clearSafety()
    setIsLoading(false)
  }, [clearMinShow, clearSafety])

  const scheduleMinShowHide = useCallback(() => {
    clearMinShow()
    if (holdCountRef.current > 0) return

    const start = navigationStartRef.current
    if (start === null) {
      hideLoader()
      return
    }

    const remaining = MIN_SHOW_MS - (Date.now() - start)
    if (remaining > 0) {
      minShowTimeoutRef.current = window.setTimeout(() => {
        minShowTimeoutRef.current = undefined
        if (holdCountRef.current === 0) hideLoader()
      }, remaining)
    } else {
      hideLoader()
    }
  }, [clearMinShow, hideLoader])

  const beginNavigation = useCallback(() => {
    navigationStartRef.current = Date.now()
    setIsLoading(true)
    scheduleMinShowHide()
  }, [scheduleMinShowHide])

  const hold = useCallback(() => {
    holdCountRef.current += 1
    setIsLoading(true)
    clearMinShow()
    clearSafety()
    safetyTimeoutRef.current = window.setTimeout(() => {
      holdCountRef.current = 0
      setIsLoading(false)
      safetyTimeoutRef.current = undefined
    }, SAFETY_TIMEOUT)
  }, [clearMinShow, clearSafety])

  const release = useCallback(() => {
    holdCountRef.current = Math.max(0, holdCountRef.current - 1)
    if (holdCountRef.current === 0) {
      scheduleMinShowHide()
    }
  }, [scheduleMinShowHide])

  useEffect(
    () => () => {
      clearMinShow()
      clearSafety()
    },
    [clearMinShow, clearSafety],
  )

  return (
    <RouteLoadContext.Provider value={{ hold, release, beginNavigation, isLoading }}>
      {children}
    </RouteLoadContext.Provider>
  )
}