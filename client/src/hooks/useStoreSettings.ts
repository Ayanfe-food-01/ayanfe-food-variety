import { useEffect, useState } from 'react'
import { getPublicStoreSettings, type StoreSettings } from '../services/storeSettingsService'

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true
    getPublicStoreSettings()
      .then((data) => {
        if (isCurrent) setSettings(data.store)
      })
      .catch(() => {
        if (isCurrent) setSettings(null)
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  return { settings, isLoading }
}