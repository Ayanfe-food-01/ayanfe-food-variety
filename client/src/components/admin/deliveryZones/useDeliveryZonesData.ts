import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../../ui/Toast'
import { ApiError } from '../../../services/api'
import {
  getAdminDeliveryZones,
  reorderAdminDeliveryZones,
  type AdminDeliveryZone,
  type AdminDeliveryZonesPage,
  type AdminDeliveryZonesQuery,
} from '../../../services/adminService'

export const deliveryZonesPageSize = 10

export interface UseDeliveryZonesDataResult {
  zones: AdminDeliveryZone[]
  result: AdminDeliveryZonesPage | null
  isLoading: boolean
  error: string | null
  status: string
  searchInput: string
  movingId: string | null
  currentPage: number
  totalPages: number
  onSearchInputChange: (value: string) => void
  onSearch: (value: string) => void
  onApplyStatus: (status: AdminDeliveryZonesQuery['status']) => void
  onPageChange: (page: number) => void
  refresh: () => void
  clearError: () => void
  moveZone: (zone: AdminDeliveryZone, direction: -1 | 1) => Promise<void>
}

export function useDeliveryZonesData(): UseDeliveryZonesDataResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [result, setResult] = useState<AdminDeliveryZonesPage | null>(null)
  const [query, setQuery] = useState<AdminDeliveryZonesQuery>({
    page: Number(searchParams.get('page') ?? 1),
    pageSize: deliveryZonesPageSize,
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') as AdminDeliveryZonesQuery['status']) || undefined,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  const refresh = () => setQuery((current) => ({ ...current }))
  const clearError = () => setError(null)

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)
      getAdminDeliveryZones(query)
        .then((loaded) => { if (current) setResult(loaded) })
        .catch((caught: unknown) => {
          if (current) setError(caught instanceof ApiError ? caught.message : 'Delivery zones could not be loaded.')
        })
        .finally(() => { if (current) setIsLoading(false) })
    }, 0)
    const nextParams = new URLSearchParams()
    if (query.page > 1) nextParams.set('page', String(query.page))
    if (query.search) nextParams.set('search', query.search)
    if (query.status) nextParams.set('status', query.status)
    setSearchParams(nextParams, { replace: true })
    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [query, setSearchParams])

  const onSearch = (value: string) => {
    setQuery((current) => ({ ...current, search: value.trim() || undefined, page: 1 }))
  }

  const onApplyStatus = (status: AdminDeliveryZonesQuery['status']) => {
    setQuery((current) => ({ ...current, status, page: 1 }))
  }

  const onPageChange = (page: number) => {
    setQuery((current) => ({ ...current, page }))
  }

  const moveZone = async (zone: AdminDeliveryZone, direction: -1 | 1) => {
    if (!result) return
    const ordered = [...result.zones]
    const index = ordered.findIndex((item) => item.id === zone.id)
    if (index < 0) return
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const swapped = [...ordered]
    ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
    setResult((current) => (current ? { ...current, zones: swapped } : current))
    setMovingId(zone.id)
    try {
      await reorderAdminDeliveryZones(swapped.map((item) => item.id))
      showToast('Delivery zone order updated.', 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Delivery zone order could not be updated.', 'error')
      refresh()
    } finally {
      setMovingId(null)
    }
  }

  const zones = result?.zones ?? []
  const currentPage = result?.pagination.page ?? query.page
  const totalPages = result?.pagination.totalPages ?? 1

  return {
    zones,
    result,
    isLoading,
    error,
    status: query.status ?? '',
    searchInput,
    movingId,
    currentPage,
    totalPages,
    onSearchInputChange: setSearchInput,
    onSearch,
    onApplyStatus,
    onPageChange,
    refresh,
    clearError,
    moveZone,
  }
}