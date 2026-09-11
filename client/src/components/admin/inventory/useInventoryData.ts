import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../../services/api'
import { getAdminInventory, getAdminInventorySummary, type InventoryQuery } from '../../../services/inventoryService'
import type { InventoryItem, InventoryPage, InventorySummary } from '../../../types/inventory'

interface UseInventoryDataOptions {
  initialQuery?: Partial<Omit<InventoryQuery, 'page' | 'pageSize'>>
  refreshKey?: number
}

interface UseInventoryDataResult {
  items: InventoryItem[]
  total: number
  currentPage: number
  totalPages: number
  isInitialLoading: boolean
  error: string | null
  summary: InventorySummary | null
  setQuery: (update: Partial<InventoryQuery>) => void
}

export function useInventoryData(options: UseInventoryDataOptions = {}): UseInventoryDataResult {
  const { initialQuery, refreshKey } = options
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(initialQuery?.search ?? '')
  const [categoryId, setCategoryId] = useState(initialQuery?.categoryId ?? '')
  const [stockStatus, setStockStatus] = useState(initialQuery?.stockStatus ?? '')
  const [result, setResult] = useState<InventoryPage | null>(null)
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      const query: InventoryQuery = {
        page,
        pageSize: 20,
        search: search.trim() || undefined,
        categoryId: categoryId || undefined,
        stockStatus: (stockStatus || undefined) as InventoryQuery['stockStatus'],
      }
      setError(null)
      getAdminInventory(query)
        .then((nextResult) => {
          if (current) setResult(nextResult)
        })
        .catch((caught: unknown) => {
          if (current) setError(caught instanceof ApiError ? caught.message : 'Inventory could not be loaded.')
        })
        .finally(() => {
          if (current) setIsInitialLoading(false)
        })
    }, 0)

    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [page, search, categoryId, stockStatus, refreshKey])

  useEffect(() => {
    let current = true
    getAdminInventorySummary()
      .then((data) => {
        if (current) setSummary(data)
      })
      .catch(() => {
        if (current) setSummary(null)
      })
    return () => {
      current = false
    }
  }, [refreshKey])

  const setQuery = useCallback((update: Partial<InventoryQuery>) => {
    if (update.page !== undefined) setPage(update.page)
    if (update.search !== undefined) {
      setSearch(update.search)
      setPage(1)
    }
    if (update.categoryId !== undefined) {
      setCategoryId(update.categoryId)
      setPage(1)
    }
    if (update.stockStatus !== undefined) {
      setStockStatus(update.stockStatus)
      setPage(1)
    }
  }, [])

  return {
    items: result?.items ?? [],
    total: result?.pagination.total ?? 0,
    currentPage: result?.pagination.page ?? page,
    totalPages: result?.pagination.totalPages ?? 1,
    isInitialLoading,
    error,
    summary,
    setQuery,
  }
}