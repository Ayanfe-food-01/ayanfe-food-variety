import { prisma } from '../../config/prisma.js'
import type {
  AdminDeliveryLocationArea,
  DeliveryLocationArea,
  DeliveryLocationState,
} from './delivery-zone.types.js'
import { zoneCoverageLabel } from './delivery-zone-label.js'

export async function listAdminDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
  const states = await prisma.state.findMany({
    orderBy: { name: 'asc' },
    include: {
      cities: {
        select: {
          id: true,
          name: true,
          deliveryZoneCity: {
            select: {
              deliveryZone: {
                select: {
                  id: true,
                  isActive: true,
                  deliveryZoneCities: { select: { city: { select: { id: true, name: true } } } },
                  deliveryZoneAreas: {
                    select: { area: { select: { id: true, name: true, city: { select: { name: true } } } } },
                  },
                },
              },
            },
          },
          areas: {
            select: {
              id: true,
              name: true,
              isActive: true,
              deliveryZoneArea: {
                select: {
                  deliveryZone: {
                    select: {
                      id: true,
                      isActive: true,
                      deliveryZoneCities: { select: { city: { select: { id: true, name: true } } } },
                      deliveryZoneAreas: {
                        select: { area: { select: { id: true, name: true, city: { select: { name: true } } } } },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  })
  return states.map((state) => {
    const cities = state.cities.map((city) => {
      const zone = city.deliveryZoneCity?.deliveryZone ?? null
      const cityZoneActive = Boolean(zone && zone.isActive)
      const adminAreas: AdminDeliveryLocationArea[] = city.areas.map((area) => {
        const areaZone = area.deliveryZoneArea?.deliveryZone ?? null
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
      return {
        id: city.id,
        name: city.name,
        assignedZoneId: zone ? zone.id : null,
        assignedZoneLabel: zone ? zoneCoverageLabel(zone) : null,
        servable: cityZoneActive || adminAreas.some((area) => area.servable),
        adminAreas,
      }
    })
    return {
      id: state.id,
      name: state.name,
      servable: cities.some((city) => city.servable),
      cities,
    }
  })
}

export async function listPublicDeliveryLocationStates(): Promise<DeliveryLocationState[]> {
  const states = await prisma.state.findMany({
    orderBy: { name: 'asc' },
    include: {
      cities: {
        select: {
          id: true,
          name: true,
          deliveryZoneCity: {
            select: {
              deliveryZone: {
                select: {
                  id: true,
                  isActive: true,
                  deliveryZoneCities: { select: { city: { select: { id: true, name: true } } } },
                  deliveryZoneAreas: {
                    select: { area: { select: { id: true, name: true, city: { select: { name: true } } } } },
                  },
                },
              },
            },
          },
          areas: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              deliveryZoneArea: {
                select: {
                  deliveryZone: {
                    select: {
                      id: true,
                      isActive: true,
                      deliveryZoneCities: { select: { city: { select: { id: true, name: true } } } },
                      deliveryZoneAreas: {
                        select: { area: { select: { id: true, name: true, city: { select: { name: true } } } } },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  })
  return states.map((state) => {
    const cities = state.cities.map((city) => {
      const zone = city.deliveryZoneCity?.deliveryZone ?? null
      const cityZoneActive = Boolean(zone && zone.isActive)
      const areas: DeliveryLocationArea[] = city.areas.map((area) => {
        const areaZone = area.deliveryZoneArea?.deliveryZone ?? null
        return {
          id: area.id,
          name: area.name,
          servable: areaZone ? areaZone.isActive : cityZoneActive,
        }
      })
      return {
        id: city.id,
        name: city.name,
        servable: cityZoneActive || areas.some((area) => area.servable),
        ...(areas.length > 0 ? { areas } : {}),
      }
    })
    return {
      id: state.id,
      name: state.name,
      servable: cities.some((city) => city.servable),
      cities,
    }
  })
}