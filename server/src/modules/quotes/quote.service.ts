import { Prisma, QuoteRequestStatus, ShoppingMode, type QuoteRequest } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type {
  AdminQuoteRequest,
  AdminQuoteRequestListItem,
  ApplyQuoteRequestResult,
  CreateQuoteRequestInput,
  QuoteRequestItemResponse,
  QuoteRequestPage,
  QuoteRequestQuery,
  QuoteRequestResponse,
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
  }>
}

const toItemResponse = (item: QuoteRequestWithItems['items'][number]): QuoteRequestItemResponse => ({
  id: item.id,
  productId: item.productId,
  productName: item.productName,
  productOptionId: item.productOptionId,
  productOptionLabel: item.productOptionLabel,
  quantity: item.quantity,
  note: item.note,
})

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
    },
    orderBy: { id: 'asc' as const },
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
  [QuoteRequestStatus.QUOTED]: [QuoteRequestStatus.COMPLETED, QuoteRequestStatus.CANCELLED],
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