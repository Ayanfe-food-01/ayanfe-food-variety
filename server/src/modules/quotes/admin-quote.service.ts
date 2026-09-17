import { Prisma, QuoteRequestStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { buildSearchWhere, type SearchFieldConfig } from '../../utils/search.js'
import type { AdminQuoteRequest, AdminQuoteRequestListItem, QuoteRequestPage, QuoteRequestQuery } from './quote.types.js'
import { quoteDetailInclude, type QuoteRequestWithItems } from './quote.service.js'
import { toAdminDetail, toAdminListItem } from './admin-quote.mapper.js'

export { toAdminDetail, toAdminListItem } from './admin-quote.mapper.js'
export type { AdminQuoteRequest, AdminQuoteRequestListItem, QuoteRequestPage, QuoteRequestQuery, PrepareQuotePricingInput } from './quote.types.js'
export { prepareQuotePricing } from './admin-quote.prepare.service.js'

const ADMIN_QUOTE_SEARCH_FIELDS: SearchFieldConfig[] = [
  { path: 'quoteNumber', primary: true, weight: 2 },
  { path: 'customerName', primary: true, weight: 2 },
  { path: 'customerEmail', weight: 0.6 },
  { path: 'customerPhone', weight: 0.6 },
]

export async function listAdminQuoteRequests(query: QuoteRequestQuery): Promise<QuoteRequestPage> {
  const where: Prisma.QuoteRequestWhereInput = {
    ...(buildSearchWhere<Prisma.QuoteRequestWhereInput>(query.search, ADMIN_QUOTE_SEARCH_FIELDS) ?? {}),
    ...(query.status ? { status: query.status } : {}),
  }

  const [total, quoteRequests] = await Promise.all([
    prisma.quoteRequest.count({ where }),
    prisma.quoteRequest.findMany({
      where,
      orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        quoteNumber: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        shoppingMode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true } },
      },
    }),
  ])

  return {
    quoteRequests: quoteRequests.map(toAdminListItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

export async function getAdminQuoteRequest(reference: string): Promise<AdminQuoteRequest> {
  const quoteRequest = await prisma.quoteRequest.findUnique({
    where: { quoteNumber: reference },
    include: quoteDetailInclude,
  })
  if (!quoteRequest) throw new HttpError(404, 'Quote request not found.')
  const detail = toAdminDetail(quoteRequest)

  if (detail.items.length > 0) {
    const productIds = [...new Set(detail.items.map((item) => item.productId))]
    const optionIds = [...new Set(detail.items.flatMap((item) => (item.productOptionId ? [item.productOptionId] : [])))]
    const [products, options] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          price: true,
          wholesalePackages: { where: { isActive: true }, select: { productOptionId: true, price: true } },
        },
      }),
      optionIds.length > 0
        ? prisma.productOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, price: true } })
        : Promise.resolve([]),
    ])
    const productsById = new Map(products.map((product) => [product.id, product]))
    const optionsById = new Map(options.map((option) => [option.id, option]))

    detail.items = detail.items.map((item) => {
      const product = productsById.get(item.productId)
      const option = item.productOptionId ? optionsById.get(item.productOptionId) : undefined
      const retail = option?.price ?? product?.price ?? null
      const packages = (product?.wholesalePackages ?? []).filter(
        (pkg) => pkg.productOptionId === null || pkg.productOptionId === item.productOptionId,
      )
      const wholesale = packages.length > 0
        ? packages.map((pkg) => pkg.price).reduce((lowest, next) => (next.lt(lowest) ? next : lowest)).toString()
        : null
      return {
        ...item,
        priceHint: {
          retail: retail === null ? null : retail.toString(),
          wholesale,
        },
      }
    })
  }

  return detail
}

const allowedTransitions: Record<QuoteRequestStatus, readonly QuoteRequestStatus[]> = {
  [QuoteRequestStatus.PENDING]: [QuoteRequestStatus.CONTACTED, QuoteRequestStatus.CANCELLED],
  [QuoteRequestStatus.CONTACTED]: [QuoteRequestStatus.CANCELLED],
  [QuoteRequestStatus.QUOTED]: [QuoteRequestStatus.CANCELLED],
  [QuoteRequestStatus.ACCEPTED]: [QuoteRequestStatus.COMPLETED, QuoteRequestStatus.CANCELLED],
  [QuoteRequestStatus.COMPLETED]: [],
  [QuoteRequestStatus.CANCELLED]: [],
}

export async function updateAdminQuoteRequestStatus(
  reference: string,
  status: QuoteRequestStatus,
  reason?: string,
): Promise<AdminQuoteRequest> {
  const existing = await prisma.quoteRequest.findUnique({ where: { quoteNumber: reference } })
  if (!existing) throw new HttpError(404, 'Quote request not found.')
  if (existing.status === status) return getAdminQuoteRequest(reference)

  if (!allowedTransitions[existing.status].includes(status)) {
    throw new HttpError(409, `Quote status cannot change from ${existing.status} to ${status}.`)
  }

  if (status === QuoteRequestStatus.CANCELLED) {
    if (!reason?.trim()) {
      throw new HttpError(400, 'A reason is required when cancelling a quote request.')
    }
  }

  const data: Prisma.QuoteRequestUpdateInput = { status }
  if (status === QuoteRequestStatus.CANCELLED) {
    data.cancelledAt = new Date()
    data.cancelledReason = reason!.trim()
  }
  if (status === QuoteRequestStatus.COMPLETED) {
    data.completedAt = new Date()
  }

  await prisma.quoteRequest.update({ where: { id: existing.id }, data })
  return getAdminQuoteRequest(reference)
}

/**
 * Returns a prepared quotation back to the contacted stage and clears the
 * saved pricing snapshot so the admin can prepare a corrected one.
 */
export async function reviseQuotePricing(reference: string): Promise<AdminQuoteRequest> {
  const existing = await prisma.quoteRequest.findUnique({ where: { quoteNumber: reference } })
  if (!existing) throw new HttpError(404, 'Quote request not found.')

  await prisma.$transaction(async (transaction) => {
    const cleared = await transaction.quoteRequest.updateMany({
      where: { id: existing.id, status: QuoteRequestStatus.QUOTED },
      data: {
        status: QuoteRequestStatus.CONTACTED,
        fulfillmentMethod: null,
        quotedSubtotal: null,
        deliveryFee: null,
        quotedTotal: null,
        quotedAt: null,
      },
    })
    if (cleared.count !== 1) {
      throw new HttpError(409, 'A quotation can only be revised after it has been prepared.')
    }
    await transaction.quoteRequestItem.updateMany({
      where: { quoteRequestId: existing.id },
      data: { quotedUnitPrice: null },
    })
  })

  return getAdminQuoteRequest(reference)
}

export async function updateAdminQuoteRequestNote(
  reference: string,
  note: string,
): Promise<AdminQuoteRequest> {
  const existing = await prisma.quoteRequest.findUnique({ where: { quoteNumber: reference } })
  if (!existing) throw new HttpError(404, 'Quote request not found.')
  if (existing.adminNote === note) return getAdminQuoteRequest(reference)

  await prisma.quoteRequest.update({
    where: { id: existing.id },
    data: { adminNote: note },
  })
  return getAdminQuoteRequest(reference)
}

export type { QuoteRequestWithItems } from './quote.service.js'