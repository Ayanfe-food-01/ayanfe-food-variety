import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { CityDeliveryAreas, DeliveryAreaCoverage, DeliveryAreaWithCoverage } from './delivery-zone.types.js'
import { areaInclude, coverageZoneSelect, toArea } from './delivery-location.include.js'
import { zoneCoverageLabel } from './delivery-zone-label.js'

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