import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync } from 'node:fs'

dotenv.config({ path: path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../.env'), quiet: true })

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

// Authoritative Nigerian states -> LGAs/cities reference data. Managed as a
// single source of truth for the reference tables; real admin-configured data
// (delivery_zones, orders) is never deleted by this seed.
const STATES: Record<string, string[]> = JSON.parse(
  readFileSync(new URL('./data/nigeria-states-and-lgas.json', import.meta.url), 'utf8'),
)

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

async function main() {
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
  const canonicalNames = Object.keys(STATES)
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
  for (const [state, cities] of Object.entries(STATES)) {
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
  for (const [state, cities] of Object.entries(STATES)) {
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

  // --- 3. Map cities to delivery zones by exact city-name -> zone-name match
  // (e.g. the Lagos LGA "Surulere" -> zone "Surulere"), scoped to the zone's
  // home state. Name-only matching is unsafe because LGAs repeat across states
  // (e.g. "Surulere" exists in both Lagos and Oyo); state scoping prevents a
  // Lagos zone from being bound to an unrelated Oyo city. Existing mappings are
  // preserved; only missing, correctly-scoped ones are added.
  //
  // A delivery zone has no state field yet (Phase 1), so the home state for a
  // seeded zone is declared here. Update this map as zones are added in later
  // phases / the admin UI takes over assignment.
  const ZONE_HOME_STATE: Record<string, string> = {
    Surulere: 'Lagos',
    Kosofe: 'Lagos',
  }

  const zones = await prisma.deliveryZone.findMany({ select: { id: true, name: true } })

  // Map each zone name to the set of candidate city rows that match both the
  // zone name AND its declared home state.
  const zoneByName = new Map(zones.map((z) => [z.name, z.id]))

  let newMappingCount = 0
  const mappingsToCreate: { cityId: string; deliveryZoneId: string }[] = []
  const existingCityIds: string[] = []

  for (const [zoneName, zoneId] of zoneByName) {
    const homeState = ZONE_HOME_STATE[zoneName]
    if (!homeState) continue

    const stateRow = await prisma.state.findUnique({ where: { name: homeState }, select: { id: true } })
    if (!stateRow) continue

    const cityRows = await prisma.city.findMany({
      where: { stateId: stateRow.id, name: zoneName },
      select: { id: true },
    })
    for (const city of cityRows) {
      existingCityIds.push(city.id)
      if (!zoneId) continue
      mappingsToCreate.push({ cityId: city.id, deliveryZoneId: zoneId })
    }
  }

  // Preserve any existing mappings for these cities (skip already-mapped).
  const existingMappings = await prisma.deliveryZoneCity.findMany({
    where: { cityId: { in: existingCityIds } },
    select: { cityId: true },
  })
  const mappedCityIds = new Set(existingMappings.map((m) => m.cityId))

  const toCreate = mappingsToCreate.filter((m) => !mappedCityIds.has(m.cityId))
  newMappingCount = await chunked(toCreate, async (chunk) => {
    const result = await prisma.deliveryZoneCity.createMany({ data: chunk, skipDuplicates: true })
    return result.count
  })

  console.log(
    `Delivery location seed complete: ${newStateCount} new states, ${newCityCount} new cities/LGAs, ${newMappingCount} new city-to-zone mappings.`,
  )
}

main()
  .catch((error: unknown) => {
    console.error('Delivery location seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })