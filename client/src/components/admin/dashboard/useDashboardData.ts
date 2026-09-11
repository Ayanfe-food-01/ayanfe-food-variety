import { useEffect, useState } from 'react'
import { getDashboardStats, type DashboardStats } from '../../../services/adminService'
import { getAdminInventorySummary } from '../../../services/inventoryService'
import { getAdminQuoteRequests } from '../../../services/quoteService'
import type { InventorySummary } from '../../../types/inventory'

export interface DashboardData {
  stats: DashboardStats | null
  inventory: InventorySummary | null
  pendingQuotes: number
  isLoading: boolean
  error: string | null
}

export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [inventory, setInventory] = useState<InventorySummary | null>(null)
  const [pendingQuotes, setPendingQuotes] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    getDashboardStats()
      .then((result) => {
        if (current) setStats(result)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof Error ? caught.message : 'Dashboard data could not be loaded.')
      })
    getAdminInventorySummary()
      .then((result) => {
        if (current) setInventory(result)
      })
      .catch(() => {
        if (current) setInventory(null)
      })
    getAdminQuoteRequests({ status: 'PENDING', page: 1, pageSize: 1 })
      .then((result) => {
        if (current) setPendingQuotes(result.pagination.total)
      })
      .catch(() => {
        if (current) setPendingQuotes(0)
      })
    return () => {
      current = false
    }
  }, [])

  const isLoading = stats === null && error === null
  return { stats, inventory, pendingQuotes, isLoading, error }
}