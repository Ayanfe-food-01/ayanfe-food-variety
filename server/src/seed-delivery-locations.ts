/**
 * Delivery location seed (compiled, production-safe)
 *
 * Upserts the authoritative Nigerian states -> LGAs/cities reference data and
 * maps the seeded cities to delivery zones. This is a compiled copy of the
 * logic in prisma/seed/seed-delivery-locations.ts, shipped with the server
 * build so deployments can seed reference data without tsx or a runtime JSON
 * file.
 *
 * It is idempotent and safe to run on every deploy:
 *  - Creates only missing states/cities (skip duplicates).
 *  - Reconciles away renamed/removed LGAs only when not bound to a zone.
 *  - Maps cities to delivery zones only when not already mapped.
 *  - Never deletes admin-configured delivery zones or orders.
 *
 * This module does not call process.exit so it can also be imported and reused
 * by the server startup flow.
 */

import { prisma } from './lib/prisma.js'
import { NIGERIAN_STATES_AND_LGAS } from './seed-data/nigeria.js'

// States seeded by an earlier, smaller curated seed whose names conflict with
// the canonical spellings below. These were only ever created by that seed (no
// order or delivery-zone references), so removing them before syncing in the
// canonical rows is safe and idempotent.
const LEGACY_RENAMED_STATES = new Set(['FCT', 'Nasarawa'])

// Batched writes keep the payloads small and reliable over a pooled connection.
const CHUNK_SIZE = 150

async function chunked<T>(items: T[], fn: (chunk: T[]) => Promise<number>): Promise<number> {
  let total = 0
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    total += await fn(items.slice(i, i + CHUNK_SIZE))
  }
  return total
}

export async function seedDeliveryLocations(): Promise<{
  newStates: number
  newCities: number
  newMappings: number
}> {
  // --- 0. Drop renamed legacy seed states (with their cities) so the canonical
  // names are not duplicated. Only these known seed-only states and only when
  // they have no delivery-zone mapping. ---
  const legacyRows = await prisma.state.findMany({
    where: { name: { in: Array.from(LEGACY_RENAMED_STATES) } },
    select: { id: true, name: true },
  })
  for (const legacy of legacyRows) {
    const mapping = await prisma.deliveryZoneCity.findFirst({
      where: { city: { stateId: legacy.id } },
      select: { id: true },
    })
    if (mapping) continue
    await prisma.city.deleteMany({ where: { stateId: legacy.id } })
    await prisma.state.delete({ where: { id: legacy.id } })
  }

  // --- 1. Upsert all states ---
  const canonicalNames = Object.keys(NIGERIAN_STATES_AND_LGAS)
  const existingStates = await prisma.state.findMany({ select: { name: true } })
  const existingStateNames = new Set(existingStates.map((s) => s.name))

  const statesToCreate: { name: string; sortOrder: number }[] = []
  const statesToReorder: { name: string; sortOrder: number }[] = []

  canonicalNames.forEach((state, index) => {
    const sortOrder = index + 1
    if (existingStateNames.has(state)) statesToReorder.push({ name: state, sortOrder })
    else statesToCreate.push({ name: state, sortOrder })
  })

  let newStateCount = 0
  if (statesToCreate.length > 0) {
    const result = await prisma.state.createMany({ data: statesToCreate, skipDuplicates: true })
    newStateCount = result.count
  }
  if (statesToReorder.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "states" SET "sort_order" = v."sort_order" FROM (VALUES ${statesToReorder.map((s) => `('${s.name}', ${s.sortOrder})`).join(', ')}) AS v("name", "sort_order") WHERE "states"."name" = v."name"`,
    )
  }

  // --- 2. Upsert all cities/LGAs (batched, skip duplicates) ---
  const allStates = await prisma.state.findMany({ select: { id: true, name: true } })
  const stateIdByName = new Map(allStates.map((s) => [s.name, s.id]))

  const citiesToCreate: { stateId: string; name: string }[] = []
  for (const [state, cities] of Object.entries(NIGERIAN_STATES_AND_LGAS)) {
    const stateId = stateIdByName.get(state)
    if (!stateId) continue
    for (const name of cities) citiesToCreate.push({ stateId, name })
  }

  const newCityCount = await chunked(citiesToCreate, async (chunk) => {
    const result = await prisma.city.createMany({ data: chunk, skipDuplicates: true })
    return result.count
  })

  // --- 2b. Reconcile: drop cities that are no longer in the canonical list for
  // their state (e.g. renamed/removed LGAs), as long as they are not bound to a
  // delivery zone. This keeps the reference data authoritative across seed runs
  // without ever touching admin-mapped cities. ---
  for (const [state, cities] of Object.entries(NIGERIAN_STATES_AND_LGAS)) {
    const stateId = stateIdByName.get(state)
    if (!stateId) continue
    const canonical = new Set(cities)
    const existingCities = await prisma.city.findMany({
      where: { stateId },
      select: { id: true, name: true },
    })
    const toRemove = existingCities.filter((c) => !canonical.has(c.name)).map((c) => c.id)
    if (toRemove.length === 0) continue

    const mapped = await prisma.deliveryZoneCity.findMany({
      where: { cityId: { in: toRemove } },
      select: { cityId: true },
    })
    const mappedSet = new Set(mapped.map((m) => m.cityId))
    const safeToRemove = toRemove.filter((id) => !mappedSet.has(id))

    await chunked(safeToRemove, async (chunk) => {
      await prisma.city.deleteMany({ where: { id: { in: chunk } } })
      return chunk.length
    })
  }

  // --- 3. Map cities to delivery zones. ---
  const ZONE_CITIES_BY_SORT_ORDER: Record<number, string[]> = {
    1: ['Kosofe'],
    2: ['Surulere'],
  }

  const zones = await prisma.deliveryZone.findMany({
    select: { id: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  })

  const mappingsToCreate: { cityId: string; deliveryZoneId: string }[] = []
  const candidateCityIds: string[] = []

  for (const zone of zones) {
    const cityNames = ZONE_CITIES_BY_SORT_ORDER[zone.sortOrder]
    if (!cityNames) continue
    const cityRows = await prisma.city.findMany({
      where: { name: { in: cityNames } },
      select: { id: true },
    })
    for (const city of cityRows) {
      candidateCityIds.push(city.id)
      mappingsToCreate.push({ cityId: city.id, deliveryZoneId: zone.id })
    }
  }

  const existingMappings = await prisma.deliveryZoneCity.findMany({
    where: { cityId: { in: candidateCityIds } },
    select: { cityId: true },
  })
  const mappedCityIds = new Set(existingMappings.map((m) => m.cityId))

  const toCreate = mappingsToCreate.filter((m) => !mappedCityIds.has(m.cityId))
  let newMappingCount = 0
  newMappingCount = await chunked(toCreate, async (chunk) => {
    const result = await prisma.deliveryZoneCity.createMany({ data: chunk, skipDuplicates: true })
    return result.count
  })

  return { newStates: newStateCount, newCities: newCityCount, newMappings: newMappingCount }
}

export { prisma }
