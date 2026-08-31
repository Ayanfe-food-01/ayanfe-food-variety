import { useEffect, useState } from 'react'
import { getPublicBanners, type PromotionalBanner } from '../services/storeSettingsService'

export interface PromotionalBannersResult {
  banners: PromotionalBanner[]
  isLoading: boolean
}

export function usePromotionalBanners(): PromotionalBannersResult {
  const [banners, setBanners] = useState<PromotionalBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true

    getPublicBanners()
      .then((loaded) => {
        if (isCurrent) setBanners(loaded)
      })
      .catch(() => {
        if (isCurrent) setBanners([])
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  return { banners, isLoading }
}
