import { FulfillmentMethod, QuoteRequestStatus, ShoppingMode } from '@prisma/client'
import type { AdminQuoteRequest, AdminQuoteRequestListItem } from '../quote.types.js'
import { toNullableIso, toNullableMoney, type QuoteRequestWithItems } from '../services/quote.service.js'
import { toItemResponse } from '../services/quote.service.js'

export const toAdminListItem = (quoteRequest: {
  id: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  shoppingMode: ShoppingMode | null
  fulfillmentMethod: FulfillmentMethod | null
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
  fulfillmentMethod: quoteRequest.fulfillmentMethod,
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
  state: quoteRequest.state,
  city: quoteRequest.city,
  deliveryAddress: quoteRequest.deliveryAddress,
  deliveryFeeMode: quoteRequest.deliveryFeeMode,
  deliveryZoneId: quoteRequest.deliveryZoneId,
  deliveryZoneName: quoteRequest.deliveryZoneName,
  deliveryAreaId: quoteRequest.deliveryAreaId,
  deliveryAreaName: quoteRequest.deliveryAreaName,
  deliveryMinDays: quoteRequest.deliveryMinDays,
  deliveryMaxDays: quoteRequest.deliveryMaxDays,
  quotedSubtotal: toNullableMoney(quoteRequest.quotedSubtotal),
  deliveryFee: toNullableMoney(quoteRequest.deliveryFee),
  quotedTotal: toNullableMoney(quoteRequest.quotedTotal),
  quotedAt: toNullableIso(quoteRequest.quotedAt),
  acceptedAt: toNullableIso(quoteRequest.acceptedAt),
  rejectedAt: toNullableIso(quoteRequest.rejectedAt),
  rejectionReason: quoteRequest.rejectionReason,
  cancelledAt: toNullableIso(quoteRequest.cancelledAt),
  cancelledReason: quoteRequest.cancelledReason,
  completedAt: toNullableIso(quoteRequest.completedAt),
  convertedOrderNumber: quoteRequest.convertedOrder?.orderNumber ?? null,
  createdAt: quoteRequest.createdAt.toISOString(),
  updatedAt: quoteRequest.updatedAt.toISOString(),
  items: quoteRequest.items.map((item) => ({ ...toItemResponse(item), priceHint: { retail: null, wholesale: null } })),
})