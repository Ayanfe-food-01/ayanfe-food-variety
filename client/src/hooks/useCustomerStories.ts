import { useEffect, useState } from 'react'
import { getPublicCustomerStories, type CustomerStory } from '../services/storeSettingsService'

export function useCustomerStories(): CustomerStory[] {
  const [stories, setStories] = useState<CustomerStory[]>([])

  useEffect(() => {
    let isCurrent = true

    getPublicCustomerStories()
      .then((loaded) => {
        if (isCurrent) setStories(loaded)
      })
      .catch(() => {
        if (isCurrent) setStories([])
      })

    return () => {
      isCurrent = false
    }
  }, [])

  return stories
}