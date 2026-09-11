import { request } from './api'
import type {
  InventoryAdjustInput,
  InventoryAdjustResult,
  InventoryItem,
  InventoryPage,
  InventoryStockMovement,
  InventorySummary,
  MovementType,
  StockMovementsPage,
} from '../types/inventory'

interface InventoryResponse {
  success: true
  data: InventoryPage
}

interface InventoryItemResponse {
  success: true
  data: { items: InventoryItem[] }
}

interface InventorySummaryResponse {
  success: true
  data: InventorySummary
}

interface StockMovementsResponse {
  success: true
  data: StockMovementsPage
}

interface StockMovementsListResponse {
  success: true
  data: { movements: InventoryStockMovement[] }
}

interface AdjustResponse {
  success: true
  data: InventoryAdjustResult
}

export interface InventoryQuery {
  page: number
  pageSize: number
  search?: string
  categoryId?: string
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock'
}

const toQueryString = (query: InventoryQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.search) params.set('search', query.search)
  if (query.categoryId) params.set('categoryId', query.categoryId)
  if (query.stockStatus) params.set('stockStatus', query.stockStatus)
  return params.toString()
}

export async function getAdminInventory(query: InventoryQuery): Promise<InventoryPage> {
  const response = await request<InventoryResponse>(`/admin/inventory?${toQueryString(query)}`)
  return response.data
}

export async function getAdminInventorySummary(): Promise<InventorySummary> {
  const response = await request<InventorySummaryResponse>('/admin/inventory/summary')
  return response.data
}

export async function getAdminStockMovements(options: {
  page: number
  pageSize: number
  movementType?: MovementType
  from?: string
  to?: string
}): Promise<StockMovementsPage> {
  const params = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
  })
  if (options.movementType) params.set('movementType', options.movementType)
  if (options.from) params.set('from', options.from)
  if (options.to) params.set('to', options.to)
  const response = await request<StockMovementsResponse>(`/admin/inventory/movements?${params.toString()}`)
  return response.data
}

export async function getProductStockMovements(
  productId: string,
  productOptionId?: string | null,
  page = 1,
  pageSize = 20,
): Promise<StockMovementsPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (productOptionId) params.set('productOptionId', productOptionId)
  const response = await request<StockMovementsResponse>(
    `/admin/inventory/movements/${encodeURIComponent(productId)}?${params.toString()}`,
  )
  return response.data
}

export async function adjustInventoryStock(input: InventoryAdjustInput): Promise<InventoryAdjustResult> {
  const response = await request<AdjustResponse>('/admin/inventory/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function getAdminLowStockItems(): Promise<InventoryItem[]> {
  const response = await request<InventoryItemResponse>('/admin/inventory?page=1&pageSize=5&stockStatus=low-stock')
  return response.data.items
}

export async function getAdminOutOfStockItems(): Promise<InventoryItem[]> {
  const response = await request<InventoryItemResponse>('/admin/inventory?page=1&pageSize=5&stockStatus=out-of-stock')
  return response.data.items
}

export async function getRecentStockMovements(): Promise<InventoryStockMovement[]> {
  const response = await request<StockMovementsListResponse>('/admin/inventory/movements?page=1&pageSize=5')
  return response.data.movements
}