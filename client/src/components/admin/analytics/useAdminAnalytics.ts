import { useEffect, useState } from 'react'
import { ApiError } from '../../../services/api'
import { getAdminAnalytics, type AdminAnalytics, type AnalyticsRange } from '../../../services/adminService'

interface UseAdminAnalyticsResult {
  analytics: AdminAnalytics | null
  isLoading: boolean
  error: string | null
}

const createKey = (range: AnalyticsRange, from: string | undefined, to: string | undefined): string =>
  range === 'custom' ? `custom:${from}:${to}` : range

export function useAdminAnalytics(options: {
  range: AnalyticsRange
  from?: string
  to?: string
  enabled?: boolean
}): UseAdminAnalyticsResult {
  const { range, from, to, enabled = true } = options
  const key = createKey(range, from, to)
  const [results, setResults] = useState<Record<string, AdminAnalytics>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!enabled) return
    let current = true
    getAdminAnalytics({ range, from, to })
      .then((result) => {
        if (current) {
          setResults((prev) => ({ ...prev, [key]: result }))
          setErrors((prev) => {
            if (!prev[key]) return prev
            const next = { ...prev }
            delete next[key]
            return next
          })
        }
      })
      .catch((caught: unknown) => {
        if (current) {
          setErrors((prev) => ({
            ...prev,
            [key]: caught instanceof ApiError ? caught.message : 'Analytics could not be loaded.',
          }))
        }
      })
    return () => {
      current = false
    }
  }, [enabled, key, range, from, to])

  return {
    analytics: enabled ? (results[key] ?? null) : null,
    isLoading: enabled && !results[key] && !errors[key],
    error: enabled ? (errors[key] ?? null) : null,
  }
}