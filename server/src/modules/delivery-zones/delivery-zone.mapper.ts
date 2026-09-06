import { Prisma } from '@prisma/client'
import type { DeliveryZone, DeliveryZoneAssignedArea, DeliveryZoneAssignedCity } from './delivery-zone.types.js'
import { zoneCoverageLabel } from './delivery-zone-label.js'

export type CoverageInput = {
  deliveryZoneCities?: Array<{ city: { name: string } }>
  deliveryZoneAreas?: Array<{ area: { name: string; city: { name: string } } }>
}

export const toZone = (zone: {
  id: string
  fee: Prisma.Decimal
  freeDeliveryThreshold: Prisma.Decimal | null
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
} & CoverageInput): DeliveryZone => {
  return {
    id: zone.id,
    label: zoneCoverageLabel(zone),
    fee: zone.fee.toFixed(2),
    freeDeliveryThreshold: zone.freeDeliveryThreshold?.toFixed(2) ?? null,
    minDeliveryDays: zone.minDeliveryDays,
    maxDeliveryDays: zone.maxDeliveryDays,
    isActive: zone.isActive,
    sortOrder: zone.sortOrder,
    createdAt: zone.createdAt.toISOString(),
    updatedAt: zone.updatedAt.toISOString(),
  }
}

export const zoneInclude = {
  deliveryZoneCities: {
    select: { city: { select: { name: true } } },
    orderBy: { city: { name: 'asc' as const } },
  },
  deliveryZoneAreas: {
    select: { area: { select: { name: true, city: { select: { name: true } } } } },
    orderBy: { area: { name: 'asc' as const } },
  },
} satisfies Prisma.DeliveryZoneInclude

export const orderByDisplay = {
  orderBy: [{ sortOrder: 'asc' as const }],
}

export const toAssignedCity = (city: {
  id: string
  name: string
  state: { id: string; name: string }
}): DeliveryZoneAssignedCity => ({
  id: city.id,
  name: city.name,
  state: { id: city.state.id, name: city.state.name },
})

export const toAssignedArea = (area: {
  id: string
  name: string
  cityId: string
  city: { name: string; state: { id: string; name: string } }
}): DeliveryZoneAssignedArea => ({
  id: area.id,
  name: area.name,
  cityId: area.cityId,
  cityName: area.city.name,
  state: { id: area.city.state.id, name: area.city.state.name },
})