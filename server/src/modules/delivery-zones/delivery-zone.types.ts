export interface DeliveryZone {
  id: string
  // Auto-generated display label derived from the zone's covered cities.
  label: string
  fee: string
  freeDeliveryThreshold: string | null
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
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

// A state with its cities, used by the admin city-assignment picker. Each city
// carries the delivery zone it belongs to (if any) so the UI can disable cities
// already assigned to another zone.
export interface DeliveryLocationState {
  id: string
  name: string
  cities: Array<{
    id: string
    name: string
    assignedZoneId: string | null
    assignedZoneLabel: string | null
  }>
}

export interface DeliveryZoneDetail extends DeliveryZone {
  cities: DeliveryZoneAssignedCity[]
}

export interface DeliveryZoneInput {
  fee: number
  freeDeliveryThreshold: number | null
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
  isActive: boolean
  // IDs of cities that this zone covers. On create these build the zone's
  // covered set; on update they replace it entirely.
  cityIds: string[]
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

// An area of an LGA/City, used to refine a delivery location at checkout. An
// area always inherits its city's delivery zone; it never carries its own fee.
export interface DeliveryArea {
  id: string
  cityId: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Area with its owning city/state expanded, for admin management views.
export interface DeliveryAreaWithCity extends DeliveryArea {
  city: { id: string; name: string; state: { id: string; name: string } }
}

export interface DeliveryAreaInput {
  cityId: string
  name: string
  isActive: boolean
}

// The areas belonging to one city/LGA, with the city context for display.
export interface CityDeliveryAreas {
  city: { id: string; name: string; state: { id: string; name: string } }
  areas: DeliveryArea[]
}