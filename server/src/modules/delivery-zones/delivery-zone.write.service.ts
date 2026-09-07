import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { DeliveryZone, DeliveryZoneInput } from './delivery-zone.types.js'
import { orderByDisplay, toZone, zoneInclude, type CoverageInput } from './delivery-zone.mapper.js'
import { getAdminDeliveryZone } from './delivery-zone.list.service.js'

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