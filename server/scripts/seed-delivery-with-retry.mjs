// Runs the compiled delivery-location seed (dist/seed-delivery-locations.js)
// with bounded retries on transient database failures, mirroring the
// migrate-with-retry launcher. Deployed, this runs right after migrations and
// before the API starts, so states/cities reference data is always present.
//
// It exits non-zero if the seed cannot complete, aborting the deploy so the
// server never boots against an incomplete reference dataset.

import { join } from 'node:path'
import { existsSync } from 'node:fs'

const maxAttempts = 3
const retryDelaysMs = [5000, 10000]
const modulePath = join(process.cwd(), 'dist', 'seed-delivery-locations.js')

if (!existsSync(modulePath)) {
  console.error('Compiled delivery-location seed not found at', modulePath)
  console.error('Run `npm run build` before starting the server.')
  process.exit(1)
}

const runSeed = async () => {
  const { seedDeliveryLocations } = await import(modulePath)
  return seedDeliveryLocations()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isTransientDbError = (error) => {
  const code = error?.code
  return (
    typeof code === 'string' &&
    ['P1001', 'P1002', 'P1017', 'P2024', 'P2028'].includes(code)
  ) || (error?.constructor?.name ?? '').startsWith('PrismaClientConnection')
}

const main = async () => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await runSeed()
      console.log(
        `Delivery location seed complete: ${result.newStates} new states, ${result.newCities} new cities/LGAs, ${result.newMappings} new city-to-zone mappings.`,
      )
      return
    } catch (error) {
      const canRetry = isTransientDbError(error) && attempt < maxAttempts
      console.error(`Delivery location seed attempt ${attempt}/${maxAttempts} failed:`, error)
      if (!canRetry) {
        process.exitCode = 1
        return
      }
      await sleep(retryDelaysMs[attempt - 1] ?? 10000)
    }
  }
}

main()
