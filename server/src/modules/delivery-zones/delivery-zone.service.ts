import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminDeliveryLocationArea,
  AdminDeliveryZonesQuery,
  CityDeliveryAreas,
  DeliveryArea,
  DeliveryAreaInput,
  DeliveryAreaWithCity,
  DeliveryLocationArea,
  DeliveryLocationState,
  DeliveryZone,
  DeliveryZoneAssignedArea,
  DeliveryZoneAssignedCity,
  DeliveryZoneDetail,
  DeliveryZoneInput,
} from './delivery-zone.types.js'
import { zoneCoverageLabel } from './delivery-zone-label.js'

// A zone's display only needs its covered city and area names to compute the
// auto label.
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

// Throws the first area that is already assigned to another zone, if any.
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

// Enforces the "one bin per LGA" rule within a single zone: a zone may cover an
// LGA in full (cityIds) OR specific areas of that LGA (areaIds), never both at
// once. The object is to keep the models clean and unambiguous — a whole LGA
// and a specific area of it belong to different zones, never the same one. The
// database also enforces this via a trigger (SQLSTATE 23505 -> P2002) as an
// integrity backstop for any client path; this check runs first to return a
// friendly message.
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

export async function listAdminDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
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
                  isActive: true,
                  deliveryZoneCities: { select: { city: { select: { id: true, name: true } } } },
                  deliveryZoneAreas: {
                    select: { area: { select: { id: true, name: true, city: { select: { name: true } } } } },
                  },
                },
              },
            },
          },
          areas: {
            select: {
              id: true,
              name: true,
              isActive: true,
              deliveryZoneArea: {
                select: {
                  deliveryZone: {
                    select: {
                      id: true,
                      isActive: true,
                      deliveryZoneCities: { select: { city: { select: { id: true, name: true } } } },
                      deliveryZoneAreas: {
                        select: { area: { select: { id: true, name: true, city: { select: { name: true } } } } },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  })
  return states.map((state) => {
    const cities = state.cities.map((city) => {
      const zone = city.deliveryZoneCity?.deliveryZone ?? null
      const cityZoneActive = Boolean(zone && zone.isActive)
      const adminAreas: AdminDeliveryLocationArea[] = city.areas.map((area) => {
        const areaZone = area.deliveryZoneArea?.deliveryZone ?? null
        return {
          id: area.id,
          name: area.name,
          isActive: area.isActive,
          // An area's coverage is its own zone when assigned, else its city's.
          servable: area.isActive && (areaZone ? areaZone.isActive : cityZoneActive),
          assignedZoneId: areaZone ? areaZone.id : null,
          assignedZoneLabel: areaZone ? zoneCoverageLabel(areaZone) : null,
        }
      })
      return {
        id: city.id,
        name: city.name,
        assignedZoneId: zone ? zone.id : null,
        assignedZoneLabel: zone ? zoneCoverageLabel(zone) : null,
        servable: cityZoneActive || adminAreas.some((area) => area.servable),
        adminAreas,
      }
    })
    return {
      id: state.id,
      name: state.name,
      servable: cities.some((city) => city.servable),
      cities,
    }
  })
}

// Public delivery-location picker used at checkout. Returns every state and
// city (so unmapped cities are still pickable and then fail with a zone error),
// plus the active areas for each city that defines them. Areas are included
// only when at least one active area exists, keeping the 774-city payload lean.
// A city is servable when its LGA-wide zone is active or any of its active
// areas is itself deliverable; an area is deliverable when its own zone
// (area-level if assigned, else its city's) is active.
export async function listPublicDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
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
                  isActive: true,
                  deliveryZoneCities: { select: { city: { select: { id: true, name: true } } } },
                  deliveryZoneAreas: {
                    select: { area: { select: { id: true, name: true, city: { select: { name: true } } } } },
                  },
                },
              },
            },
          },
          areas: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              deliveryZoneArea: {
                select: {
                  deliveryZone: {
                    select: {
                      id: true,
                      isActive: true,
                      deliveryZoneCities: { select: { city: { select: { id: true, name: true } } } },
                      deliveryZoneAreas: {
                        select: { area: { select: { id: true, name: true, city: { select: { name: true } } } } },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  })
  return states.map((state) => {
    const cities = state.cities.map((city) => {
      const zone = city.deliveryZoneCity?.deliveryZone ?? null
      const cityZoneActive = Boolean(zone && zone.isActive)
      const areas: DeliveryLocationArea[] = city.areas.map((area) => {
        const areaZone = area.deliveryZoneArea?.deliveryZone ?? null
        return {
          id: area.id,
          name: area.name,
          servable: areaZone ? areaZone.isActive : cityZoneActive,
        }
      })
      return {
        id: city.id,
        name: city.name,
        servable: cityZoneActive || areas.some((area) => area.servable),
        ...(areas.length > 0 ? { areas } : {}),
      }
    })
    return {
      id: state.id,
      name: state.name,
      servable: cities.some((city) => city.servable),
      cities,
    }
  })
}

// Resolves the active DeliveryZone serving a city or area for display purposes,
// using the authoritative Area -> DeliveryZoneArea and City -> DeliveryZoneCity
// -> DeliveryZone mappings. Resolution order:
//   1. areaId (preferred when the customer picked an area) - the area's own
//      zone if it is assigned one, otherwise its city's zone.
//   2. cityId - exact city lookup (unambiguous across duplicate LGA names).
//   3. cityName - legacy name-based lookup, which may match LGAs that share a
//      name across states (e.g. Surulere in Lagos and Oyo); the first mapped
//      match wins, so callers with an LGA id should always pass it.
// Returns null when the location is unmapped OR the mapped zone is inactive, so
// callers can indicate delivery is unavailable. The fee/threshold are returned
// as decimal strings; the client never derives order totals from them — the
// checkout endpoint recomputes the fee and total authoritatively.
export async function resolveDeliveryZoneByCity(
  cityName: string,
  cityId?: string,
  areaId?: string,
): Promise<{ id: string; label: string; fee: string; freeDeliveryThreshold: string | null; minDeliveryDays: number | null; maxDeliveryDays: number | null } | null> {
  const zoneSelect = {
    id: true,
    fee: true,
    freeDeliveryThreshold: true,
    minDeliveryDays: true,
    maxDeliveryDays: true,
    isActive: true,
    deliveryZoneCities: { select: { city: { select: { name: true } } } },
    deliveryZoneAreas: { select: { area: { select: { name: true, city: { select: { name: true } } } } } },
  } satisfies Prisma.DeliveryZoneSelect

  let zone: {
    id: string
    fee: Prisma.Decimal
    freeDeliveryThreshold: Prisma.Decimal | null
    minDeliveryDays: number | null
    maxDeliveryDays: number | null
    isActive: boolean
    deliveryZoneCities: Array<{ city: { name: string } }>
    deliveryZoneAreas: Array<{ area: { name: string; city: { name: string } } }>
  } | null = null

  if (areaId) {
    const area = await prisma.area.findUnique({
      where: { id: areaId },
      select: {
        isActive: true,
        deliveryZoneArea: { select: { deliveryZone: { select: zoneSelect } } },
        city: {
          select: {
            deliveryZoneCity: { select: { deliveryZone: { select: zoneSelect } } },
          },
        },
      },
    })
    if (area && area.isActive) {
      zone = area.deliveryZoneArea?.deliveryZone ?? area.city.deliveryZoneCity?.deliveryZone ?? null
    }
  } else if (cityId) {
    const match = await prisma.city.findUnique({
      where: { id: cityId },
      select: { deliveryZoneCity: { select: { deliveryZone: { select: zoneSelect } } } },
    })
    zone = match?.deliveryZoneCity?.deliveryZone ?? null
  } else {
    const match = await prisma.city.findFirst({
      where: {
        name: { equals: cityName, mode: 'insensitive' },
        deliveryZoneCity: { isNot: null },
      },
      select: { deliveryZoneCity: { select: { deliveryZone: { select: zoneSelect } } } },
    })
    zone = match?.deliveryZoneCity?.deliveryZone ?? null
  }

  if (!zone || !zone.isActive) return null
  return {
    id: zone.id,
    label: zoneCoverageLabel(zone),
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

const areaInclude = {
  city: {
    select: { id: true, name: true, state: { select: { id: true, name: true } } },
  },
} satisfies Prisma.AreaInclude

const toArea = (area: {
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

const toAreaWithCity = (area: {
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

// Lists the areas belonging to one city/LGA (all statuses) for admin management.
export async function listCityDeliveryAreas(cityId: string): Promise<CityDeliveryAreas> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { id: true, name: true, state: { select: { id: true, name: true } } },
  })
  if (!city) throw new HttpError(404, 'City or LGA not found.')

  const areas = await prisma.area.findMany({
    where: { cityId },
    include: areaInclude,
    orderBy: { name: 'asc' },
  })

  return {
    city: { id: city.id, name: city.name, state: { id: city.state.id, name: city.state.name } },
    areas: areas.map(toArea),
  }
}

export async function createDeliveryArea(input: DeliveryAreaInput): Promise<DeliveryAreaWithCity> {
  const city = await prisma.city.findUnique({
    where: { id: input.cityId },
    select: { id: true },
  })
  if (!city) throw new HttpError(400, 'A valid city or LGA is required.')

  try {
    const created = await prisma.area.create({
      data: { cityId: input.cityId, name: input.name, isActive: input.isActive },
      include: areaInclude,
    })
    return toAreaWithCity(created)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'An area with this name already exists in this city or LGA.')
    }
    throw error
  }
}

export async function updateDeliveryArea(id: string, input: Omit<DeliveryAreaInput, 'cityId'>): Promise<DeliveryAreaWithCity> {
  try {
    const updated = await prisma.area.update({
      where: { id },
      data: { name: input.name, isActive: input.isActive },
      include: areaInclude,
    })
    return toAreaWithCity(updated)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'An area with this name already exists in this city or LGA.')
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Delivery area not found.')
    }
    throw error
  }
}

export async function updateDeliveryAreaStatus(id: string, isActive: boolean): Promise<DeliveryArea> {
  try {
    const area = await prisma.area.update({
      where: { id },
      data: { isActive },
    })
    return toArea(area)
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Delivery area not found.')
    }
    throw error
  }
}

// Deleting an area is safe by construction: historical orders keep their
// deliveryAreaName snapshot and the informational deliveryAreaId FK is SET NULL,
// so nothing referencing past orders is lost. The only blocker is a live zone
// assignment, which must be removed first so zones never silently lose coverage.
export async function deleteDeliveryArea(id: string): Promise<void> {
  // Deterministic guard: an area that is live-assigned to a zone must be
  // removed from the zone first, so a zone never silently loses coverage. (The
  // RESTRICT constraint would also block the delete with a raw SQLSTATE 23001,
  // which Prisma does not map to P2003, so we check explicitly.)
  const assigned = await prisma.deliveryZoneArea.findUnique({
    where: { areaId: id },
    select: { id: true },
  })
  if (assigned) {
    throw new HttpError(409, 'This area is assigned to a delivery zone. Remove it from the zone before deleting it.')
  }
  try {
    await prisma.area.delete({ where: { id } })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Delivery area not found.')
    }
    throw error
  }
}
