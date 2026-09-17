import { useEffect, useRef, useState } from 'react'

export interface PrimaryNavLink {
  label: string
  href: string
}

export function useDesktopNavMeasurement(links: PrimaryNavLink[], wishlistCount: number) {
  const desktopNavRef = useRef<HTMLDivElement>(null)
  const desktopNavMeasureRef = useRef<HTMLDivElement>(null)
  const [desktopNavCount, setDesktopNavCount] = useState(links.length)

  useEffect(() => {
    const host = desktopNavRef.current
    if (!host) return

    const recompute = () => {
      if (host.clientWidth === 0) return
      const measureHost = desktopNavMeasureRef.current
      if (!measureHost || measureHost.children.length === 0 || host.clientWidth === 0) return

      const gap = parseFloat(getComputedStyle(host).gap) || 27
      const linkWidths = Array.from(measureHost.children)
        .filter((el) => el.tagName === 'SPAN' && !el.classList.contains('more-nav-trigger'))
        .map((element) => element.getBoundingClientRect().width)
      const measureWishlist = measureHost.querySelector<HTMLElement>('.wishlist-nav-link')
      const measureMore = measureHost.querySelector<HTMLElement>('.more-nav-trigger')
      const wishlistWidth = measureWishlist?.getBoundingClientRect().width ?? 0
      const shoppingWidth = host.querySelector<HTMLElement>('.desktop-shopping-mode')?.getBoundingClientRect().width ?? 0
      const moreTriggerWidth = measureMore?.getBoundingClientRect().width ?? 64
      const available = host.clientWidth

      const countThatFit = (withMore: boolean) => {
        const trailingItems = 2
        const chrome = (withMore ? moreTriggerWidth : wishlistWidth) + shoppingWidth
        let used = chrome + gap * trailingItems
        let count = 0
        for (const width of linkWidths) {
          if (count > 0) used += gap
          if (used + width > available) break
          used += width
          count++
        }
        return count
      }

      const withoutMore = countThatFit(false)
      if (withoutMore === linkWidths.length) {
        setDesktopNavCount(linkWidths.length)
      } else {
        setDesktopNavCount(Math.max(1, countThatFit(true)))
      }
    }

    recompute()

    const resizeObserver = new ResizeObserver(recompute)
    resizeObserver.observe(host)
    return () => resizeObserver.disconnect()
  }, [wishlistCount])

  return { desktopNavRef, desktopNavMeasureRef, desktopNavCount }
}