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

const toDeliveryZone = (zone: {
  id: string
  name: string
  fee: Prisma.Decimal
  freeDeliveryThreshold: Prisma.Decimal | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}): DeliveryZone => ({
  id: zone.id,
  name: zone.name,
  fee: zone.fee.toFixed(2),
  freeDeliveryThreshold: zone.freeDeliveryThreshold?.toFixed(2) ?? null,
  isActive: zone.isActive,
  sortOrder: zone.sortOrder,
  createdAt: zone.createdAt.toISOString(),
  updatedAt: zone.updatedAt.toISOString(),
})

const duplicateZoneError = (name: string) =>
  new HttpError(409, `A delivery zone named “${name}” already exists.`)

const orderByDisplay = {
  orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }],
}

export async function listActiveDeliveryZones(): Promise<DeliveryZone[]> {
  const zones = await prisma.deliveryZone.findMany({
    where: { isActive: true },
    ...orderByDisplay,
  })
  return zones.map((zone) => toDeliveryZone(zone))
}

export async function listAdminDeliveryZones(query: AdminDeliveryZonesQuery) {
  const where: Prisma.DeliveryZoneWhereInput = {
    ...(query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {}),
    ...(query.status ? { isActive: query.status === 'active' } : {}),
  }

  const [total, zones] = await prisma.$transaction([
    prisma.deliveryZone.count({ where }),
    prisma.deliveryZone.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    zones: zones.map((zone) => toDeliveryZone(zone)),
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
  return {
    ...toDeliveryZone(zone),
    cities: zone.deliveryZoneCities.map(({ city }) => toAssignedCity(city)),
  }
}

export async function createDeliveryZone(input: DeliveryZoneInput): Promise<DeliveryZone> {
  const duplicateName = await prisma.deliveryZone.findUnique({
    where: { name: input.name },
    select: { id: true },
  })
  if (duplicateName) throw duplicateZoneError(input.name)

  const nextSortOrder = await nextAvailableSortOrder()

  try {
    const zone = await prisma.deliveryZone.create({
      data: {
        name: input.name,
        fee: input.fee,
        freeDeliveryThreshold: input.freeDeliveryThreshold ?? undefined,
        isActive: input.isActive,
        sortOrder: nextSortOrder,
      },
    })
    return toDeliveryZone(zone)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw duplicateZoneError(input.name)
    }
    throw error
  }
}

export async function updateDeliveryZone(id: string, input: DeliveryZoneInput): Promise<DeliveryZone> {
  await getAdminDeliveryZone(id)
  const duplicateName = await prisma.deliveryZone.findFirst({
    where: { name: input.name, NOT: { id } },
    select: { id: true },
  })
  if (duplicateName) throw duplicateZoneError(input.name)

  try {
    const zone = await prisma.deliveryZone.update({
      where: { id },
      data: {
        name: input.name,
        fee: input.fee,
        freeDeliveryThreshold: input.freeDeliveryThreshold ?? undefined,
        isActive: input.isActive,
      },
    })
    return toDeliveryZone(zone)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw duplicateZoneError(input.name)
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
    })
    return toDeliveryZone(zone)
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
    ...orderByDisplay,
  })
  return refreshedZones.map((zone) => toDeliveryZone(zone))
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
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      },
    },
  })
  return states.map((state) => ({
    id: state.id,
    name: state.name,
    cities: state.cities.map((city) => ({ id: city.id, name: city.name })),
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
): Promise<{ id: string; name: string; fee: string; freeDeliveryThreshold: string | null } | null> {
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
              name: true,
              fee: true,
              freeDeliveryThreshold: true,
              isActive: true,
            },
          },
        },
      },
    },
  })
  const zone = match?.deliveryZoneCity?.deliveryZone ?? null
  if (!zone || !zone.isActive) return null
  return {
    id: zone.id,
    name: zone.name,
    fee: zone.fee.toFixed(2),
    freeDeliveryThreshold: zone.freeDeliveryThreshold?.toFixed(2) ?? null,
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