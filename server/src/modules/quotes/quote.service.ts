import { FulfillmentMethod, Prisma, QuoteRequestStatus, ShoppingMode, type QuoteRequest } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type {
  AdminQuoteRequest,
  AdminQuoteRequestListItem,
  ApplyQuoteRequestResult,
  CreateQuoteRequestInput,
  CustomerQuoteRequestListItem,
  CustomerQuoteRequestsResult,
  PrepareQuotePricingInput,
  QuoteRequestItemResponse,
  QuoteRequestPage,
  QuoteRequestQuery,
  QuoteRequestResponse,
  RejectQuoteRequestInput,
} from './quote.types.js'

type QuoteRequestWithItems = QuoteRequest & {
  items: Array<{
    id: string
    productId: string
    productName: string
    productOptionId: string | null
    productOptionLabel: string | null
    quantity: number
    note: string | null
    quotedUnitPrice: Prisma.Decimal | null
  }>
  convertedOrder?: { orderNumber: string } | null
}

const toItemResponse = (item: QuoteRequestWithItems['items'][number]): QuoteRequestItemResponse => ({
  id: item.id,
  productId: item.productId,
  productName: item.productName,
  productOptionId: item.productOptionId,
  productOptionLabel: item.productOptionLabel,
  quantity: item.quantity,
  note: item.note,
  quotedUnitPrice: item.quotedUnitPrice === null ? null : item.quotedUnitPrice.toString(),
})

const toNullableMoney = (value: Prisma.Decimal | null): string | null =>
  value === null ? null : value.toString()

const toNullableIso = (value: Date | null): string | null =>
  value === null ? null : value.toISOString()

/**
 * Public serializer. Customer-visible responses never expose internal
 * administration fields such as the admin note or request key.
 */
const toQuoteRequestResponse = (quoteRequest: QuoteRequestWithItems): QuoteRequestResponse => ({
  id: quoteRequest.id,
  quoteNumber: quoteRequest.quoteNumber,
  customerName: quoteRequest.customerName,
  customerEmail: quoteRequest.customerEmail,
  customerPhone: quoteRequest.customerPhone,
  message: quoteRequest.message,
  shoppingMode: quoteRequest.shoppingMode,
  status: quoteRequest.status,
  fulfillmentMethod: quoteRequest.fulfillmentMethod,
  quotedSubtotal: toNullableMoney(quoteRequest.quotedSubtotal),
  deliveryFee: toNullableMoney(quoteRequest.deliveryFee),
  quotedTotal: toNullableMoney(quoteRequest.quotedTotal),
  quotedAt: toNullableIso(quoteRequest.quotedAt),
  acceptedAt: toNullableIso(quoteRequest.acceptedAt),
  rejectedAt: toNullableIso(quoteRequest.rejectedAt),
  convertedOrderNumber: quoteRequest.convertedOrder?.orderNumber ?? null,
  createdAt: quoteRequest.createdAt.toISOString(),
  updatedAt: quoteRequest.updatedAt.toISOString(),
  items: quoteRequest.items.map(toItemResponse),
})

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

const nextQuoteNumber = async (transaction: Prisma.TransactionClient): Promise<string> => {
  const result = await transaction.$queryRaw<Array<{ nextval: bigint }>>(
    Prisma.sql`SELECT nextval('quote_requests_quote_number_seq')`,
  )
  const sequence = Number(result[0]?.nextval)
  return `QR-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, '0')}`
}

const quoteDetailInclude = {
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      productOptionId: true,
      productOptionLabel: true,
      quantity: true,
      note: true,
      quotedUnitPrice: true,
    },
    orderBy: { id: 'asc' as const },
  },
  convertedOrder: {
    select: { orderNumber: true },
  },
} satisfies Prisma.QuoteRequestInclude

/**
 * Creates a quote request. Shopping context is always derived from the
 * authenticated customer's mode and never accepted from the browser. Guest
 * submissions (no session) are recorded as retail context.
 *
 * The request is idempotent: the client sends a unique request key, and a
 * repeated submission returns the already-created request instead of creating
 * a duplicate. Ownership of the request key is verified for signed-in users.
 */
export async function createQuoteRequest(
  user: AuthenticatedUser | undefined,
  input: CreateQuoteRequestInput,
): Promise<ApplyQuoteRequestResult> {
  let result: ApplyQuoteRequestResult | null = null

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.quoteRequest.findUnique({
      where: { requestKey: input.requestKey },
      include: quoteDetailInclude,
    })
    if (existing) {
      const belongsToUser = user ? existing.userId === user.id : existing.userId === null
      if (!belongsToUser) {
        throw new HttpError(409, 'This quote request cannot be reused.')
      }
      result = { quoteRequest: toQuoteRequestResponse(existing), created: false }
      return
    }

    const productIds = input.items.map((item) => item.productId)
    const optionIds = input.items.flatMap((item) => (item.productOptionId ? [item.productOptionId] : []))

    const [products, options] = await Promise.all([
      transaction.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, isActive: true, category: { select: { isActive: true } } },
      }),
      optionIds.length > 0
        ? transaction.productOption.findMany({
            where: { id: { in: optionIds } },
            select: { id: true, productId: true, label: true, isActive: true },
          })
        : Promise.resolve([]),
    ])
    const productsById = new Map(products.map((product) => [product.id, product]))
    const optionsById = new Map(options.map((option) => [option.id, option]))

    // Product identity and the selected options are resolved from the database
    // so names and references are never taken from the browser.
    for (const item of input.items) {
      const product = productsById.get(item.productId)
      if (!product || !product.isActive || !product.category.isActive) {
        throw new HttpError(409, 'One or more of the requested products are no longer available.')
      }
      if (item.productOptionId) {
        const option = optionsById.get(item.productOptionId)
        if (!option || option.productId !== item.productId || !option.isActive) {
          throw new HttpError(409, 'One or more of the requested product options are invalid.')
        }
      }
    }

    const isWholesale = user?.shoppingMode === ShoppingMode.WHOLESALE
    const quoteRequest = await transaction.quoteRequest.create({
      data: {
        quoteNumber: await nextQuoteNumber(transaction),
        requestKey: input.requestKey,
        userId: user?.id ?? null,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        message: input.message ?? null,
        shoppingMode: isWholesale ? ShoppingMode.WHOLESALE : ShoppingMode.RETAIL,
        status: QuoteRequestStatus.PENDING,
        items: {
          create: input.items.map((item) => {
            const product = productsById.get(item.productId)!
            const option = item.productOptionId ? optionsById.get(item.productOptionId) : undefined
            return {
              productId: item.productId,
              productName: product.name,
              productOptionId: option?.id ?? null,
              productOptionLabel: option?.label ?? null,
              quantity: item.quantity,
              note: item.note ?? null,
            }
          }),
        },
      },
      include: quoteDetailInclude,
    })

    result = { quoteRequest: toQuoteRequestResponse(quoteRequest), created: true }
  })

  return result ?? { quoteRequest: {} as QuoteRequestResponse, created: false }
}

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
  })

  return getAdminQuoteRequest(reference)
}

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
    select: { id: true, status: true },
  })
  if (!existing) throw new HttpError(404, 'Quote request not found.')
  if (existing.status === QuoteRequestStatus.ACCEPTED || existing.status === QuoteRequestStatus.COMPLETED) {
    return getCustomerQuoteRequest(reference, userId)
  }
  if (existing.status !== QuoteRequestStatus.QUOTED) {
    throw new HttpError(409, 'This quotation can only be accepted once it has been prepared.')
  }

  const updated = await prisma.quoteRequest.updateMany({
    where: { id: existing.id, status: QuoteRequestStatus.QUOTED },
    data: { status: QuoteRequestStatus.ACCEPTED, acceptedAt: new Date() },
  })
  if (updated.count !== 1) {
    throw new HttpError(409, 'This quotation can no longer be accepted because its status changed.')
  }
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
    select: { id: true, status: true },
  })
  if (!existing) throw new HttpError(404, 'Quote request not found.')
  if (existing.status === QuoteRequestStatus.CANCELLED) {
    return getCustomerQuoteRequest(reference, userId)
  }
  if (existing.status !== QuoteRequestStatus.QUOTED) {
    throw new HttpError(409, 'This quotation can only be declined once it has been prepared.')
  }

  const updated = await prisma.quoteRequest.updateMany({
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
  return getCustomerQuoteRequest(reference, userId)
}