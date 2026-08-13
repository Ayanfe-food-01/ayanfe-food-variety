import { useEffect, useState } from 'react'
import { getPublicStoreSettings, type StoreSettings } from '../services/storeSettingsService'

let inFlightSettingsRequest: Promise<StoreSettings | null> | null = null

const loadStoreSettings = (): Promise<StoreSettings | null> => {
  if (!inFlightSettingsRequest) {
    inFlightSettingsRequest = getPublicStoreSettings()
      .then((data) => data.store)
      .catch(() => null)
      .finally(() => {
        inFlightSettingsRequest = null
      })
  }

  return inFlightSettingsRequest
}

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCurrent = true
    loadStoreSettings()
      .then((store) => {
        if (isCurrent) setSettings(store)
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