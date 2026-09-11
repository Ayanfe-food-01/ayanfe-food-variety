import type { RequestHandler } from 'express'
import { getCustomerDetail, listAdminCustomers } from './customer.service.js'
import { validateAdminCustomersQuery, validateCustomerId } from './customer.validator.js'

export const listAdminCustomersController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listAdminCustomers(validateAdminCustomersQuery(request.query as Record<string, unknown>)),
  })
}

export const getAdminCustomerController: RequestHandler = async (request, response) => {
  const id = validateCustomerId(request.params.id)
  response.json({ success: true, data: { customer: await getCustomerDetail(id) } })
}