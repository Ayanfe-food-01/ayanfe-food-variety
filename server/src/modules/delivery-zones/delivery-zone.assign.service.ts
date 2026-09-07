import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { DeliveryZoneDetail } from './delivery-zone.types.js'
import { getAdminDeliveryZone } from './delivery-zone.list.service.js'

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