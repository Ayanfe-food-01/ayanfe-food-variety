import { useEffect, useState } from 'react'
import { getPublicBanners, type PromotionalBanner } from '../services/storeSettingsService'

export function usePromotionalBanners(): PromotionalBanner[] {
  const [banners, setBanners] = useState<PromotionalBanner[]>([])

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

  return banners
}