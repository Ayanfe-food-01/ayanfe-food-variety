import { useCallback, useEffect, useRef, useState } from 'react'

interface UseScrollSnapRailOptions {
  itemCount: number
  autoAdvanceMs?: number
}

interface ScrollSnapRail {
  trackRef: React.RefObject<HTMLDivElement | null>
  activeIndex: number
  goTo: (index: number) => void
  interruptAutoAdvance: () => void
  onScroll: () => void
}

export function useScrollSnapRail({ itemCount, autoAdvanceMs = 5000 }: UseScrollSnapRailOptions): ScrollSnapRail {
  const trackRef = useRef<HTMLDivElement>(null)
  const currentIndexRef = useRef(0)
  const autoScrollingRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const autoScrollFinishTimerRef = useRef<number | null>(null)
  const scheduleNextRef = useRef<() => void>(() => undefined)
  const [activeIndex, setActiveIndex] = useState(0)

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    if (autoScrollFinishTimerRef.current !== null) window.clearTimeout(autoScrollFinishTimerRef.current)
    timerRef.current = null
    autoScrollFinishTimerRef.current = null
  }, [])

  const centerOn = useCallback((index: number, behavior: ScrollBehavior) => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return
    const target = track.children[index] as HTMLElement | undefined
    if (!target) return
    const trackRect = track.getBoundingClientRect()
    const targetContentLeft = target.getBoundingClientRect().left - trackRect.left + track.scrollLeft
    track.scrollTo({ left: targetContentLeft + target.offsetWidth / 2 - track.clientWidth / 2, behavior })
  }, [])

  const goTo = useCallback((index: number) => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return
    currentIndexRef.current = index
    setActiveIndex(index)
    autoScrollingRef.current = true
    centerOn(index, 'smooth')
    autoScrollFinishTimerRef.current = window.setTimeout(() => {
      autoScrollingRef.current = false
      scheduleNextRef.current()
    }, 700)
  }, [centerOn])

  const updateActiveIndex = useCallback(() => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return

    const viewportCenter = track.scrollLeft + track.clientWidth / 2
    const trackLeft = track.getBoundingClientRect().left
    let nearestIndex = 0
    for (let index = 1; index < track.children.length; index += 1) {
      const nearest = track.children[nearestIndex] as HTMLElement
      const current = track.children[index] as HTMLElement
      const distanceFor = (el: HTMLElement) => {
        const elContentLeft = el.getBoundingClientRect().left - trackLeft + track.scrollLeft
        return Math.abs(elContentLeft + el.offsetWidth / 2 - viewportCenter)
      }
      if (distanceFor(current) < distanceFor(nearest)) nearestIndex = index
    }
    currentIndexRef.current = nearestIndex
    setActiveIndex(nearestIndex)
  }, [])

  const scheduleNext = useCallback(() => {
    clearTimers()
    if (itemCount < 2) return
    timerRef.current = window.setTimeout(() => {
      const track = trackRef.current
      if (!track || track.children.length < 2) return
      goTo((currentIndexRef.current + 1) % track.children.length)
    }, autoAdvanceMs)
  }, [itemCount, autoAdvanceMs, clearTimers, goTo])

  useEffect(() => {
    scheduleNextRef.current = scheduleNext
    return () => { scheduleNextRef.current = () => undefined }
  }, [scheduleNext])

  useEffect(() => {
    currentIndexRef.current = 0
    autoScrollingRef.current = false
    centerOn(0, 'auto')
    scheduleNext()
    return () => { clearTimers(); autoScrollingRef.current = false }
  }, [itemCount, clearTimers, scheduleNext, centerOn])

  const interruptAutoAdvance = useCallback(() => {
    autoScrollingRef.current = false
    if (autoScrollFinishTimerRef.current !== null) {
      window.clearTimeout(autoScrollFinishTimerRef.current)
      autoScrollFinishTimerRef.current = null
    }
    scheduleNext()
  }, [scheduleNext])

  const onScroll = useCallback(() => {
    updateActiveIndex()
    if (!autoScrollingRef.current) scheduleNext()
  }, [updateActiveIndex, scheduleNext])

  return { trackRef, activeIndex, goTo, interruptAutoAdvance, onScroll }
}