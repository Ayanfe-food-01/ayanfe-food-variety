import { PaymentProvider, PaymentRecordStatus, Prisma, type Payment } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import { HttpError } from '../../utils/http.js'
import { getProviderAdapter, requireOnlinePaymentEnabled, verifyWithRetries } from './payment.provider.js'
import { settleSuccessfulPayment, paystackAmountMatches, expectedCurrencyMatches } from './payment.settle.js'
import type { PaymentVerifyResponse } from './payment.types.js'

export interface VerifyPaymentInput {
  orderId: string
  authenticatedUserId?: string
  guestAccessToken?: string
}

const toPaymentVerifyResponse = (input: {
  orderId: string
  orderNumber: string
  provider: PaymentProvider
  payment: Payment
  paymentStatus: 'PENDING' | 'PAID'
  amount: Prisma.Decimal
  currency: string
  paidAt: string | null
}): PaymentVerifyResponse => ({
  orderId: input.orderId,
  orderNumber: input.orderNumber,
  provider: input.provider,
  providerReference: input.payment.providerReference,
  status: input.payment.status,
  paymentStatus: input.paymentStatus,
  amount: input.amount.toString(),
  currency: input.currency,
  paidAt: input.paidAt,
})

/**
 * Confirm the current state of an order's online payment directly with the
 * provider, then settle the Payment record and the order atomically.
 *
 * Ownership is enforced exactly like initialization: authenticated customers
 * may only verify orders they own, guests only guest orders matching their
 * access token, and an unauthenticated request (no token) is refused.
 */
export async function verifyOrderPayment(
  input: VerifyPaymentInput,
): Promise<PaymentVerifyResponse> {
  const provider = requireOnlinePaymentEnabled()
  const adapter = getProviderAdapter(provider)

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      payments: {
        where: { provider },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  const ownsOrder = input.authenticatedUserId
    ? order?.userId === input.authenticatedUserId
    : Boolean(
        input.guestAccessToken
        && order?.userId === null
        && order.guestAccessTokenHash === hashGuestOrderAccessToken(input.guestAccessToken),
      )
  if (!order || !ownsOrder) {
    throw new HttpError(input.authenticatedUserId || input.guestAccessToken ? 404 : 401, 'Order not found.')
  }

  const payment = order.payments[0]
  if (!payment) {
    throw new HttpError(404, 'No online payment was found for this order.')
  }

  const toResponse = (
    paymentStatus: 'PENDING' | 'PAID',
    paidAt: string | null,
    record: Payment = payment,
  ): PaymentVerifyResponse =>
    toPaymentVerifyResponse({
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider,
      payment: record,
      paymentStatus,
      amount: record.amount,
      currency: record.currency,
      paidAt,
    })

  // Already confirmed earlier (e.g. a double return to the confirmation page).
  // Return the settled state without touching the provider again.
  if (payment.status === PaymentRecordStatus.SUCCESSFUL) {
    return toResponse(order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING', null)
  }

  // There is nothing live to verify: either the attempt failed at init, was
  // superseded, or was cancelled. The customer should start a fresh attempt.
  if (payment.status !== PaymentRecordStatus.PENDING) {
    return toResponse('PENDING', null)
  }

  // Provider unreachable / invalid response errors (e.g. HttpError 502) bubble
  // up unchanged: the PENDING attempt stays live so the customer can simply try
  // verifying again later, and nothing is ever marked paid.
  const result = await verifyWithRetries(adapter, payment.providerReference)

  if (result.status === 'FAILED') {
    let markedFailed = false
    try {
      const updated = await prisma.payment.updateMany({
        where: { id: payment.id, status: PaymentRecordStatus.PENDING },
        data: {
          status: PaymentRecordStatus.FAILED,
          completedAt: new Date(),
        },
      })
      markedFailed = updated.count > 0
    } catch (error: unknown) {
      console.error('paystack_verify_db_update_failure', {
        orderId: order.id,
        provider,
        error: error instanceof Error ? error.message : 'Unknown database error',
      })
    }
    const failedRecord: Payment = {
      ...payment,
      status: PaymentRecordStatus.FAILED,
      completedAt: markedFailed ? new Date() : payment.completedAt,
    }
    return toResponse('PENDING', markedFailed ? null : payment.completedAt?.toISOString() ?? null, failedRecord)
  }

  if (result.status === 'UNCONFIRMED') {
    // Abandoned or still pending at the provider (Paystack says the customer
    // never completed checkout). Leave the attempt live so re-initialization
    // can reuse it; do not settle the order.
    return toResponse('PENDING', null)
  }

  // The provider reports success. Before settling anything, verify the charged
  // amount and currency match what we authorized, and only then atomically mark
  // the Payment record successful and the order paid. The order row is locked
  // so two concurrent verifies serialize; state guards make the writes safe.
  const matchesAmount = paystackAmountMatches(payment.amount, result)
  const matchesCurrency = expectedCurrencyMatches(payment.currency)(result.currency)

  if (!matchesAmount || !matchesCurrency) {
    console.error('paystack_verify_mismatch', {
      orderId: order.id,
      provider,
      providerReference: payment.providerReference,
      expectedAmount: payment.amount.toString(),
      requestedAmount: result.requestedAmountInNaira,
      receivedAmount: result.amountInNaira,
      fees: result.feesInNaira,
      receivedCurrency: result.currency,
    })
    throw new HttpError(422, 'The payment could not be confirmed because the charged amount or currency did not match the order. Please contact support.')
  }

  const settled = await settleSuccessfulPayment(order, payment, result.paidAt ?? null, result)

  if (settled.alreadySettled) {
    const current = await prisma.payment.findUnique({ where: { id: payment.id } })
    const currentOrder = await prisma.order.findUnique({ where: { id: order.id } })
    const paid = current?.status === PaymentRecordStatus.SUCCESSFUL && currentOrder?.paymentStatus === 'PAID'
    return toResponse(paid ? 'PAID' : 'PENDING', null, current ?? payment)
  }

  const settledRecord: Payment = { ...payment, status: PaymentRecordStatus.SUCCESSFUL }
  return toResponse('PAID', result.paidAt ?? null, settledRecord)
}
