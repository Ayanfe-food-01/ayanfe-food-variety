import { invalidatePattern, NAMESPACE } from '../cache/index.js'
import { listAdminDeliveryLocationStates, listPublicDeliveryLocationStates } from './delivery-location.states.service.js'

/**
 * Clears both location-tree keys (admin zone picker + public checkout picker).
 * Zones/areas are edited rarely and reference data never changes on the read
 * path, so a single pattern sweep per write keeps the pickers fresh.
 */
export const invalidateDeliveryLocationCaches = async (): Promise<void> => {
  await Promise.all([
    invalidatePattern(`${NAMESPACE}:delivery-locations:*`),
    invalidatePattern(`${NAMESPACE}:admin:delivery-locations:*`),
  ])
}

// Coalesce rapid successive writes (e.g. assign/unassign actions) into one
// invalidation + warm cycle.
const COALESCE_MS = 50
let refreshTimer: NodeJS.Timeout | null = null

/**
 * Invalidates the location-tree caches after a delivery-zone/area write and
 * immediately re-warms them in the background. Invalidation alone would make
 * the next picker open pay the full DB cost once; warming off the request path
 * keeps every subsequent read a Redis hit.
 */
export const refreshDeliveryLocationCaches = (): void => {
  if (refreshTimer) return
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void (async () => {
      await invalidateDeliveryLocationCaches()
      await Promise.allSettled([
        listAdminDeliveryLocationStates(),
        listPublicDeliveryLocationStates(),
      ])
    })()
  }, COALESCE_MS)
}