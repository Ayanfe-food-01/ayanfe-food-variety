import { FulfillmentMethod, Prisma, QuoteRequestStatus, ShoppingMode } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { notifyQuoteReady } from './quote.email.js'
import type { AdminQuoteRequest, AdminQuoteRequestListItem, PrepareQuotePricingInput, QuoteRequestPage, QuoteRequestQuery } from './quote.types.js'
import { quoteDetailInclude, toItemResponse, toNullableIso, toNullableMoney, type QuoteRequestWithItems } from './quote.service.js'

const toAdminListItem = (quoteRequest: {
  id: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shoppingMode: ShoppingMode | null
  status: QuoteRequestStatus
  createdAt: Date
  updatedAt: Date
  _count: { items: number }
}): AdminQuoteRequestListItem => ({
  id: quoteRequest.id,
  quoteNumber: quoteRequest.quoteNumber,
  customerName: quoteRequest.customerName,
  customerEmail: quoteRequest.customerEmail,
  customerPhone: quoteRequest.customerPhone,
  itemCount: quoteRequest._count.items,
  shoppingMode: quoteRequest.shoppingMode,
  status: quoteRequest.status,
  createdAt: quoteRequest.createdAt.toISOString(),
  updatedAt: quoteRequest.updatedAt.toISOString(),
})

const toAdminDetail = (quoteRequest: QuoteRequestWithItems): AdminQuoteRequest => ({
  id: quoteRequest.id,
  quoteNumber: quoteRequest.quoteNumber,
  customerName: quoteRequest.customerName,
  customerEmail: quoteRequest.customerEmail,
  customerPhone: quoteRequest.customerPhone,
  itemCount: quoteRequest.items.length,
  shoppingMode: quoteRequest.shoppingMode,
  status: quoteRequest.status,
  message: quoteRequest.message,
  adminNote: quoteRequest.adminNote,
  fulfillmentMethod: quoteRequest.fulfillmentMethod,
  quotedSubtotal: toNullableMoney(quoteRequest.quotedSubtotal),
  deliveryFee: toNullableMoney(quoteRequest.deliveryFee),
  quotedTotal: toNullableMoney(quoteRequest.quotedTotal),
  quotedAt: toNullableIso(quoteRequest.quotedAt),
  acceptedAt: toNullableIso(quoteRequest.acceptedAt),
  rejectedAt: toNullableIso(quoteRequest.rejectedAt),
  rejectionReason: quoteRequest.rejectionReason,
  convertedOrderNumber: quoteRequest.convertedOrder?.orderNumber ?? null,
  createdAt: quoteRequest.createdAt.toISOString(),
  updatedAt: quoteRequest.updatedAt.toISOString(),
  items: quoteRequest.items.map(toItemResponse),
})

export async function listAdminQuoteRequests(query: QuoteRequestQuery): Promise<QuoteRequestPage> {
  const where: Prisma.QuoteRequestWhereInput = {
    ...(query.search
      ? {
          OR: [
            { quoteNumber: { contains: query.search, mode: 'insensitive' as const } },
            { customerName: { contains: query.search, mode: 'insensitive' as const } },
            { customerEmail: { contains: query.search, mode: 'insensitive' as const } },
            { customerPhone: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
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
  return toAdminDetail(quoteRequest)
}

const allowedTransitions: Record<QuoteRequestStatus, readonly QuoteRequestStatus[]> = {
  [QuoteRequestStatus.PENDING]: [QuoteRequestStatus.CONTACTED, QuoteRequestStatus.CANCELLED],
  [QuoteRequestStatus.CONTACTED]: [QuoteRequestStatus.QUOTED, QuoteRequestStatus.CANCELLED],
  [QuoteRequestStatus.QUOTED]: [QuoteRequestStatus.ACCEPTED, QuoteRequestStatus.COMPLETED, QuoteRequestStatus.CANCELLED],
  [QuoteRequestStatus.ACCEPTED]: [QuoteRequestStatus.COMPLETED, QuoteRequestStatus.CANCELLED],
  [QuoteRequestStatus.COMPLETED]: [],
  [QuoteRequestStatus.CANCELLED]: [],
}

export async function updateAdminQuoteRequestStatus(
  reference: string,
  status: QuoteRequestStatus,
): Promise<AdminQuoteRequest> {
  const existing = await prisma.quoteRequest.findUnique({ where: { quoteNumber: reference } })
  if (!existing) throw new HttpError(404, 'Quote request not found.')
  if (existing.status === status) return getAdminQuoteRequest(reference)

  if (!allowedTransitions[existing.status].includes(status)) {
    throw new HttpError(409, `Quote status cannot change from ${existing.status} to ${status}.`)
  }

  await prisma.quoteRequest.update({
    where: { id: existing.id },
    data: { status },
  })
  const detail = await getAdminQuoteRequest(reference)
  if (status === QuoteRequestStatus.QUOTED && detail.quotedTotal !== null) {
    void notifyQuoteReady(detail).catch((error: unknown) =>
      console.error('Quotation ready email failed', error))
  }
  return detail
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

const MAX_QUOTED_AMOUNT = new Prisma.Decimal('9999999999.99')

/**
 * Prepares a quotation for a pending or contacted quote request. The admin
 * supplies a quoted unit price for every requested item and an optional
 * delivery fee. All money is re-derived server-side from the stored request:
 * per-item subtotals, the overall quoted subtotal and the final total are
 * computed with Prisma.Decimal from the durably stored quantities and are
 * never taken from the browser.
 *
 * Quoted prices are snapshot onto the quote so later changes to the product
 * catalog (retail/wholesale prices, options, deletion) cannot alter a saved
 * quotation. A successful quotation moves the request to QUOTED, which locks
 * the prices in place.
 */
export async function prepareQuotePricing(
  reference: string,
  input: PrepareQuotePricingInput,
): Promise<AdminQuoteRequest> {
  let quoted = false
  await prisma.$transaction(async (transaction) => {
    const quoteRequest = await transaction.quoteRequest.findUnique({
      where: { quoteNumber: reference },
      include: {
        items: { select: { id: true, quantity: true }, orderBy: { id: 'asc' as const } },
      },
    })
    if (!quoteRequest) throw new HttpError(404, 'Quote request not found.')
    if (
      quoteRequest.status !== QuoteRequestStatus.PENDING
      && quoteRequest.status !== QuoteRequestStatus.CONTACTED
    ) {
      throw new HttpError(409, 'A quotation can only be prepared while the quote is pending or contacted.')
    }
    if (input.items.length !== quoteRequest.items.length) {
      throw new HttpError(400, 'Provide a quoted price for every requested item.')
    }

    const itemsById = new Map(quoteRequest.items.map((item) => [item.id, item]))
    const subtotal = input.items.reduce((running, pricing) => {
      const item = itemsById.get(pricing.itemId)
      if (!item) throw new HttpError(400, 'One or more quoted items do not belong to this request.')
      const itemSubtotal = new Prisma.Decimal(pricing.quotedUnitPrice).mul(item.quantity)
      if (itemSubtotal.gt(MAX_QUOTED_AMOUNT)) {
        throw new HttpError(400, 'A quoted item subtotal is too large.')
      }
      return running.add(itemSubtotal)
    }, new Prisma.Decimal(0))

    const deliveryFee = new Prisma.Decimal(input.deliveryFee)
    const quotedTotal = subtotal.add(deliveryFee)
    if (quotedTotal.gt(MAX_QUOTED_AMOUNT)) {
      throw new HttpError(400, 'The quoted total is too large.')
    }
    if (input.fulfillmentMethod === FulfillmentMethod.PICKUP && deliveryFee.gt(0)) {
      throw new HttpError(400, 'A pickup quotation cannot include a delivery fee.')
    }

    for (const pricing of input.items) {
      await transaction.quoteRequestItem.update({
        where: { id: pricing.itemId },
        data: { quotedUnitPrice: new Prisma.Decimal(pricing.quotedUnitPrice) },
      })
    }

    // The status guard on the update makes the transition atomic: a concurrent
    // status change between the read and this update yields count 0.
    const updated = await transaction.quoteRequest.updateMany({
      where: {
        id: quoteRequest.id,
        status: { in: [QuoteRequestStatus.PENDING, QuoteRequestStatus.CONTACTED] },
      },
      data: {
        status: QuoteRequestStatus.QUOTED,
        fulfillmentMethod: input.fulfillmentMethod,
        quotedSubtotal: subtotal,
        deliveryFee,
        quotedTotal,
        quotedAt: new Date(),
      },
    })
    if (updated.count !== 1) {
      throw new HttpError(409, 'This quote can no longer be priced because its status changed.')
    }
    quoted = true
  })

  const detail = await getAdminQuoteRequest(reference)
  if (quoted) {
    void notifyQuoteReady(detail).catch((error: unknown) =>
      console.error('Quotation ready email failed', error))
  }
  return detail
}
