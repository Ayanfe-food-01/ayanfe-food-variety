import type { CreatedOrder, OrderStatus } from '../../services/orderService'
import { formatDate } from '../../utils/dateFormat'
import { formatOrderStatus } from '../../utils/orderStatus'

export interface OrderTrackingData {
  orderStatus: OrderStatus
  paymentStatus: CreatedOrder['paymentStatus']
  paymentConfirmedAt?: string | null
  createdAt: string
  paymentSubmissions?: Array<{
    status: 'PENDING' | 'VERIFIED' | 'REJECTED'
    reviewedAt: string | null
  }>
  statusHistory: Array<{
    previousStatus: OrderStatus | null
    newStatus: OrderStatus
    createdAt: string
  }>
}

const trackerSteps = [
  { key: 'placed', label: 'Order Placed', status: 'ORDER_PLACED' as OrderStatus },
  { key: 'paid', label: 'Payment Confirmed', status: null },
  { key: 'processing', label: 'Processing', status: 'PROCESSING' as OrderStatus },
  { key: 'out-for-delivery', label: 'Out for Delivery', status: 'OUT_FOR_DELIVERY' as OrderStatus },
  { key: 'delivered', label: 'Delivered', status: 'DELIVERED' as OrderStatus },
] as const

const fulfillmentRank: Record<OrderStatus, number> = {
  ORDER_PLACED: 0,
  PROCESSING: 1,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
  CANCELLED: -1,
}

export function OrderTracker({ order }: { order: OrderTrackingData }) {
  if (order.orderStatus === 'CANCELLED') {
    return (
      <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5">
        <p className="text-sm font-bold text-orange">Order Cancelled</p>
        <p className="mt-1 text-sm text-muted">This order will not move through the remaining fulfilment stages.</p>
      </div>
    )
  }

  const getStepState = (step: typeof trackerSteps[number]): 'complete' | 'active' | 'pending' => {
    if (step.key === 'placed') return 'complete'
    if (step.key === 'paid') return order.paymentStatus === 'PAID' ? 'complete' : 'active'
    if (!step.status) return 'pending'
    const currentRank = fulfillmentRank[order.orderStatus]
    const stepRank = fulfillmentRank[step.status]
    if (currentRank > stepRank || (step.status === 'DELIVERED' && currentRank === stepRank)) return 'complete'
    if (currentRank === stepRank) return 'active'
    return 'pending'
  }

  const getStepTimestamp = (step: typeof trackerSteps[number]): string | null => {
    if (step.key === 'placed') return order.createdAt
    if (step.key === 'paid') {
      return order.paymentConfirmedAt
        ?? order.paymentSubmissions?.find((submission) => submission.status === 'VERIFIED')?.reviewedAt
        ?? null
    }
    return order.statusHistory.find((history) => history.newStatus === step.status)?.createdAt ?? null
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        {trackerSteps.map((step, index) => {
          const state = getStepState(step)
          const timestamp = getStepTimestamp(step)

          return (
            <div className="flex flex-1 items-start gap-3 sm:block sm:text-center" key={step.key}>
              <div className="flex items-center sm:block">
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${state === 'complete' ? 'bg-green text-cream' : state === 'active' ? 'border-2 border-orange bg-orange/10 text-orange' : 'border border-line bg-cream text-muted'}`}>
                  {state === 'complete' ? '✓' : state === 'active' ? '●' : '○'}
                </span>
                {index < trackerSteps.length - 1 && (
                  <span className={`ml-3 hidden h-0.5 w-full sm:inline-block ${state === 'complete' ? 'bg-green' : 'bg-line'}`} />
                )}
              </div>
              <p className={`pt-1 text-sm font-bold ${state === 'complete' ? 'text-green-dark' : state === 'active' ? 'text-orange' : 'text-muted'}`}>{step.label}</p>
              {timestamp && <p className="mt-1 text-[11px] text-muted">{formatDate(timestamp)}</p>}
            </div>
          )
        })}
      </div>
      <p className="mt-5 text-xs leading-5 text-muted">Payment verification and fulfilment progress are tracked separately. The current order status is {formatOrderStatus(order.orderStatus)}.</p>
    </div>
  )
}