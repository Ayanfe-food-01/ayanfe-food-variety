import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'

export type ResolvedDeliveryZone = {
  id: string
  label: string
  fee: string
  freeDeliveryThreshold: string | null
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
}

export async function resolveDeliveryZoneByCity(
  cityName: string,
  cityId?: string,
  areaId?: string,
): Promise<ResolvedDeliveryZone | null> {
  const zoneSelect = {
    id: true,
    fee: true,
    freeDeliveryThreshold: true,
    minDeliveryDays: true,
    maxDeliveryDays: true,
    isActive: true,
  } satisfies Prisma.DeliveryZoneSelect

  let zone: {
    id: string
    fee: Prisma.Decimal
    freeDeliveryThreshold: Prisma.Decimal | null
    minDeliveryDays: number | null
    maxDeliveryDays: number | null
    isActive: boolean
  } | null = null
  let label = ''

  if (areaId) {
    const area = await prisma.area.findUnique({
      where: { id: areaId },
      select: {
        name: true,
        isActive: true,
        deliveryZoneArea: { select: { deliveryZone: { select: zoneSelect } } },
        city: {
          select: {
            name: true,
            deliveryZoneCity: { select: { deliveryZone: { select: zoneSelect } } },
          },
        },
      },
    })
    if (area && area.isActive) {
      const areaZone = area.deliveryZoneArea?.deliveryZone ?? null
      const cityZone = area.city.deliveryZoneCity?.deliveryZone ?? null
      zone = areaZone ?? cityZone
      // The customer picked an area, so surface exactly that place: its own
      // area when one is mapped, otherwise the whole LGA that serves it.
      label = areaZone ? `${area.name}, ${area.city.name}` : area.city.name
    }
  } else if (cityId) {
    const match = await prisma.city.findUnique({
      where: { id: cityId },
      select: {
        name: true,
        deliveryZoneCity: { select: { deliveryZone: { select: zoneSelect } } },
      },
    })
    zone = match?.deliveryZoneCity?.deliveryZone ?? null
    if (match && zone) label = match.name
  } else {
    const match = await prisma.city.findFirst({
      where: {
        name: { equals: cityName, mode: 'insensitive' },
        deliveryZoneCity: { isNot: null },
      },
      select: {
        name: true,
        deliveryZoneCity: { select: { deliveryZone: { select: zoneSelect } } },
      },
    })
    zone = match?.deliveryZoneCity?.deliveryZone ?? null
    if (match && zone) label = match.name
  }

  if (!zone || !zone.isActive) return null
  return {
    id: zone.id,
    label,
    fee: zone.fee.toFixed(2),
    freeDeliveryThreshold: zone.freeDeliveryThreshold?.toFixed(2) ?? null,
    minDeliveryDays: zone.minDeliveryDays,
    maxDeliveryDays: zone.maxDeliveryDays,
  }
}