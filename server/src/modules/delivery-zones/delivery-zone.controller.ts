import type { RequestHandler } from 'express'
import {
  createDeliveryZone,
  deleteDeliveryZone,
  getAdminDeliveryZone,
  listActiveDeliveryZones,
  listAdminDeliveryZones,
  reorderDeliveryZones,
  updateDeliveryZone,
  updateDeliveryZoneStatus,
} from './delivery-zone.service.js'
import {
  validateAdminDeliveryZonesQuery,
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