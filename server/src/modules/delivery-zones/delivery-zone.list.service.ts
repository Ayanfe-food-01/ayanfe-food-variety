import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { buildSearchWhere, type SearchFieldConfig } from '../../utils/search.js'
import type { AdminDeliveryZonesQuery, DeliveryZone, DeliveryZoneDetail } from './delivery-zone.types.js'
import { orderByDisplay, toAssignedArea, toAssignedCity, toZone, zoneInclude } from './delivery-zone.mapper.js'

const ADMIN_DELIVERY_ZONE_SEARCH_FIELDS: SearchFieldConfig[] = [
  { path: 'deliveryZoneCities.city.name', toMany: true, weight: 1.2 },
  { path: 'deliveryZoneAreas.area.name', toMany: true, weight: 1 },
]

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
    // Search matches any covered city or area (multi-word, case-insensitive, substring).
    ...(buildSearchWhere<Prisma.DeliveryZoneWhereInput>(query.search, ADMIN_DELIVERY_ZONE_SEARCH_FIELDS) ?? {}),
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