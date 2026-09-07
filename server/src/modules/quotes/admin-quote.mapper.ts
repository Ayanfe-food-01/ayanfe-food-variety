import { QuoteRequestStatus, ShoppingMode } from '@prisma/client'
import type { AdminQuoteRequest, AdminQuoteRequestListItem } from './quote.types.js'
import { toNullableIso, toNullableMoney, type QuoteRequestWithItems } from './quote.service.js'
import { toItemResponse } from './quote.service.js'

export const toAdminListItem = (quoteRequest: {
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

export const toAdminDetail = (quoteRequest: QuoteRequestWithItems): AdminQuoteRequest => ({
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