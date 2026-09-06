import { Router } from 'express'
import {
  listActiveDeliveryZonesController,
  listPublicDeliveryLocationStatesController,
  resolveDeliveryZoneController,
} from './delivery-zone.controller.js'

export const deliveryZoneRoutes = Router()

deliveryZoneRoutes.get('/', listActiveDeliveryZonesController)
deliveryZoneRoutes.get('/resolve', resolveDeliveryZoneController)
deliveryZoneRoutes.get('/delivery-locations/states', listPublicDeliveryLocationStatesController)