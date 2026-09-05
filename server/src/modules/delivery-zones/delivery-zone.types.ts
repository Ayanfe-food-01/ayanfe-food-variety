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

// A specific area currently assigned to a delivery zone, with its owning
// city/state expanded for display. An area maps to at most one zone.
export interface DeliveryZoneAssignedArea {
  id: string
  name: string
  cityId: string
  cityName: string
  state: { id: string; name: string }
}

// A state with its cities, used by the admin city-assignment picker and the
// public checkout location picker. Each city carries the delivery zone it
// belongs to (if any) so the admin UI can disable cities already assigned to
// another zone, and a servable flag (mapped to an active zone) so the checkout
// can hide locations delivery cannot reach.
export interface DeliveryLocationState {
  id: string
  name: string
  // True when at least one city in the state is servable.
  servable: boolean
  cities: Array<{
    id: string
    name: string
    // Present in the admin payload; omitted from the public checkout payload.
    assignedZoneId?: string | null
    assignedZoneLabel?: string | null
    // True only when the city is mapped to an active delivery zone.
    servable: boolean
    // Optional active areas offered at checkout. Omitted entirely when the city
    // has no active areas to keep the public payload small (774 cities).
    areas?: DeliveryLocationArea[]
    // All areas defined for the city (active and inactive) with their current
    // zone assignment; present only in the admin payload so the zone picker can
    // list and disable areas that already belong to another zone.
    adminAreas?: AdminDeliveryLocationArea[]
  }>
}

// A public area offered at checkout. Only active areas appear in the public
// payload. servable is true when the area can be delivered to (its own zone if
// assigned, else its city's zone, is active).
export interface DeliveryLocationArea {
  id: string
  name: string
  servable: boolean
}

// Admin view of a delivery area used by the zone picker: adds the area's
// active flag and the zone it is currently assigned to (if any).
export interface AdminDeliveryLocationArea extends DeliveryLocationArea {
  isActive: boolean
  assignedZoneId: string | null
  assignedZoneLabel: string | null
}

export interface DeliveryZoneDetail extends DeliveryZone {
  cities: DeliveryZoneAssignedCity[]
  areas: DeliveryZoneAssignedArea[]
}

export interface DeliveryZoneInput {
  fee: number
  freeDeliveryThreshold: number | null
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
  isActive: boolean
  // IDs of cities that this zone covers at LGA level. On create these build the
  // zone's covered set; on update they replace it entirely.
  cityIds: string[]
  // IDs of specific areas that this zone covers. Areas are an optional way to
  // price parts of an LGA differently; an area assigned here overrides its
  // LGA-wide zone at checkout.
  areaIds: string[]
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