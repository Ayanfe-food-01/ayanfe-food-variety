import { Router } from 'express'
import {
  adjustStockController,
  listInventoryController,
  getInventorySummaryController,
  listStockMovementsController,
  getProductMovementsController,
} from './inventory.controller.js'

export const inventoryRoutes = Router()

inventoryRoutes.get('/', listInventoryController)
inventoryRoutes.get('/summary', getInventorySummaryController)
inventoryRoutes.get('/movements', listStockMovementsController)
inventoryRoutes.get('/movements/:productId', getProductMovementsController)
inventoryRoutes.post('/adjust', adjustStockController)
