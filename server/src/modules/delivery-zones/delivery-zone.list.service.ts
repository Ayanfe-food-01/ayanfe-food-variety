import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AdminDeliveryZonesQuery, DeliveryZone, DeliveryZoneDetail } from './delivery-zone.types.js'
import { orderByDisplay, toAssignedArea, toAssignedCity, toZone, zoneInclude } from './delivery-zone.mapper.js'

export async function listActiveDeliveryZones(): Promise<DeliveryZone[]> {
  const zones = await prisma.deliveryZone.findMany({
    where: { isActive: true },
    include: zoneInclude,
    ...orderByDisplay,
  })
  return zones.map((zone) => toZone(zone))
}

export async function listAdminDeliveryZones(query: AdminDeliveryZonesQuery) {
  const where: Prisma.DeliveryZoneWhereInput = {
    // Search matches any covered city or area (case-insensitive, partial match).
    ...(query.search
      ? {
          OR: [
            { deliveryZoneCities: { some: { city: { name: { contains: query.search, mode: 'insensitive' } } } } },
            { deliveryZoneAreas: { some: { area: { name: { contains: query.search, mode: 'insensitive' } } } } },
          ],
        }
      : {}),
    ...(query.status ? { isActive: query.status === 'active' } : {}),
  }

  const [total, zones] = await prisma.$transaction([
    prisma.deliveryZone.count({ where }),
    prisma.deliveryZone.findMany({
      where,
      include: zoneInclude,
      orderBy: [{ sortOrder: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    zones: zones.map((zone) => toZone(zone)),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

export async function getAdminDeliveryZone(id: string): Promise<DeliveryZoneDetail> {
  const zone = await prisma.deliveryZone.findUnique({
    where: { id },
    include: {
      deliveryZoneCities: {
        select: {
          city: {
            select: {
              id: true,
              name: true,
              state: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { city: { name: 'asc' as const } },
      },
      deliveryZoneAreas: {
        select: {
          area: {
            select: {
              id: true,
              name: true,
              cityId: true,
              city: { select: { name: true, state: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { area: { name: 'asc' as const } },
      },
    },
  })
  if (!zone) throw new HttpError(404, 'Delivery zone not found.')
  const detail: DeliveryZoneDetail = {
    ...toZone(zone),
    cities: zone.deliveryZoneCities.map(({ city }) => toAssignedCity(city)),
    areas: zone.deliveryZoneAreas.map(({ area }) => toAssignedArea(area)),
  }
  return detail
}