export interface DeliveryZone {
  id: string
  name: string
  fee: string
  freeDeliveryThreshold: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface DeliveryZoneInput {
  name: string
  fee: number
  freeDeliveryThreshold: number | null
  isActive: boolean
}

export interface AdminDeliveryZonesQuery {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'inactive'
}

export interface AdminDeliveryZonesPage {
  zones: DeliveryZone[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ReorderDeliveryZonesInput {
  zoneIds: string[]
}