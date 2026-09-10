import type { RequestHandler } from 'express'
import { adjustStock, getInventorySummary, listInventory } from './inventory.adjust.service.js'
import { listStockMovements, getProductMovementHistory } from './inventory.history.service.js'
import {
  validateInventoryAdjustInput,
  validateStockAdjustmentQuery,
  validateInventoryQuery,
} from './inventory.validator.js'

export const adjustStockController: RequestHandler = async (request, response) => {
  const input = validateInventoryAdjustInput(request.body, request.authenticatedUser!.id)
  const result = await adjustStock(input, request.authenticatedUser!.id)
  response.json({
    success: true,
    message: 'Stock adjusted.',
    data: result,
  })
}

export const listInventoryController: RequestHandler = async (request, response) => {
  const query = validateInventoryQuery(request.query as Record<string, unknown>)
  const data = await listInventory(query)
  response.json({ success: true, data })
}

export const getInventorySummaryController: RequestHandler = async (_request, response) => {
  const summary = await getInventorySummary()
  response.json({ success: true, data: summary })
}

export const listStockMovementsController: RequestHandler = async (request, response) => {
  const query = validateStockAdjustmentQuery(request.query as Record<string, unknown>)
  const data = await listStockMovements(query)
  response.json({ success: true, data })
}

export const getProductMovementsController: RequestHandler = async (request, response) => {
  const productId = request.params.productId as string
  const productOptionId = typeof request.query.productOptionId === 'string'
    ? request.query.productOptionId
    : null
  const page = Math.max(1, Number(request.query.page ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(request.query.pageSize ?? 20)))
  const data = await getProductMovementHistory(productId, productOptionId, page, pageSize)
  response.json({ success: true, data })
}
