// Dev/one-off runner for the delivery-location seed. Keeps the same logic as
// the production seed (src/seed-delivery-locations.ts, compiled to
// dist/seed-delivery-locations.js) so there is a single source of truth.
//
// Usage: npm run db:seed-delivery
import { seedDeliveryLocations, prisma } from '../src/seed-delivery-locations.js'

const main = async () => {
  const result = await seedDeliveryLocations()
  console.log(
    `Delivery location seed complete: ${result.newStates} new states, ${result.newCities} new cities/LGAs, ${result.newMappings} new city-to-zone mappings.`,
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
