import { useLayoutEffect, useRef } from 'react'
import { useRouteLoad } from './useRouteLoad'

/**
 * Keeps the global branded route loader visible until the page's INITIAL data
 * request has resolved (success or error). Only the first transition is gated:
 * later refetches of the same page (filters, pagination, etc.) pass straight
 * through without re-triggering the full-screen loader.
 *
 * Uses useLayoutEffect so the branded loader covers the page's own inline
 * "Loading…" state before the browser paints its first frame (no flash).
 */
export function useInitialRouteLoad(isReady: boolean) {
  const { hold, release } = useRouteLoad()
  const hasGatedRef = useRef(false)
  const isHeldRef = useRef(false)

  useLayoutEffect(() => {
    if (!isReady) {
      if (!hasGatedRef.current) {
        hasGatedRef.current = true
        isHeldRef.current = true
        hold()
      }
    } else if (isHeldRef.current) {
      isHeldRef.current = false
      release()
    }

    return () => {
      if (isHeldRef.current) {
        isHeldRef.current = false
        release()
      }
    }
  }, [hold, isReady, release])
}