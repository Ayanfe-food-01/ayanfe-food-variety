import { useEffect, useState } from 'react'
import { resolveDeliveryZone, type ResolvedDeliveryZone } from '../../services/orderService'
import type { CheckoutFormData } from './types'

export function useDeliveryZoneResolution(form: CheckoutFormData) {
  const [resolvedZone, setResolvedZone] = useState<ResolvedDeliveryZone | null>(null)
  const [isZoneResolving, setIsZoneResolving] = useState(false)
  const [zoneError, setZoneError] = useState<string | null>(null)

  // Resolve the delivery zone for the selected city. Only runs when the city
  // changes with DELIVERY selected. Skips when city is empty.
  useEffect(() => {
    if (form.fulfillmentMethod !== 'DELIVERY' || !form.city.trim()) return

    let cancelled = false
    // The resolving flag must flip immediately when the city changes; this is
    // intentional and not a cascading-render concern because the fee display
    // reads it only after the async resolution settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsZoneResolving(true)

    resolveDeliveryZone(form.city, form.cityId || undefined, form.areaId || undefined)
      .then((zone) => {
        if (cancelled) return
        setResolvedZone(zone)
        setZoneError(zone ? null : 'No delivery zone covers your selected location.')
      })
      .catch(() => {
        if (cancelled) return
        setResolvedZone(null)
        setZoneError('Could not determine your delivery zone. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setIsZoneResolving(false)
      })

    return () => { cancelled = true }
  }, [form.fulfillmentMethod, form.city, form.cityId, form.areaId])

  return { resolvedZone, isZoneResolving, zoneError }
}