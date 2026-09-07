import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { DeliveryArea, DeliveryAreaInput, DeliveryAreaWithCity } from './delivery-zone.types.js'
import { areaInclude, toArea, toAreaWithCity } from './delivery-location.include.js'

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