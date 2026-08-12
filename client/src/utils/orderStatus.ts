import type { OrderStatus } from '../services/orderService'

export const orderStatusLabels: Record<OrderStatus, string> = {
  ORDER_PLACED: 'Order Placed',
  PROCESSING: 'Processing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export const formatOrderStatus = (status: OrderStatus): string => orderStatusLabels[status]

export const allowedNextOrderStatuses: Record<OrderStatus, readonly OrderStatus[]> = {
  ORDER_PLACED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const getOrderStatusOptions = (current: OrderStatus): OrderStatus[] => [
  current,
  ...allowedNextOrderStatuses[current],
]