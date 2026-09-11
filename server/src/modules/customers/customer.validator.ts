import { HttpError } from '../../utils/http.js'
import { normalizeSearchQuery } from '../../utils/search.js'
import type {
  AdminCustomersQuery,
  CustomerSort,
  CustomerStatusFilter,
} from './customer.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const parseNonNegativeInteger = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === '') return undefined
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0) throw new HttpError(400, `${field} is invalid.`)
  return number
}

export const validateCustomerId = (value: unknown): string => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw new HttpError(400, 'Customer id is invalid.')
  }
  return value.trim()
}

export function validateAdminCustomersQuery(query: Record<string, unknown>): AdminCustomersQuery {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 20)
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'Page must be a positive integer.')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new HttpError(400, 'Page size must be between 1 and 50.')

  const statusValue = query.status
  let status: CustomerStatusFilter | undefined = undefined
  if (statusValue !== undefined && statusValue !== '') {
    if (statusValue !== 'active' && statusValue !== 'inactive') {
      throw new HttpError(400, 'Customer status is invalid.')
    }
    status = statusValue
  }

  const minOrders = parseNonNegativeInteger(query.minOrders, 'Minimum order count')
  const maxOrders = parseNonNegativeInteger(query.maxOrders, 'Maximum order count')
  if (minOrders !== undefined && maxOrders !== undefined && minOrders > maxOrders) {
    throw new HttpError(400, 'Minimum order count cannot exceed the maximum.')
  }

  let lastOrder: number | 'older' | undefined
  if (query.lastOrder !== undefined && query.lastOrder !== '') {
    if (query.lastOrder === 'older') {
      lastOrder = 'older'
    } else {
      const value = Number(query.lastOrder)
      if (![7, 30, 90, 180].includes(value)) throw new HttpError(400, 'Last order range is invalid.')
      lastOrder = value
    }
  }

  const sortValue = typeof query.sort === 'string' ? query.sort : 'recent'
  const sort: CustomerSort = ['spend', 'orders', 'newest'].includes(sortValue)
    ? (sortValue as CustomerSort)
    : 'recent'

  return {
    search: normalizeSearchQuery(query.search, 120),
    status,
    minOrders,
    maxOrders,
    lastOrder,
    sort,
    page,
    pageSize,
  }
}