import { PaymentStatus, OrderStatus, Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { buildSearchWhere, type SearchFieldConfig } from '../../utils/search.js'
import type { AdminOrdersPage, AdminOrdersQuery } from './admin.types.js'
import { getAdminOrder } from './admin-order.detail.service.js'
import { toOrderListItem } from './admin-order.mapper.js'

export { getAdminOrder } from './admin-order.detail.service.js'
export { updateAdminOrderStatus } from './admin-order.status.service.js'

const ADMIN_ORDER_SEARCH_FIELDS: SearchFieldConfig[] = [
  { path: 'orderNumber', primary: true, weight: 2 },
  { path: 'customerName', primary: true, weight: 2 },
  { path: 'email', weight: 0.6 },
  { path: 'phone', weight: 0.6 },
]

export async function listAdminOrders(query: AdminOrdersQuery): Promise<AdminOrdersPage> {
  const search = buildSearchWhere<Prisma.OrderWhereInput>(query.search, ADMIN_ORDER_SEARCH_FIELDS)
  const where: Prisma.OrderWhereInput = {
    ...(search ?? {}),
    ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    ...(query.orderStatus ? { orderStatus: query.orderStatus } : {}),
    ...(query.archive === 'active' ? { archivedAt: null } : {}),
    ...(query.archive === 'archived' ? { NOT: { archivedAt: null } } : {}),
  }
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        orderNumber: true,
        customerName: true,
        email: true,
        phone: true,
        fulfillmentMethod: true,
        shoppingMode: true,
        total: true,
        paymentStatus: true,
        orderStatus: true,
        archivedAt: true,
        createdAt: true,
      },
    }),
  ])
  return {
    orders: orders.map(toOrderListItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

export async function archiveAdminOrder(orderNumber: string, adminId: string) {
  const result = await prisma.order.updateMany({
    where: { orderNumber, archivedAt: null },
    data: { archivedAt: new Date(), archivedById: adminId },
  })
  if (result.count === 0) {
    const existing = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } })
    if (!existing) throw new HttpError(404, 'Order not found.')
  }
  return getAdminOrder(orderNumber)
}

export async function restoreAdminOrder(orderNumber: string) {
  const result = await prisma.order.updateMany({
    where: { orderNumber, archivedAt: { not: null } },
    data: { archivedAt: null, archivedById: null },
  })
  if (result.count === 0) {
    const existing = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true, archivedAt: true } })
    if (!existing) throw new HttpError(404, 'Order not found.')
  }
  return getAdminOrder(orderNumber)
}

export async function deleteAdminOrder(orderNumber: string) {
  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        archivedAt: true,
        paymentStatus: true,
        orderStatus: true,
        stockDeductedAt: true,
        stockRestoredAt: true,
        paymentSubmissions: { select: { id: true }, take: 1 },
      },
    })
    if (!existing) throw new HttpError(404, 'Order not found.')
    if (!existing.archivedAt) throw new HttpError(409, 'Only archived orders can be permanently deleted.')
    if (existing.paymentStatus !== PaymentStatus.PENDING || existing.paymentSubmissions.length > 0) {
      throw new HttpError(409, 'Orders with payment records cannot be permanently deleted.')
    }
    if (existing.orderStatus !== OrderStatus.CANCELLED || (existing.stockDeductedAt && !existing.stockRestoredAt)) {
      throw new HttpError(409, 'Only cancelled orders with reconciled stock can be permanently deleted.')
    }
    await transaction.order.delete({ where: { id: existing.id } })
  }, { timeout: 30000 })
}