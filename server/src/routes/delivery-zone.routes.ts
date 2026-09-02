import { Router } from 'express'
import { listActiveDeliveryZonesController } from '../modules/delivery-zones/delivery-zone.controller.js'

export const deliveryZoneRoutes = Router()

deliveryZoneRoutes.get('/', listActiveDeliveryZonesController)