import { Prisma } from '@prisma/client'
import type { DeliveryArea, DeliveryAreaWithCity } from './delivery-zone.types.js'

export const coverageZoneSelect = {
  id: true,
  fee: true,
  deliveryZoneCities: { select: { city: { select: { name: true } } } },
  deliveryZoneAreas: { select: { area: { select: { name: true, city: { select: { name: true } } } } } },
} satisfies Prisma.DeliveryZoneSelect

export const areaInclude = {
  city: {
    select: { id: true, name: true, state: { select: { id: true, name: true } } },
  },
} satisfies Prisma.AreaInclude

export const toArea = (area: {
  id: string
  cityId: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): DeliveryArea => ({
  id: area.id,
  cityId: area.cityId,
  name: area.name,
  isActive: area.isActive,
  createdAt: area.createdAt.toISOString(),
  updatedAt: area.updatedAt.toISOString(),
})

export const toAreaWithCity = (area: {
  id: string
  cityId: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  city?: { id: string; name: string; state: { id: string; name: string } }
}): DeliveryAreaWithCity => ({
  ...toArea(area),
  city: area.city ?? { id: area.cityId, name: '', state: { id: '', name: '' } },
})