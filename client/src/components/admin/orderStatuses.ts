import type { OrderStatus } from '../../services/orderService'
import { formatOrderStatus } from '../../utils/orderStatus'

export const orderStatuses: OrderStatus[] = ['ORDER_PLACED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
export { formatOrderStatus }