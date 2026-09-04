import type { RequestHandler } from 'express'
import {
  assignCityToZone,
  createDeliveryArea,
  createDeliveryZone,
  deleteDeliveryArea,
  deleteDeliveryZone,
  getAdminDeliveryZone,
  listActiveDeliveryZones,
  listAdminDeliveryZones,
  listCityDeliveryAreas,
  listAdminDeliveryLocationStates,
  listPublicDeliveryLocationStates,
  reorderDeliveryZones,
  resolveDeliveryZoneByCity,
  unassignCityFromZone,
  updateDeliveryArea,
  updateDeliveryAreaStatus,
  updateDeliveryZone,
  updateDeliveryZoneStatus,
} from './delivery-zone.service.js'
import {
  validateAdminDeliveryZonesQuery,
  validateAssignZoneCityInput,
  validateCityId,
  validateDeliveryAreaId,
  validateDeliveryAreaInput,
  validateDeliveryAreaStatusInput,
  validateDeliveryAreaUpdateInput,
  validateDeliveryCityName,
  validateDeliveryZoneId,
  validateDeliveryZoneInput,
  validateDeliveryZoneStatusInput,
  validateReorderDeliveryZonesInput,
} from './delivery-zone.validator.js'

export const listActiveDeliveryZonesController: RequestHandler = async (_request, response) => {
  response.json({ data: await listActiveDeliveryZones() })
}

export const listAdminDeliveryZonesController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listAdminDeliveryZones(validateAdminDeliveryZonesQuery(request.query as Record<string, unknown>)),
  })
}

export const getAdminDeliveryZoneController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: { zone: await getAdminDeliveryZone(validateDeliveryZoneId(request.params.id)) },
  })
}

export const createAdminDeliveryZoneController: RequestHandler = async (request, response) => {
  response.status(201).json({
    success: true,
    message: 'Delivery zone created.',
    data: { zone: await createDeliveryZone(validateDeliveryZoneInput(request.body)) },
  })
}

export const updateAdminDeliveryZoneController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Delivery zone updated.',
    data: {
      zone: await updateDeliveryZone(
        validateDeliveryZoneId(request.params.id),
        validateDeliveryZoneInput(request.body),
      ),
    },
  })
}

export const updateAdminDeliveryZoneStatusController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Delivery zone status updated.',
    data: {
      zone: await updateDeliveryZoneStatus(
        validateDeliveryZoneId(request.params.id),
        validateDeliveryZoneStatusInput(request.body),
      ),
    },
  })
}

export const deleteAdminDeliveryZoneController: RequestHandler = async (request, response) => {
  await deleteDeliveryZone(validateDeliveryZoneId(request.params.id))
  response.json({ success: true, message: 'Delivery zone deleted.' })
}

export const reorderAdminDeliveryZonesController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Delivery zone order updated.',
    data: {
      zones: await reorderDeliveryZones(validateReorderDeliveryZonesInput(request.body).zoneIds),
    },
  })
}

export const listAdminDeliveryLocationStatesController: RequestHandler = async (_request, response) => {
  response.json({
    success: true,
    data: { states: await listAdminDeliveryLocationStates() },
  })
}

export const listPublicDeliveryLocationStatesController: RequestHandler = async (_request, response) => {
  response.json({
    success: true,
    data: { states: await listPublicDeliveryLocationStates() },
  })
}

export const assignCityToZoneController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'City assigned to delivery zone.',
    data: {
      zone: await assignCityToZone(
        validateDeliveryZoneId(request.params.id),
        validateAssignZoneCityInput(request.body).cityId,
      ),
    },
  })
}

export const unassignCityFromZoneController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'City removed from delivery zone.',
    data: {
      zone: await unassignCityFromZone(
        validateDeliveryZoneId(request.params.id),
        validateCityId(request.params.cityId),
      ),
    },
  })
}
export const resolveDeliveryZoneController: RequestHandler = async (request, response) => {
  const city = validateDeliveryCityName(request.query.city)
  const cityId = typeof request.query.cityId === 'string' && request.query.cityId.trim()
    ? validateCityId(request.query.cityId)
    : undefined
  response.json({
    success: true,
    data: { zone: await resolveDeliveryZoneByCity(city, cityId) },
  })
}

export const listCityDeliveryAreasController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listCityDeliveryAreas(validateCityId(request.params.cityId)),
  })
}

export const createAdminDeliveryAreaController: RequestHandler = async (request, response) => {
  response.status(201).json({
    success: true,
    message: 'Delivery area created.',
    data: { area: await createDeliveryArea(validateDeliveryAreaInput(request.body)) },
  })
}

export const updateAdminDeliveryAreaController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Delivery area updated.',
    data: {
      area: await updateDeliveryArea(
        validateDeliveryAreaId(request.params.id),
        validateDeliveryAreaUpdateInput(request.body),
      ),
    },
  })
}

export const updateAdminDeliveryAreaStatusController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Delivery area status updated.',
    data: {
      area: await updateDeliveryAreaStatus(
        validateDeliveryAreaId(request.params.id),
        validateDeliveryAreaStatusInput(request.body),
      ),
    },
  })
}

export const deleteAdminDeliveryAreaController: RequestHandler = async (request, response) => {
  await deleteDeliveryArea(validateDeliveryAreaId(request.params.id))
  response.json({ success: true, message: 'Delivery area deleted.' })
}
