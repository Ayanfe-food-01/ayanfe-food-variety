import { AdminNotificationType, QuoteRequestStatus, ShoppingMode } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import type { ApplyQuoteRequestResult, CreateQuoteRequestInput, QuoteRequestResponse } from './quote.types.js'
import { nextQuoteNumber, quoteDetailInclude, toQuoteRequestResponse } from './quote.service.js'

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

    await createAdminNotification(transaction, {
      type: AdminNotificationType.NEW_QUOTE_REQUEST,
      eventKey: `quote-request:${quoteRequest.id}`,
      title: 'New quote request received',
      message: `${quoteRequest.customerName} (${quoteRequest.customerEmail}) requested a quotation for ${quoteRequest.items.length} product(s).`,
      href: `/admin/quote-requests/${quoteRequest.quoteNumber}`,
    })
  })

  return result ?? { quoteRequest: {} as QuoteRequestResponse, created: false }
}
