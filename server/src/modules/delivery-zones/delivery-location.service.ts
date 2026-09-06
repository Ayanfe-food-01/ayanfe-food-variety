import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminDeliveryLocationArea,
  CityDeliveryAreas,
  DeliveryArea,
  DeliveryAreaCoverage,
  DeliveryAreaInput,
  DeliveryAreaWithCity,
  DeliveryAreaWithCoverage,
  DeliveryLocationArea,
  DeliveryLocationState,
} from './delivery-zone.types.js'
import { zoneCoverageLabel } from './delivery-zone-label.js'

const coverageZoneSelect = {
  id: true,
  fee: true,
  deliveryZoneCities: { select: { city: { select: { name: true } } } },
  deliveryZoneAreas: { select: { area: { select: { name: true, city: { select: { name: true } } } } } },
} satisfies Prisma.DeliveryZoneSelect

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

async function buildAreaCoverageMap(cityId: string, areaIds: string[]): Promise<Map<string, DeliveryAreaCoverage>> {
  const coverages = new Map<string, DeliveryAreaCoverage>()
  if (areaIds.length === 0) return coverages

  const assigned = await prisma.deliveryZoneArea.findMany({
    where: { areaId: { in: areaIds } },
    select: { areaId: true, deliveryZone: { select: coverageZoneSelect } },
  })
  for (const entry of assigned) {
    coverages.set(entry.areaId, {
      zoneId: entry.deliveryZone.id,
      zoneLabel: zoneCoverageLabel(entry.deliveryZone),
      zoneFee: entry.deliveryZone.fee.toFixed(2),
      via: 'area',
    })
  }

  const cityZone = await prisma.deliveryZoneCity.findUnique({
    where: { cityId },
    select: { deliveryZone: { select: coverageZoneSelect } },
  })
  if (cityZone) {
    const coverage: DeliveryAreaCoverage = {
      zoneId: cityZone.deliveryZone.id,
      zoneLabel: zoneCoverageLabel(cityZone.deliveryZone),
      zoneFee: cityZone.deliveryZone.fee.toFixed(2),
      via: 'lga',
    }
    for (const areaId of areaIds) {
      if (!coverages.has(areaId)) coverages.set(areaId, coverage)
    }
  }
  return coverages
}

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
  const coverageByArea = await buildAreaCoverageMap(
    cityId,
    areas.map((area) => area.id),
  )

  return {
    city: { id: city.id, name: city.name, state: { id: city.state.id, name: city.state.name } },
    areas: areas.map((area): DeliveryAreaWithCoverage => ({
      ...toArea(area),
      coveredBy: coverageByArea.get(area.id) ?? null,
    })),
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
