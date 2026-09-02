import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  AdminDeliveryZonesQuery,
  DeliveryZone,
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

export async function getAdminDeliveryZone(id: string): Promise<DeliveryZone> {
  const zone = await prisma.deliveryZone.findUnique({ where: { id } })
  if (!zone) throw new HttpError(404, 'Delivery zone not found.')
  return toDeliveryZone(zone)
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