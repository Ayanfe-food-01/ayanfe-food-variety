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

// A city currently assigned to a delivery zone, with its state for display.
export interface DeliveryZoneAssignedCity {
  id: string
  name: string
  state: { id: string; name: string }
}

// A state with its cities, used by the admin city-assignment picker.
export interface DeliveryLocationState {
  id: string
  name: string
  cities: Array<{ id: string; name: string }>
}

export interface DeliveryZoneDetail extends DeliveryZone {
  cities: DeliveryZoneAssignedCity[]
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