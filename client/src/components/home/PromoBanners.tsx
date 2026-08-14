import { useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { PromotionalBanner } from '../../services/storeSettingsService'

interface PromoBannersProps {
  banners: PromotionalBanner[]
}

const destinationFor = (destination: string | null): string | null => {
  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) return null
  return destination
}

function PromoBannerCard({ banner, index }: { banner: PromotionalBanner; index: number }) {
  const destination = destinationFor(banner.destination)
  const content = (
    <>
      <img
        className="promo-banner-image"
        src={banner.imageUrl}
        alt={banner.title}
        loading={index === 0 ? 'eager' : 'lazy'}
        fetchPriority={index === 0 ? 'high' : 'auto'}
      />
      {(banner.promotionalText || banner.buttonText) && (
        <div className="promo-banner-content">
          {banner.promotionalText && <p>{banner.promotionalText}</p>}
          {banner.buttonText && <span>{banner.buttonText} <span aria-hidden="true">→</span></span>}
        </div>
      )}
    </>
  )

  return (
    <article className="promo-banner-card">
      {destination ? (
        <Link
          to={destination}
          aria-label={`${banner.title}${banner.buttonText ? `: ${banner.buttonText}` : ''}`}
        >
          {content}
        </Link>
      ) : content}
    </article>
  )
}

export function PromoBanners({ banners }: PromoBannersProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const currentIndexRef = useRef(0)
  const autoScrollingRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const autoScrollFinishTimerRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    if (autoScrollFinishTimerRef.current !== null) window.clearTimeout(autoScrollFinishTimerRef.current)
    timerRef.current = null
    autoScrollFinishTimerRef.current = null
  }, [])

  const updateCurrentIndex = useCallback(() => {
    const track = trackRef.current
    if (!track || track.children.length === 0) return

    const nearestIndex = Array.from(track.children).reduce(
      (closestIndex, child, index) => {
        const closestChild = track.children[closestIndex] as HTMLElement
        const currentChild = child as HTMLElement
        return Math.abs(currentChild.offsetLeft - track.scrollLeft) < Math.abs(closestChild.offsetLeft - track.scrollLeft)
          ? index
          : closestIndex
      },
      0,
    )
    currentIndexRef.current = nearestIndex
  }, [])

  const scheduleNext = useCallback(() => {
    clearTimers()
    if (banners.length < 2) return

    timerRef.current = window.setTimeout(() => {
      const track = trackRef.current
      if (!track || track.children.length < 2) return

      const nextIndex = (currentIndexRef.current + 1) % track.children.length
      const nextCard = track.children[nextIndex] as HTMLElement
      currentIndexRef.current = nextIndex
      autoScrollingRef.current = true
      track.scrollTo({ left: nextCard.offsetLeft, behavior: 'smooth' })

      autoScrollFinishTimerRef.current = window.setTimeout(() => {
        autoScrollingRef.current = false
        scheduleNext()
      }, 700)
    }, 5000)
  }, [banners.length, clearTimers])

  useEffect(() => {
    currentIndexRef.current = 0
    autoScrollingRef.current = false
    trackRef.current?.scrollTo({ left: 0, behavior: 'auto' })
    scheduleNext()

    return () => {
      clearTimers()
      autoScrollingRef.current = false
    }
  }, [banners.length, clearTimers, scheduleNext])

  if (banners.length === 0) return null

  const interruptAutoAdvance = () => {
    autoScrollingRef.current = false
    if (autoScrollFinishTimerRef.current !== null) {
      window.clearTimeout(autoScrollFinishTimerRef.current)
      autoScrollFinishTimerRef.current = null
    }
    scheduleNext()
  }

  return (
    <section className="promo-banners-wrap" aria-label="Promotional offers">
      <div className="container">
        <div
          className="promo-banners-track"
          ref={trackRef}
          onKeyDown={interruptAutoAdvance}
          onPointerDown={interruptAutoAdvance}
          onScroll={() => {
            updateCurrentIndex()
            if (!autoScrollingRef.current) scheduleNext()
          }}
          onTouchStart={interruptAutoAdvance}
          onWheel={interruptAutoAdvance}
        >
          {banners.map((banner, index) => (
            <PromoBannerCard banner={banner} index={index} key={banner.id} />
          ))}
        </div>
      </div>
    </section>
  )
}