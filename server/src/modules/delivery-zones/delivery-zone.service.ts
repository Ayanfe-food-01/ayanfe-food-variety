import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminDeliveryZonesQuery,
  DeliveryLocationState,
  DeliveryZone,
  DeliveryZoneAssignedCity,
  DeliveryZoneDetail,
  DeliveryZoneInput,
} from './delivery-zone.types.js'
import { buildZoneLabel } from './delivery-zone-label.js'

// A zone's display only needs the city names to compute its auto label.
type CityNamesInput = Array<{ city: { name: string } }>

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
  deliveryZoneCities?: CityNamesInput
}): DeliveryZone => {
  const cityNames = (zone.deliveryZoneCities ?? []).map((entry) => entry.city.name)
  return {
    id: zone.id,
    label: buildZoneLabel(cityNames),
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
    // Search matches any covered city (case-insensitive, partial match).
    ...(query.search
      ? { deliveryZoneCities: { some: { city: { name: { contains: query.search, mode: 'insensitive' } } } } }
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
        orderBy: { city: { name: 'asc' } },
      },
    },
  })
  if (!zone) throw new HttpError(404, 'Delivery zone not found.')
  const detail: DeliveryZoneDetail = {
    ...toZone(zone),
    cities: zone.deliveryZoneCities.map(({ city }) => toAssignedCity(city)),
  }
  return detail
}

// Throws the first city that is already assigned to another zone, if any.
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

export async function createDeliveryZone(input: DeliveryZoneInput): Promise<DeliveryZone> {
  const cityIds = [...new Set(input.cityIds)]
  if (cityIds.length === 0) {
    throw new HttpError(400, 'Add at least one city to this delivery zone.')
  }
  await assertCitiesUnassigned(cityIds)

  const nextSortOrder = await nextAvailableSortOrder()

  let created: Awaited<ReturnType<typeof prisma.deliveryZone.create>> & { deliveryZoneCities?: CityNamesInput }
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
      },
      include: zoneInclude,
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'One of these cities is already assigned to another delivery zone.')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new HttpError(404, 'One or more selected cities do not exist.')
    }
    throw error
  }

  return toZone(created)
}

export async function updateDeliveryZone(id: string, input: DeliveryZoneInput): Promise<DeliveryZone> {
  await getAdminDeliveryZone(id)

  const cityIds = [...new Set(input.cityIds)]
  if (cityIds.length === 0) {
    throw new HttpError(400, 'Add at least one city to this delivery zone.')
  }
  await assertCitiesUnassigned(cityIds, id)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryZoneCity.deleteMany({ where: { deliveryZoneId: id } })
      await tx.deliveryZoneCity.createMany({
        data: cityIds.map((cityId) => ({ deliveryZoneId: id, cityId })),
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
      throw new HttpError(404, 'One or more selected cities do not exist.')
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

export async function listDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
  const states = await prisma.state.findMany({
    orderBy: { name: 'asc' },
    include: {
      cities: {
        select: {
          id: true,
          name: true,
          deliveryZoneCity: {
            select: {
              deliveryZone: {
                select: {
                  id: true,
                  deliveryZoneCities: {
                    select: { city: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  })
  return states.map((state) => ({
    id: state.id,
    name: state.name,
    cities: state.cities.map((city) => {
      const zone = city.deliveryZoneCity?.deliveryZone ?? null
      const cityNames = (zone?.deliveryZoneCities ?? [])
        .map((entry) => entry.city.name)
        .sort((a, b) => a.localeCompare(b))
      return {
        id: city.id,
        name: city.name,
        assignedZoneId: zone ? zone.id : null,
        assignedZoneLabel: zone ? buildZoneLabel(cityNames) : null,
      }
    }),
  }))
}

// Resolves the active DeliveryZone serving a city for display purposes, using
// the authoritative City -> DeliveryZoneCity -> DeliveryZone mapping (Phase 2).
// Returns null when the city is unmapped OR the mapped zone is inactive, so
// callers can indicate delivery is unavailable. The fee/threshold are returned
// as decimal strings; the client never derives order totals from them — the
// checkout endpoint recomputes the fee and total authoritatively.
export async function resolveDeliveryZoneByCity(
  cityName: string,
): Promise<{ id: string; label: string; fee: string; freeDeliveryThreshold: string | null; minDeliveryDays: number | null; maxDeliveryDays: number | null } | null> {
  const match = await prisma.city.findFirst({
    where: {
      name: { equals: cityName, mode: 'insensitive' },
      deliveryZoneCity: { isNot: null },
    },
    select: {
      deliveryZoneCity: {
        select: {
          deliveryZone: {
            select: {
              id: true,
              fee: true,
              freeDeliveryThreshold: true,
              minDeliveryDays: true,
              maxDeliveryDays: true,
              isActive: true,
              deliveryZoneCities: { select: { city: { select: { name: true } } } },
            },
          },
        },
      },
    },
  })
  const zone = match?.deliveryZoneCity?.deliveryZone ?? null
  if (!zone || !zone.isActive) return null
  const cityNames = zone.deliveryZoneCities.map((entry) => entry.city.name)
  return {
    id: zone.id,
    label: buildZoneLabel(cityNames),
    fee: zone.fee.toFixed(2),
    freeDeliveryThreshold: zone.freeDeliveryThreshold?.toFixed(2) ?? null,
    minDeliveryDays: zone.minDeliveryDays,
    maxDeliveryDays: zone.maxDeliveryDays,
  }
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
