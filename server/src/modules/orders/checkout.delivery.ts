import { Prisma } from '@prisma/client'
import { HttpError } from '../../utils/http.js'
import { zoneCoverageLabel } from '../delivery-zones/delivery-zone-label.js'

// Resolves the active delivery zone that serves a selected city, using the
// State -> City -> DeliveryZoneCity -> DeliveryZone mapping (delivery redesign
// Phase 2). Returns null when the city is not yet mapped so callers can fall
// back to the previously selected deliveryZoneId (backward compatible).
const ZONE_SELECT = {
  id: true,
  fee: true,
  freeDeliveryThreshold: true,
  minDeliveryDays: true,
  maxDeliveryDays: true,
  isActive: true,
  deliveryZoneCities: { select: { city: { select: { name: true } } } },
  deliveryZoneAreas: { select: { area: { select: { name: true, city: { select: { name: true } } } } } },
} satisfies Prisma.DeliveryZoneSelect

type CheckoutZone = {
  id: string
  fee: Prisma.Decimal
  freeDeliveryThreshold: Prisma.Decimal | null
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
  isActive: boolean
  label: string
}

const toCheckoutZone = (zone: {
  id: string
  fee: Prisma.Decimal
  freeDeliveryThreshold: Prisma.Decimal | null
  minDeliveryDays: number | null
  maxDeliveryDays: number | null
  isActive: boolean
  deliveryZoneCities: Array<{ city: { name: string } }>
  deliveryZoneAreas: Array<{ area: { name: string; city: { name: string } } }>
} | null): CheckoutZone | null => {
  if (!zone) return null
  return {
    ...zone,
    label: zoneCoverageLabel(zone),
  }
}

const resolveZoneForCityId = async (tx: Prisma.TransactionClient, cityId: string): Promise<CheckoutZone | null> => {
  const match = await tx.city.findUnique({
    where: { id: cityId },
    select: { deliveryZoneCity: { select: { deliveryZone: { select: ZONE_SELECT } } } },
  })
  return toCheckoutZone(match?.deliveryZoneCity?.deliveryZone ?? null)
}

// Resolves the zone for an area when the customer picked a specific area. An
// area that is explicitly assigned to a zone uses that zone (so areas inside
// one LGA can be priced differently); an unassigned area inherits its city's
// zone, keeping the pre-area behaviour for LGAs without defined areas.
const resolveZoneForAreaId = async (tx: Prisma.TransactionClient, cityId: string, areaId: string): Promise<CheckoutZone | null> => {
  // The area was already validated (active, matching its city) by the caller,
  // so this lookup only needs its zone mapping and the city-level fallback.
  const match = await tx.area.findUnique({
    where: { id: areaId },
    select: {
      deliveryZoneArea: { select: { deliveryZone: { select: ZONE_SELECT } } },
      city: { select: { deliveryZoneCity: { select: { deliveryZone: { select: ZONE_SELECT } } } } },
    },
  })
  if (!match || !match.deliveryZoneArea) {
    return resolveZoneForCityId(tx, cityId)
  }
  return toCheckoutZone(match.deliveryZoneArea.deliveryZone)
}

// Resolves the authoritative delivery zone and location for a checkout delivery
// request. Preference order:
//   1. areaId - the active area whose zone applies: its own zone when the area
//      is explicitly assigned one, otherwise its LGA's zone.
//   2. cityId - exact city lookup (preferred by the new checkout flow).
//   3. cityName - legacy name-based lookup; a name that matches no City row keeps
//      the name for the order snapshot and resolves no zone.
// The supplied identifiers are cross-checked as anti-tamper validation: an area
// must belong to the supplied city, and any supplied state/city ids or names
// must agree with the resolved location, otherwise the request is rejected.
// Returns the zone (possibly null when the location has no mapped active zone)
// together with the location facts the order snapshot needs.
export const resolveCheckoutDelivery = async (
  tx: Prisma.TransactionClient,
  location: { areaId?: string; cityId?: string; cityName?: string; stateId?: string },
): Promise<{
  zone: CheckoutZone | null
  area: { id: string; name: string } | null
  cityName: string | null
  stateName: string | null
}> => {
  let cityIdToUse: string | null = null
  let cityNameToUse: string | null = null
  let stateIdToUse: string | null = null
  let stateNameToUse: string | null = null
  let area: { id: string; name: string } | null = null
  const CITY_STATE_SELECT = { id: true, name: true, state: { select: { id: true, name: true } } }

  if (location.areaId) {
    const areaRow = await tx.area.findUnique({
      where: { id: location.areaId },
      select: { id: true, name: true, isActive: true, cityId: true, city: { select: CITY_STATE_SELECT } },
    })
    if (!areaRow) throw new HttpError(400, 'Please choose your delivery area again.')
    if (!areaRow.isActive) {
      throw new HttpError(409, 'Delivery is not currently available for your selected area.')
    }
    let matchesCity = true
    if (location.cityId) {
      matchesCity = areaRow.cityId === location.cityId
    } else if (location.cityName) {
      const cityByName = await tx.city.findFirst({
        where: { name: { equals: location.cityName, mode: 'insensitive' } },
        select: { id: true },
      })
      matchesCity = cityByName?.id === areaRow.cityId
    }
    if (!matchesCity) {
      throw new HttpError(400, 'The selected delivery area does not match the selected city.')
    }
    cityIdToUse = areaRow.cityId
    cityNameToUse = areaRow.city.name
    stateIdToUse = areaRow.city.state.id
    stateNameToUse = areaRow.city.state.name
    area = { id: areaRow.id, name: areaRow.name }
  } else if (location.cityId) {
    const city = await tx.city.findUnique({ where: { id: location.cityId }, select: CITY_STATE_SELECT })
    if (city) {
      cityIdToUse = city.id
      cityNameToUse = city.name
      stateIdToUse = city.state.id
      stateNameToUse = city.state.name
    }
  } else if (location.cityName) {
    const city = await tx.city.findFirst({
      where: { name: { equals: location.cityName, mode: 'insensitive' } },
      select: CITY_STATE_SELECT,
    })
    if (city) {
      cityIdToUse = city.id
      cityNameToUse = city.name
      stateIdToUse = city.state.id
      stateNameToUse = city.state.name
    } else {
      cityNameToUse = location.cityName
    }
  }

  // Anti-tamper: a supplied stateId must match the state of the resolved city.
  if (location.stateId && stateIdToUse && location.stateId !== stateIdToUse) {
    throw new HttpError(400, 'The selected state does not match the selected city.')
  }
  // Anti-tamper: a resolved city must agree with every supplied city reference.
  if (location.cityId && cityIdToUse && location.cityId !== cityIdToUse) {
    throw new HttpError(400, 'The selected city does not match the selected delivery area.')
  }
  if (location.cityName && cityIdToUse && cityNameToUse) {
    const suppliedName = location.cityName.trim()
    if (!suppliedName || cityNameToUse.toLowerCase() !== suppliedName.toLowerCase()) {
      throw new HttpError(400, 'The selected city does not match the selected delivery area.')
    }
  }

  const zone = cityIdToUse
    ? (area ? await resolveZoneForAreaId(tx, cityIdToUse, area.id) : await resolveZoneForCityId(tx, cityIdToUse))
    : null
  return { zone, area, cityName: cityNameToUse, stateName: stateNameToUse }
}
