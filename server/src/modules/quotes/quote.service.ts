import { Prisma, QuoteRequestStatus, ShoppingMode, type QuoteRequest } from '@prisma/client'
import type { QuoteRequestItemResponse, QuoteRequestResponse } from './quote.types.js'

export type QuoteRequestWithItems = QuoteRequest & {
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

export const toItemResponse = (item: QuoteRequestWithItems['items'][number]): QuoteRequestItemResponse => ({
  id: item.id,
  productId: item.productId,
  productName: item.productName,
  productOptionId: item.productOptionId,
  productOptionLabel: item.productOptionLabel,
  quantity: item.quantity,
  note: item.note,
  quotedUnitPrice: item.quotedUnitPrice === null ? null : item.quotedUnitPrice.toString(),
})

export const toNullableMoney = (value: Prisma.Decimal | null): string | null =>
  value === null ? null : value.toString()

export const toNullableIso = (value: Date | null): string | null =>
  value === null ? null : value.toISOString()

/**
 * Public serializer. Customer-visible responses never expose internal
 * administration fields such as the admin note or request key.
 */
export const toQuoteRequestResponse = (quoteRequest: QuoteRequestWithItems): QuoteRequestResponse => ({
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

export const nextQuoteNumber = async (transaction: Prisma.TransactionClient): Promise<string> => {
  const result = await transaction.$queryRaw<Array<{ nextval: bigint }>>(
    Prisma.sql`SELECT nextval('quote_requests_quote_number_seq')`,
  )
  const sequence = Number(result[0]?.nextval)
  return `QR-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, '0')}`
}

export const quoteDetailInclude = {
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
