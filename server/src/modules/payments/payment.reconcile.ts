import { PaymentProvider, PaymentRecordStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { getProviderAdapter, requireOnlinePaymentEnabled, verifyWithRetries, type PaymentVerifyResult } from './payment.provider.js'
import { settleSuccessfulPayment, paystackAmountMatches, expectedCurrencyMatches } from './payment.settle.js'

export interface ReconcilePaymentEventInput {
  providerReference: string
}

/**
 * Reconcile a single `charge.success` event from Paystack.
 *
 * Return values:
 * - `'settled'` — the payment was just marked successful and the order is PAID.
 * - `'already-settled'` — this event was processed before (idempotent ack).
 * - `'ignored'` — unknown reference, superseded attempt, or verification said
 *   the transaction was not actually successful; no state was changed.
 *
 * Any thrown HttpError 502 (provider unreachable / invalid response) will
 * bubble to the error middleware and cause a 5xx so Paystack retries later.
 */

export async function reconcilePaymentFromWebhook(
  input: ReconcilePaymentEventInput,
): Promise<'settled' | 'already-settled' | 'ignored'> {
  const provider = requireOnlinePaymentEnabled()
  const adapter = getProviderAdapter(provider)

  const payment = await prisma.payment.findUnique({
    where: { provider_providerReference: { provider, providerReference: input.providerReference } },
  })

  if (!payment) {
    console.error('paystack_webhook_unknown_reference', {
      provider,
      providerReference: input.providerReference,
    })
    return 'ignored'
  }

  if (payment.status === PaymentRecordStatus.SUCCESSFUL) {
    console.info('paystack_webhook_duplicate', {
      orderId: payment.orderId,
      providerReference: payment.providerReference,
    })
    return 'already-settled'
  }

  // A failed/superseded attempt can never be resurrected into a success by a
  // late webhook: the customer starts a fresh reference instead.
  if (payment.status !== PaymentRecordStatus.PENDING) {
    console.info('paystack_webhook_superseded_attempt', {
      orderId: payment.orderId,
      providerReference: payment.providerReference,
      status: payment.status,
    })
    return 'ignored'
  }

  const order = await prisma.order.findUnique({ where: { id: payment.orderId } })
  if (!order) {
    console.error('paystack_webhook_orphan_payment', {
      orderId: payment.orderId,
      providerReference: payment.providerReference,
    })
    return 'ignored'
  }

  // Re-verify the transaction with Paystack's API using the Secret Key.
  // The webhook payload's status/amount/currency are treated as untrusted.
  let result: PaymentVerifyResult
  try {
    // Re-poll a few times while Paystack reports the transaction as not yet
    // finalized, so an event that races the finalization window is still
    // settled here rather than dropped.
    result = await verifyWithRetries(adapter, payment.providerReference)
  } catch (error: unknown) {
    console.error('paystack_webhook_verification_failure', {
      orderId: order.id,
      providerReference: payment.providerReference,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // Bubble to error middleware → 5xx → Paystack retries the event later.
    throw error
  }

  if (result.status !== 'SUCCESSFUL') {
    if (result.status === 'UNCONFIRMED') {
      // The transaction may still be finalizing at the provider (e.g. it was
      // charged but not yet committed when this event arrived). Acknowledge
      // nothing: return a retryable 5xx so Paystack re-delivers this event
      // later and the order is not left stuck in PENDING.
      console.info('paystack_webhook_unconfirmed', {
        orderId: order.id,
        providerReference: payment.providerReference,
      })
      throw new HttpError(503, 'The payment is not yet finalised by the provider. Will retry.')
    }
    console.info('paystack_webhook_not_successful', {
      orderId: order.id,
      providerStatus: result.status,
      providerReference: payment.providerReference,
    })
    return 'ignored'
  }

  const matchesAmount = paystackAmountMatches(payment.amount, result)
  const matchesCurrency = expectedCurrencyMatches(payment.currency)(result.currency)

  if (!matchesAmount || !matchesCurrency) {
    console.error(matchesAmount ? 'paystack_webhook_currency_mismatch' : 'paystack_webhook_amount_mismatch', {
      orderId: order.id,
      providerReference: payment.providerReference,
      expectedAmount: payment.amount.toString(),
      requestedAmount: result.requestedAmountInNaira,
      receivedAmount: result.amountInNaira,
      fees: result.feesInNaira,
      receivedCurrency: result.currency,
    })
    return 'ignored'
  }

  try {
    const settled = await settleSuccessfulPayment(order, payment, result.paidAt ?? null, result)

    if (settled.alreadySettled) {
      return 'already-settled'
    }

    console.info('paystack_webhook_reconciled', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      providerReference: payment.providerReference,
    })
    return 'settled'
  } catch (error: unknown) {
    // 409 means the attempt was superseded between our pre-check and the
    // transaction lock. Safe to acknowledge — the newer attempt owns the
    // payment lifecycle now.
    if (error instanceof HttpError && error.statusCode === 409) {
      console.info('paystack_webhook_superseded_race', {
        orderId: order.id,
        providerReference: payment.providerReference,
      })
      return 'ignored'
    }
    console.error('paystack_webhook_db_failure', {
      orderId: order.id,
      providerReference: payment.providerReference,
      error: error instanceof Error ? error.message : 'Unknown database error',
    })
    throw error
  }
}
