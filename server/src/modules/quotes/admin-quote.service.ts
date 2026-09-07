import { Prisma, QuoteRequestStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { notifyQuoteReady } from './quote.email.js'
import type { AdminQuoteRequest, AdminQuoteRequestListItem, QuoteRequestPage, QuoteRequestQuery } from './quote.types.js'
import { quoteDetailInclude, type QuoteRequestWithItems } from './quote.service.js'
import { toAdminDetail, toAdminListItem } from './admin-quote.mapper.js'

export { toAdminDetail, toAdminListItem } from './admin-quote.mapper.js'
export type { AdminQuoteRequest, AdminQuoteRequestListItem, QuoteRequestPage, QuoteRequestQuery, PrepareQuotePricingInput } from './quote.types.js'
export { prepareQuotePricing } from './admin-quote.prepare.service.js'

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

export type { QuoteRequestWithItems } from './quote.service.js'