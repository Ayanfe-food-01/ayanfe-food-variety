import { AdminNotificationType, Prisma, QuoteRequestStatus, ShoppingMode } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import type { CustomerQuoteRequestListItem, CustomerQuoteRequestsResult, QuoteRequestResponse, RejectQuoteRequestInput } from './quote.types.js'
import { quoteDetailInclude, toNullableIso, toNullableMoney, toQuoteRequestResponse } from './quote.service.js'

const toCustomerListItem = (quoteRequest: {
  id: string
  quoteNumber: string
  shoppingMode: ShoppingMode | null
  status: QuoteRequestStatus
  quotedTotal: Prisma.Decimal | null
  quotedAt: Date | null
  createdAt: Date
  updatedAt: Date
  _count: { items: number }
}): CustomerQuoteRequestListItem => ({
  id: quoteRequest.id,
  quoteNumber: quoteRequest.quoteNumber,
  shoppingMode: quoteRequest.shoppingMode,
  status: quoteRequest.status,
  itemCount: quoteRequest._count.items,
  quotedTotal: toNullableMoney(quoteRequest.quotedTotal),
  quotedAt: toNullableIso(quoteRequest.quotedAt),
  createdAt: quoteRequest.createdAt.toISOString(),
  updatedAt: quoteRequest.updatedAt.toISOString(),
})

/**
 * Signed-in customers may only ever see their own quote requests. Every query
 * is scoped by the authenticated user id, so a request that belongs to another
 * customer (or to a guest) simply does not exist from this caller's viewpoint.
 */
export async function listCustomerQuoteRequests(userId: string): Promise<CustomerQuoteRequestsResult> {
  const quoteRequests = await prisma.quoteRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' as const },
    take: 200,
    select: {
      id: true,
      quoteNumber: true,
      shoppingMode: true,
      status: true,
      quotedTotal: true,
      quotedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  })
  return { quoteRequests: quoteRequests.map(toCustomerListItem) }
}

export async function getCustomerQuoteRequest(reference: string, userId: string): Promise<QuoteRequestResponse> {
  const quoteRequest = await prisma.quoteRequest.findFirst({
    where: { quoteNumber: reference, userId },
    include: quoteDetailInclude,
  })
  if (!quoteRequest) throw new HttpError(404, 'Quote request not found.')
  return toQuoteRequestResponse(quoteRequest)
}

/**
 * Accepts a prepared quotation, moving it from QUOTED to ACCEPTED exactly
 * once. The guard on the status update makes repeated or racing submissions
 * safe: a second accept of an already-accepted (or already-converted)
 * quotation simply returns the current state.
 *
 * Acceptance no longer marks the quotation done — the customer's next step is
 * converting it into an order, which is what actually completes the request.
 */
export async function acceptQuoteRequest(reference: string, userId: string): Promise<QuoteRequestResponse> {
  const existing = await prisma.quoteRequest.findFirst({
    where: { quoteNumber: reference, userId },
    select: { id: true, status: true, customerName: true, quoteNumber: true },
  })
  if (!existing) throw new HttpError(404, 'Quote request not found.')
  if (existing.status === QuoteRequestStatus.ACCEPTED || existing.status === QuoteRequestStatus.COMPLETED) {
    return getCustomerQuoteRequest(reference, userId)
  }
  if (existing.status !== QuoteRequestStatus.QUOTED) {
    throw new HttpError(409, 'This quotation can only be accepted once it has been prepared.')
  }

  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.quoteRequest.updateMany({
      where: { id: existing.id, status: QuoteRequestStatus.QUOTED },
      data: { status: QuoteRequestStatus.ACCEPTED, acceptedAt: new Date() },
    })
    if (updated.count !== 1) {
      throw new HttpError(409, 'This quotation can no longer be accepted because its status changed.')
    }
    await createAdminNotification(transaction, {
      type: AdminNotificationType.QUOTE_ACCEPTED,
      eventKey: `quote-accepted:${existing.id}`,
      title: 'Quotation accepted',
      message: `${existing.customerName} accepted quotation ${existing.quoteNumber}.`,
      href: `/admin/quote-requests/${existing.quoteNumber}`,
    })
  })

  return getCustomerQuoteRequest(reference, userId)
}

/**
 * Declines a prepared quotation, moving it from QUOTED to CANCELLED exactly
 * once. An optional reason is stored server-side for the admin's visibility
 * and is never echoed back to the customer.
 */
export async function rejectQuoteRequest(
  reference: string,
  userId: string,
  input: RejectQuoteRequestInput,
): Promise<QuoteRequestResponse> {
  const existing = await prisma.quoteRequest.findFirst({
    where: { quoteNumber: reference, userId },
    select: { id: true, status: true, customerName: true, quoteNumber: true },
  })
  if (!existing) throw new HttpError(404, 'Quote request not found.')
  if (existing.status === QuoteRequestStatus.CANCELLED) {
    return getCustomerQuoteRequest(reference, userId)
  }
  if (existing.status !== QuoteRequestStatus.QUOTED) {
    throw new HttpError(409, 'This quotation can only be declined once it has been prepared.')
  }

  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.quoteRequest.updateMany({
      where: { id: existing.id, status: QuoteRequestStatus.QUOTED },
      data: {
        status: QuoteRequestStatus.CANCELLED,
        rejectedAt: new Date(),
        rejectionReason: input.reason ?? null,
      },
    })
    if (updated.count !== 1) {
      throw new HttpError(409, 'This quotation can no longer be declined because its status changed.')
    }
    const declineNote = input.reason ? ` Reason: ${input.reason.slice(0, 220)}` : ''
    await createAdminNotification(transaction, {
      type: AdminNotificationType.QUOTE_REJECTED,
      eventKey: `quote-rejected:${existing.id}`,
      title: 'Quotation declined by customer',
      message: `${existing.customerName} declined quotation ${existing.quoteNumber}.${declineNote}`.slice(0, 500),
      href: `/admin/quote-requests/${existing.quoteNumber}`,
    })
  })

  return getCustomerQuoteRequest(reference, userId)
}
