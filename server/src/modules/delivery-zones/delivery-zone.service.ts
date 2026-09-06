import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminDeliveryZonesQuery,
  DeliveryZone,
  DeliveryZoneAssignedArea,
  DeliveryZoneAssignedCity,
  DeliveryZoneDetail,
  DeliveryZoneInput,
} from './delivery-zone.types.js'
import { zoneCoverageLabel } from './delivery-zone-label.js'

type CoverageInput = {
  deliveryZoneCities?: Array<{ city: { name: string } }>
  deliveryZoneAreas?: Array<{ area: { name: string; city: { name: string } } }>
}

const toZone = (zone: {
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

const zoneInclude = {
  deliveryZoneCities: {
    select: { city: { select: { name: true } } },
    orderBy: { city: { name: 'asc' as const } },
  },
  deliveryZoneAreas: {
    select: { area: { select: { name: true, city: { select: { name: true } } } } },
    orderBy: { area: { name: 'asc' as const } },
  },
} satisfies Prisma.DeliveryZoneInclude

const orderByDisplay = {
  orderBy: [{ sortOrder: 'asc' as const }],
}

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

const toAssignedCity = (city: {
  id: string
  name: string
  state: { id: string; name: string }
}): DeliveryZoneAssignedCity => ({
  id: city.id,
  name: city.name,
  state: { id: city.state.id, name: city.state.name },
})

const toAssignedArea = (area: {
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

async function assertCitiesUnassigned(cityIds: string[], excludeZoneId?: string): Promise<void> {
  const taken = await prisma.deliveryZoneCity.findMany({
    where: { cityId: { in: cityIds }, ...(excludeZoneId ? { deliveryZoneId: { not: excludeZoneId } } : {}) },
    select: { city: { select: { name: true } }, deliveryZoneId: true },
  })
  if (taken.length > 0) {
    const names = taken.map((t) => t.city.name)
    throw new HttpError(409, `The following city is already assigned to another delivery zone: ${names.join(', ')}.`)
  }
}

async function assertAreasUnassigned(areaIds: string[], excludeZoneId?: string): Promise<void> {
  const taken = await prisma.deliveryZoneArea.findMany({
    where: { areaId: { in: areaIds }, ...(excludeZoneId ? { deliveryZoneId: { not: excludeZoneId } } : {}) },
    select: { area: { select: { name: true } }, deliveryZoneId: true },
  })
  if (taken.length > 0) {
    const names = taken.map((t) => t.area.name)
    throw new HttpError(409, `The following area is already assigned to another delivery zone: ${names.join(', ')}.`)
  }
}

async function assertNoCoverageOverlap(cityIds: string[], areaIds: string[]): Promise<void> {
  if (cityIds.length === 0 || areaIds.length === 0) return
  const conflicting = await prisma.area.findMany({
    where: { id: { in: areaIds }, cityId: { in: cityIds } },
    select: { city: { select: { name: true } } },
  })
  if (conflicting.length > 0) {
    const lga = conflicting[0]?.city.name ?? 'This LGA'
    throw new HttpError(
      409,
      `"${lga}" cannot be covered both in full and by specific areas in the same delivery zone. Add either the whole LGA or its specific areas.`,
    )
  }
}

export async function createDeliveryZone(input: DeliveryZoneInput): Promise<DeliveryZone> {
  const cityIds = [...new Set(input.cityIds)]
  const areaIds = [...new Set(input.areaIds)]
  if (cityIds.length === 0 && areaIds.length === 0) {
    throw new HttpError(400, 'Add at least one city or area to this delivery zone.')
  }
  await assertNoCoverageOverlap(cityIds, areaIds)
  await assertCitiesUnassigned(cityIds)
  await assertAreasUnassigned(areaIds)

  const nextSortOrder = await nextAvailableSortOrder()

  let created: Awaited<ReturnType<typeof prisma.deliveryZone.create>> & CoverageInput
  try {
    created = await prisma.deliveryZone.create({
      data: {
        fee: input.fee,
        freeDeliveryThreshold: input.freeDeliveryThreshold ?? undefined,
        minDeliveryDays: input.minDeliveryDays ?? undefined,
        maxDeliveryDays: input.maxDeliveryDays ?? undefined,
        isActive: input.isActive,
        sortOrder: nextSortOrder,
        deliveryZoneCities: {
          create: cityIds.map((cityId) => ({ cityId })),
        },
        deliveryZoneAreas: {
          create: areaIds.map((areaId) => ({ areaId })),
        },
      },
      include: zoneInclude,
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'One of these cities or areas is already assigned to another delivery zone.')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new HttpError(404, 'One or more selected cities or areas do not exist.')
    }
    throw error
  }

  return toZone(created)
}

export async function updateDeliveryZone(id: string, input: DeliveryZoneInput): Promise<DeliveryZone> {
  await getAdminDeliveryZone(id)

  const cityIds = [...new Set(input.cityIds)]
  const areaIds = [...new Set(input.areaIds)]
  if (cityIds.length === 0 && areaIds.length === 0) {
    throw new HttpError(400, 'Add at least one city or area to this delivery zone.')
  }
  await assertNoCoverageOverlap(cityIds, areaIds)
  await assertCitiesUnassigned(cityIds, id)
  await assertAreasUnassigned(areaIds, id)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryZoneCity.deleteMany({ where: { deliveryZoneId: id } })
      await tx.deliveryZoneArea.deleteMany({ where: { deliveryZoneId: id } })
      await tx.deliveryZoneCity.createMany({
        data: cityIds.map((cityId) => ({ deliveryZoneId: id, cityId })),
        skipDuplicates: true,
      })
      await tx.deliveryZoneArea.createMany({
        data: areaIds.map((areaId) => ({ deliveryZoneId: id, areaId })),
        skipDuplicates: true,
      })
      return tx.deliveryZone.update({
        where: { id },
        data: {
          fee: input.fee,
          freeDeliveryThreshold: input.freeDeliveryThreshold ?? undefined,
          minDeliveryDays: input.minDeliveryDays ?? undefined,
          maxDeliveryDays: input.maxDeliveryDays ?? undefined,
          isActive: input.isActive,
        },
        include: zoneInclude,
      })
    })
    return toZone(updated)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new HttpError(404, 'One or more selected cities or areas do not exist.')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Delivery zone not found.')
    }
    throw error
  }
}

export async function updateDeliveryZoneStatus(id: string, isActive: boolean): Promise<DeliveryZone> {
  try {
    const zone = await prisma.deliveryZone.update({
      where: { id },
      data: { isActive },
      include: zoneInclude,
    })
    return toZone(zone)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Delivery zone not found.')
    }
    throw error
  }
}

export async function deleteDeliveryZone(id: string): Promise<void> {
  await getAdminDeliveryZone(id)
  try {
    await prisma.deliveryZone.delete({ where: { id } })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2025')) {
      throw new HttpError(409, 'This delivery zone is currently in use by orders. Deactivate it instead of deleting it.')
    }
    throw error
  }
}

export async function reorderDeliveryZones(zoneIds: string[]): Promise<DeliveryZone[]> {
  const existingZones = await prisma.deliveryZone.findMany({
    where: { id: { in: zoneIds } },
    select: { id: true },
  })
  if (existingZones.length !== zoneIds.length) {
    throw new HttpError(400, 'One or more delivery zones in the order no longer exist.')
  }

  await prisma.$transaction(
    zoneIds.map((id, index) =>
      prisma.deliveryZone.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    ),
  )

  const refreshedZones = await prisma.deliveryZone.findMany({
    where: { id: { in: zoneIds } },
    include: zoneInclude,
    ...orderByDisplay,
  })
  return refreshedZones.map((zone) => toZone(zone))
}

async function nextAvailableSortOrder(): Promise<number> {
  const highest = await prisma.deliveryZone.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })
  return (highest?.sortOrder ?? 0) + 1
}

export async function assignCityToZone(zoneId: string, cityId: string): Promise<DeliveryZoneDetail> {
  await getAdminDeliveryZone(zoneId)

  const alreadyAssigned = await prisma.deliveryZoneCity.findUnique({
    where: { cityId },
    select: { id: true, deliveryZoneId: true },
  })
  if (alreadyAssigned) {
    if (alreadyAssigned.deliveryZoneId === zoneId) {
      throw new HttpError(409, 'This city is already assigned to this delivery zone.')
    }
    throw new HttpError(409, 'This city is already assigned to another delivery zone.')
  }

  // One-bin-per-LGA: a city already covered at area level in this zone cannot
  // also be added whole.
  const areaOfCity = await prisma.deliveryZoneArea.findFirst({
    where: { deliveryZoneId: zoneId, area: { cityId } },
    select: { area: { select: { name: true, city: { select: { name: true } } } } },
  })
  if (areaOfCity) {
    throw new HttpError(
      409,
      `"${areaOfCity.area.city.name}" is already covered through the area "${areaOfCity.area.name}" in this zone. A delivery zone covers either a whole LGA or its specific areas, not both.`,
    )
  }

  try {
    await prisma.deliveryZoneCity.create({
      data: { deliveryZoneId: zoneId, cityId },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'This city is already assigned to a delivery zone.')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new HttpError(404, 'Delivery zone or city not found.')
    }
    throw error
  }

  return getAdminDeliveryZone(zoneId)
}

export async function unassignCityFromZone(zoneId: string, cityId: string): Promise<DeliveryZoneDetail> {
  const existing = await prisma.deliveryZoneCity.findFirst({
    where: { cityId },
    select: { id: true, deliveryZoneId: true },
  })
  if (existing && existing.deliveryZoneId !== zoneId) {
    throw new HttpError(409, 'This city belongs to a different delivery zone.')
  }

  try {
    await prisma.deliveryZoneCity.delete({
      where: { cityId },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'This city is not assigned to any delivery zone.')
    }
    throw error
  }

  return getAdminDeliveryZone(zoneId)
}

export async function assignAreaToZone(zoneId: string, areaId: string): Promise<DeliveryZoneDetail> {
  const detail = await getAdminDeliveryZone(zoneId)

  const alreadyAssigned = await prisma.deliveryZoneArea.findUnique({
    where: { areaId },
    select: { deliveryZoneId: true },
  })
  if (alreadyAssigned) {
    if (alreadyAssigned.deliveryZoneId === zoneId) {
      throw new HttpError(409, 'This area is already assigned to this delivery zone.')
    }
    throw new HttpError(409, 'This area is already assigned to another delivery zone.')
  }

  // One-bin-per-LGA: an area cannot be added to a zone that already covers its
  // LGA in full.
  const area = await prisma.area.findUnique({
    where: { id: areaId },
    select: { cityId: true, city: { select: { name: true } } },
  })
  if (!area) throw new HttpError(404, 'Delivery area not found.')
  const coveredWhole = detail.cities.some((city) => city.id === area.cityId)
  if (coveredWhole) {
    throw new HttpError(
      409,
      `"${area.city.name}" is already covered in full by this zone. A delivery zone covers either a whole LGA or its specific areas, not both.`,
    )
  }

  try {
    await prisma.deliveryZoneArea.create({
      data: { deliveryZoneId: zoneId, areaId },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'This area is already assigned to a delivery zone.')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new HttpError(404, 'Delivery zone or area not found.')
    }
    throw error
  }

  return getAdminDeliveryZone(zoneId)
}

export async function unassignAreaFromZone(zoneId: string, areaId: string): Promise<DeliveryZoneDetail> {
  const existing = await prisma.deliveryZoneArea.findUnique({
    where: { areaId },
    select: { deliveryZoneId: true },
  })
  if (existing && existing.deliveryZoneId !== zoneId) {
    throw new HttpError(409, 'This area belongs to a different delivery zone.')
  }

  try {
    await prisma.deliveryZoneArea.delete({
      where: { areaId },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'This area is not assigned to any delivery zone.')
    }
    throw error
  }

  return getAdminDeliveryZone(zoneId)
}
