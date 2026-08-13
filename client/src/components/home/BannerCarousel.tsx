import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPublicBanners, type PromotionalBanner } from '../../services/storeSettingsService'

const destinationFor = (destination: string | null): string | null => {
  if (!destination || !destination.startsWith('/') || destination.startsWith('//')) return null
  return destination
}

export function BannerCarousel() {
  const [banners, setBanners] = useState<PromotionalBanner[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    let isCurrent = true
    getPublicBanners()
      .then((loaded) => {
        if (isCurrent) setBanners(loaded)
      })
      .catch(() => {
        if (isCurrent) setBanners([])
      })
    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (banners.length < 2 || isPaused) return
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length)
    }, 5500)
    return () => window.clearInterval(interval)
  }, [banners.length, isPaused])

  useEffect(() => {
    if (activeIndex >= banners.length && banners.length > 0) setActiveIndex(0)
  }, [activeIndex, banners.length])

  if (banners.length === 0) return null

  const banner = banners[activeIndex]
  const destination = destinationFor(banner.destination)
  const bannerContent = (
    <>
      <img
        className="banner-carousel-image"
        src={banner.imageUrl}
        alt={banner.title}
        fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
        loading={activeIndex === 0 ? 'eager' : 'lazy'}
      />
      {(banner.promotionalText || banner.buttonText) && (
        <div className="banner-carousel-content">
          {banner.promotionalText && <p>{banner.promotionalText}</p>}
          {banner.buttonText && <span>{banner.buttonText} <span aria-hidden="true">→</span></span>}
        </div>
      )}
    </>
  )

  return (
    <section
      className="banner-carousel-wrap"
      aria-label="Promotional offers"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null }}
      onTouchEnd={(event) => {
        if (touchStart.current === null || banners.length < 2) return
        const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current
        if (Math.abs(distance) > 40) setActiveIndex((current) => (current + (distance < 0 ? 1 : -1) + banners.length) % banners.length)
        touchStart.current = null
      }}
    >
      <div className="banner-carousel">
        {destination ? <Link to={destination} aria-label={`${banner.title}${banner.buttonText ? `: ${banner.buttonText}` : ''}`}>{bannerContent}</Link> : bannerContent}
        {banners.length > 1 && (
          <>
            <button className="banner-carousel-control banner-carousel-prev" type="button" aria-label="Previous promotion" onClick={() => setActiveIndex((current) => (current - 1 + banners.length) % banners.length)}>‹</button>
            <button className="banner-carousel-control banner-carousel-next" type="button" aria-label="Next promotion" onClick={() => setActiveIndex((current) => (current + 1) % banners.length)}>›</button>
            <div className="banner-carousel-dots" aria-label="Choose a promotion">
              {banners.map((item, index) => (
                <button
                  className={`banner-carousel-dot ${index === activeIndex ? 'is-active' : ''}`}
                  type="button"
                  key={item.id}
                  aria-label={`Show promotion ${index + 1}: ${item.title}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}