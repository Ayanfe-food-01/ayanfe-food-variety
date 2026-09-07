import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { FilterField, FilterValues } from '../components/filters/filterTypes'
import { createFilterValues, getActiveCount } from '../components/filters/filterTypes'

export interface UrlFilters {
  committed: FilterValues
  activeCount: number
  apply: (next: FilterValues) => void
}

export function useUrlFilters(fields: FilterField[]): UrlFilters {
  const [searchParams, setSearchParams] = useSearchParams()

  const committed = createFilterValues(fields, searchParams)
  const activeCount = getActiveCount(fields, committed)

  const apply = useCallback((next: FilterValues) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      for (const field of fields) {
        const value = next[field.key] ?? ''
        if (value) params.set(field.key, value)
        else params.delete(field.key)
      }
      return params
    }, { replace: true })
  }, [fields, setSearchParams])

  return { committed, activeCount, apply }
}