import { prisma } from '../../config/prisma.js'
import { cacheKey, CACHE_TTL, getOrSet } from '../cache/index.js'
import type {
  AdminDeliveryLocationArea,
  DeliveryLocationArea,
  DeliveryLocationState,
} from './delivery-zone.types.js'
import { zoneCoverageLabel, type ZoneCoverage } from './delivery-zone-label.js'

// A zone's coverage as needed to build its display label (`ZoneCoverage` shape)
// plus the activity flag that determines servability.
type ZoneCoverageEntry = ZoneCoverage & { id: string; isActive: boolean }

interface CityCoverageRow {
  id: string
  name: string
  stateId: string
  deliveryZoneCity: { deliveryZoneId: string } | null
  areas: Array<{
    id: string
    name: string
    isActive: boolean
    deliveryZoneArea: { deliveryZoneId: string } | null
  }>
}

/**
 * Loads every zone's coverage once so label construction below never needs to
 * round-trip per city or per area. Zones are served from a shared Map keyed by
 * id; the shape matches what `zoneCoverageLabel` expects.
 */
async function loadZonesById(): Promise<Map<string, ZoneCoverageEntry>> {
  const zoneRows = await prisma.deliveryZone.findMany({
    select: {
      id: true,
      isActive: true,
      deliveryZoneCities: { select: { city: { select: { name: true } } } },
      deliveryZoneAreas: {
        select: { area: { select: { name: true, city: { select: { name: true } } } } },
      },
    },
  })
  return new Map(zoneRows.map((zone) => [zone.id, zone]))
}

/**
 * Builds the admin zone-picker location tree (states -> cities -> areas) with a
 * flat, bounded set of queries instead of one deeply nested include. Prisma
 * executes the nested variant as dozens of sequential round-trips that scale
 * with data volume (38 states x 776 cities), which made the "add delivery
 * zone" modal take seconds even on a healthy connection. Three queries total:
 * states, cities (with zone/area pointers), and zones (for labels + activity).
 */
export async function queryAdminDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
  const [stateRows, cityRows, zonesById] = await Promise.all([
    prisma.state.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        stateId: true,
        deliveryZoneCity: { select: { deliveryZoneId: true } },
        areas: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            isActive: true,
            deliveryZoneArea: { select: { deliveryZoneId: true } },
          },
        },
      },
    }),
    loadZonesById(),
  ])

  const citiesByStateId = new Map<string, DeliveryLocationState['cities']>()
  for (const city of cityRows) {
    const cityZone = city.deliveryZoneCity?.deliveryZoneId
      ? zonesById.get(city.deliveryZoneCity.deliveryZoneId) ?? null
      : null
    const cityZoneActive = Boolean(cityZone && cityZone.isActive)
    const adminAreas: AdminDeliveryLocationArea[] = city.areas.map((area) => {
      const areaZone = area.deliveryZoneArea?.deliveryZoneId
        ? zonesById.get(area.deliveryZoneArea.deliveryZoneId) ?? null
        : null
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
    const built: DeliveryLocationState['cities'][number] = {
      id: city.id,
      name: city.name,
      assignedZoneId: cityZone ? cityZone.id : null,
      assignedZoneLabel: cityZone ? zoneCoverageLabel(cityZone) : null,
      servable: cityZoneActive || adminAreas.some((area) => area.servable),
      adminAreas,
    }
    const bucket = citiesByStateId.get(city.stateId)
    if (bucket) {
      bucket.push(built)
    } else {
      citiesByStateId.set(city.stateId, [built])
    }
  }

  return stateRows.map((state) => {
    const cities = citiesByStateId.get(state.id) ?? []
    return {
      id: state.id,
      name: state.name,
      servable: cities.some((city) => city.servable),
      cities,
    }
  })
}

/**
 * Public checkout counterpart: the same flat, bounded query set restricted to
 * active areas. Served through Redis so the checkout location dropdown never
 * pays the full DB cost.
 */
export async function queryPublicDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
  const [stateRows, cityRows, zonesById] = await Promise.all([
    prisma.state.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.city.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        stateId: true,
        deliveryZoneCity: { select: { deliveryZoneId: true } },
        areas: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            deliveryZoneArea: { select: { deliveryZoneId: true } },
          },
        },
      },
    }),
    loadZonesById(),
  ])

  const citiesByStateId = new Map<string, DeliveryLocationState['cities']>()
  for (const city of cityRows) {
    const cityZone = city.deliveryZoneCity?.deliveryZoneId
      ? zonesById.get(city.deliveryZoneCity.deliveryZoneId) ?? null
      : null
    const cityZoneActive = Boolean(cityZone && cityZone.isActive)
    const areas: DeliveryLocationArea[] = city.areas.map((area) => {
      const areaZone = area.deliveryZoneArea?.deliveryZoneId
        ? zonesById.get(area.deliveryZoneArea.deliveryZoneId) ?? null
        : null
      return {
        id: area.id,
        name: area.name,
        servable: areaZone ? areaZone.isActive : cityZoneActive,
      }
    })
    const built: DeliveryLocationState['cities'][number] = {
      id: city.id,
      name: city.name,
      servable: cityZoneActive || areas.some((area) => area.servable),
      ...(areas.length > 0 ? { areas } : {}),
    }
    const bucket = citiesByStateId.get(city.stateId)
    if (bucket) {
      bucket.push(built)
    } else {
      citiesByStateId.set(city.stateId, [built])
    }
  }

  return stateRows.map((state) => {
    const cities = citiesByStateId.get(state.id) ?? []
    return {
      id: state.id,
      name: state.name,
      servable: cities.some((city) => city.servable),
      cities,
    }
  })
}

/**
 * Cached views of the location tree used by the admin zone picker and the
 * public checkout picker. Both are global reference data (never request- or
 * user-specific), so a 1-hour TTL plus cache invalidation on every zone/area
 * write keeps them fresh while making the pickers behave like a local read.
 */
export async function listAdminDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
  return getOrSet({
    key: cacheKey.deliveryLocationsAdmin(),
    ttlSeconds: CACHE_TTL.deliveryLocations,
    fetch: queryAdminDeliveryLocationStates,
  })
}

export async function listPublicDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
  return getOrSet({
    key: cacheKey.deliveryLocationsPublic(),
    ttlSeconds: CACHE_TTL.deliveryLocations,
    fetch: queryPublicDeliveryLocationStates,
  })
}

/**
 * Re-populates both location-tree keys. Called in the background after a write
 * invalidates them, so the admin who just saved a zone and the next customer at
 * checkout both hit a warm cache instead of the slow DB path.
 */
export async function warmDeliveryLocationCaches(): Promise<void> {
  await Promise.allSettled([
    listAdminDeliveryLocationStates(),
    listPublicDeliveryLocationStates(),
  ])
}