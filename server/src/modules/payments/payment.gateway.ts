import { OrderStatus, PaymentProvider, PaymentRecordStatus, Prisma, type Order, type Payment } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import { HttpError } from '../../utils/http.js'
import {
  getProviderAdapter,
  requireOnlinePaymentEnabled,
  type PaymentVerifyResult,
} from './payment.provider.js'
import { createPaymentRecord } from './payment.record.js'
import type { PaymentInitResponse, PaymentVerifyResponse } from './payment.types.js'

// Initialization service for online (gateway) payments. This is the only place
// in the application that starts a provider transaction for an order. The order
// payment status is never changed here: a successful initialization only ever
// leaves the Payment record in PENDING.

export interface InitializePaymentInput {
  orderId: string
  authenticatedUserId?: string
  guestAccessToken?: string
  /** Where Paystack returns the customer after checkout. Origin must be whitelisted. */
  callbackUrl?: string
}

// A PENDING attempt created but without a gateway authorization URL yet is
// considered "in flight"; within this window it is reused/blocked instead of
// spawning a second transaction. Older PENDING attempts without a URL are
// abandoned and superseded.
const IN_FLIGHT_WINDOW_MS = 5 * 60 * 1000
const MAX_REFERENCE_ATTEMPTS = 3

const toPaymentInitResponse = (input: {
  orderId: string
  provider: PaymentProvider
  providerReference: string
  authorizationUrl: string
  amount: Prisma.Decimal
  currency: string
}): PaymentInitResponse => ({
  orderId: input.orderId,
  provider: input.provider,
  providerReference: input.providerReference,
  authorizationUrl: input.authorizationUrl,
  amount: input.amount.toString(),
  currency: input.currency,
  status: PaymentRecordStatus.PENDING,
})

const generateProviderReference = (orderNumber: string): string =>
  `pay-${orderNumber}-${randomUUID()}`

// The return URL the gateway should send the customer back to. It is client
// supplied because only the frontend knows its own origin and the guest access
// parameter, but it is restricted to origins the store has whitelisted so it
// cannot be pointed anywhere off-site.
const validateCallbackUrl = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new HttpError(400, 'Payment return URL is invalid.')
  }
  if (!env.corsOrigins.includes(url.origin)) {
    throw new HttpError(400, 'Payment return URL is not allowed for this store.')
  }
  return url.toString()
}

const assertOrderPaymentEligible = (order: Order): string => {
  if (order.paymentStatus === 'PAID') {
    throw new HttpError(409, 'This order has already been paid.')
  }
  if (order.orderStatus === OrderStatus.CANCELLED) {
    throw new HttpError(409, 'Payment cannot be started for a cancelled order.')
  }
  const total = new Prisma.Decimal(order.total.toString())
  if (!total.isFinite() || total.lte(0)) {
    throw new HttpError(400, 'This order has an invalid total and cannot be paid online.')
  }
  const email = order.email?.trim()
  if (!email) {
    throw new HttpError(400, 'A contact email is required to start online payment.')
  }
  return email
}

export async function initializeOrderPayment(
  input: InitializePaymentInput,
): Promise<PaymentInitResponse> {
  const provider = requireOnlinePaymentEnabled()
  const adapter = getProviderAdapter(provider)

  const order = await prisma.order.findUnique({ where: { id: input.orderId } })
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
  const email = assertOrderPaymentEligible(order)
  const callbackUrl = validateCallbackUrl(input.callbackUrl)

  // Decide whether to reuse an existing valid pending attempt or create a fresh
  // one. The order row is locked so concurrent initializations for the same
  // order cannot race into two separate provider transactions.
  const settled = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(
      Prisma.sql`SELECT id FROM orders WHERE id = ${order.id}::uuid FOR UPDATE`,
    )

    const existing = await transaction.payment.findFirst({
      where: { orderId: order.id, provider },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      if (existing.status === PaymentRecordStatus.SUCCESSFUL) {
        throw new HttpError(409, 'This order has already been paid.')
      }
      if (existing.status === PaymentRecordStatus.PENDING) {
        const metadata = existing.providerMetadata as Record<string, unknown> | null
        const authorizationUrl = typeof metadata?.authorizationUrl === 'string'
          ? metadata.authorizationUrl
          : null
        if (authorizationUrl) {
          return {
            kind: 'reused' as const,
            reused: {
              providerReference: existing.providerReference,
              authorizationUrl,
            },
          }
        }
        const stillInFlight = existing.createdAt.getTime() > Date.now() - IN_FLIGHT_WINDOW_MS
        if (stillInFlight) {
          throw new HttpError(409, 'Payment for this order is already being prepared. Refresh the payment page and try again.')
        }
        await transaction.payment.updateMany({
          where: { id: existing.id, status: PaymentRecordStatus.PENDING },
          data: { status: PaymentRecordStatus.CANCELLED },
        })
      }
    }

    let created: Payment | null = null
    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
      try {
        created = await createPaymentRecord(transaction, {
          orderId: order.id,
          provider,
          providerReference: generateProviderReference(order.orderNumber),
          amount: order.total.toString(),
          currency: env.payments.currency,
        })
        break
      } catch (error: unknown) {
        if (error instanceof HttpError && error.statusCode === 409 && attempt < MAX_REFERENCE_ATTEMPTS - 1) {
          continue
        }
        throw error
      }
    }

    return {
      kind: 'created' as const,
      created: created as Payment,
    }
  })

  if (settled.kind === 'reused') {
    return toPaymentInitResponse({
      orderId: order.id,
      provider,
      providerReference: settled.reused.providerReference,
      authorizationUrl: settled.reused.authorizationUrl,
      amount: order.total,
      currency: env.payments.currency,
    })
  }

  const payment = settled.created
  let result
  try {
    result = await adapter.initialize({
      providerReference: payment.providerReference,
      orderNumber: order.orderNumber,
      amountInNaira: order.total.toString(),
      currency: payment.currency,
      email,
      callbackUrl,
    })
  } catch (error: unknown) {
    try {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentRecordStatus.FAILED },
      })
    } catch {
      // Best-effort cleanup; the original provider error is the priority.
    }
    throw error
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerMetadata: result.providerMetadata as Prisma.InputJsonValue,
    },
  })

  return toPaymentInitResponse({
    orderId: order.id,
    provider,
    providerReference: result.providerReference,
    authorizationUrl: result.authorizationUrl,
    amount: payment.amount,
    currency: payment.currency,
  })
}

// ---------------------------------------------------------------------------
// Amount / currency guards shared by every confirmation path (frontend
// verification and webhook reconciliation). The expected value always comes
// from the authoritative backend record, never from the frontend or the raw
// webhook payload.
// ---------------------------------------------------------------------------

const expectedAmountMatches =
  (expected: string | Prisma.Decimal) =>
  (received: string | null): boolean => {
    if (!received) return false
    try {
      const parsed = new Prisma.Decimal(received)
      const want = new Prisma.Decimal(expected.toString())
      return parsed.isFinite() && want.isFinite() && parsed.equals(want) && parsed.gt(0)
    } catch {
      return false
    }
  }

const expectedCurrencyMatches =
  (expected: string) =>
  (received: string | null): boolean =>
    Boolean(received && received.toUpperCase() === expected.toUpperCase())

// ---------------------------------------------------------------------------
// Shared atomic settle.
//
// Both the customer-facing verify flow and the server-to-server webhook flow
// converge here so the Payment and Order state can never diverge, even when
// a frontend verify races a webhook. The order row is locked with FOR UPDATE
// and every write is status-guarded, making concurrent settling idempotent.
// ---------------------------------------------------------------------------

interface SettleOutcome {
  alreadySettled: boolean
  /** Source cart row IDs deleted inside the transaction (for post-settle cleanup). */
  releasedCartIds: string[]
}

async function settleSuccessfulPayment(
  order: Order,
  payment: Payment,
  paidAt: string | null,
): Promise<SettleOutcome> {
  const settled = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(
      Prisma.sql`SELECT id FROM orders WHERE id = ${order.id}::uuid FOR UPDATE`,
    )

    const currentPayment = await transaction.payment.findUnique({ where: { id: payment.id } })
    if (currentPayment?.status === PaymentRecordStatus.SUCCESSFUL) {
      return { alreadySettled: true as const, releasedCartIds: [] }
    }
    if (currentPayment?.status === PaymentRecordStatus.FAILED || currentPayment == null) {
      throw new HttpError(409, 'The payment attempt has already been superseded. Start the payment again.')
    }

    const paidAtValue = new Date()
    await transaction.payment.updateMany({
      where: { id: payment.id, status: PaymentRecordStatus.PENDING },
      data: { status: PaymentRecordStatus.SUCCESSFUL, completedAt: paidAtValue },
    })
    await transaction.order.updateMany({
      where: { id: order.id, paymentStatus: { not: 'PAID' } },
      data: { paymentStatus: 'PAID', paymentConfirmedAt: paidAtValue },
    })

    // Release only the cart rows that were checked out with this gateway order.
    const cartItemIds = Array.isArray(order.paymentCartItemIds)
      ? (order.paymentCartItemIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : []
    if (cartItemIds.length > 0) {
      await transaction.customerCartItem.deleteMany({ where: { id: { in: cartItemIds } } })
    }

    return { alreadySettled: false as const, releasedCartIds: cartItemIds }
  })

  if (!settled.alreadySettled && settled.releasedCartIds.length > 0) {
    await prisma.order.updateMany({
      where: { id: order.id },
      data: { paymentCartItemIds: Prisma.JsonNull },
    })
  }

  return settled
}

// ---------------------------------------------------------------------------
// Verification.
//
// The stored providerReference on the Payment record is the only reference we
// ever verify; nothing supplied independently by the client is used to address
// a provider transaction. Order state is updated only inside the same database
// transaction that settles the Payment record, so a crash cannot leave a paid
// order with an unconfirmed Payment record (or vice versa).
// ---------------------------------------------------------------------------

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
  const result = await adapter.verify({
    providerReference: payment.providerReference,
  })

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
  const matchesAmount = expectedAmountMatches(payment.amount)(result.amountInNaira)
  const matchesCurrency = expectedCurrencyMatches(payment.currency)(result.currency)

  if (!matchesAmount || !matchesCurrency) {
    console.error('paystack_verify_mismatch', {
      orderId: order.id,
      provider,
      providerReference: payment.providerReference,
      receivedAmount: result.amountInNaira,
      receivedCurrency: result.currency,
    })
    throw new HttpError(422, 'The payment could not be confirmed because the charged amount or currency did not match the order. Please contact support.')
  }

  const settled = await settleSuccessfulPayment(order, payment, result.paidAt ?? null)

  if (settled.alreadySettled) {
    const current = await prisma.payment.findUnique({ where: { id: payment.id } })
    const currentOrder = await prisma.order.findUnique({ where: { id: order.id } })
    const paid = current?.status === PaymentRecordStatus.SUCCESSFUL && currentOrder?.paymentStatus === 'PAID'
    return toResponse(paid ? 'PAID' : 'PENDING', null, current ?? payment)
  }

  const settledRecord: Payment = { ...payment, status: PaymentRecordStatus.SUCCESSFUL }
  return toResponse('PAID', result.paidAt ?? null, settledRecord)
}

// ---------------------------------------------------------------------------
// Webhook-driven reconciliation.
//
// Called after the webhook endpoint has verified the Paystack HMAC signature
// and confirmed the event is a `charge.success`. The transaction reference in
// the event is used to locate the internal Payment record. The provider is
// then asked to verify the transaction a second time server-side, and only
// the authoritative Amount/Currency from that verification call are compared
// against the backend Payment record.
//
// This function is idempotent: if the same reference arrives again, or if
// the customer already returned and the verify path settled the payment, the
// outcome is the same and the event is safely acknowledged.
// ---------------------------------------------------------------------------

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
    result = await adapter.verify({ providerReference: payment.providerReference })
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
    console.info('paystack_webhook_not_successful', {
      orderId: order.id,
      providerStatus: result.status,
      providerReference: payment.providerReference,
    })
    return 'ignored'
  }

  const matchesAmount = expectedAmountMatches(payment.amount)(result.amountInNaira)
  const matchesCurrency = expectedCurrencyMatches(payment.currency)(result.currency)

  if (!matchesAmount || !matchesCurrency) {
    console.error(matchesAmount ? 'paystack_webhook_currency_mismatch' : 'paystack_webhook_amount_mismatch', {
      orderId: order.id,
      providerReference: payment.providerReference,
      receivedAmount: result.amountInNaira,
      receivedCurrency: result.currency,
    })
    return 'ignored'
  }

  try {
    const settled = await settleSuccessfulPayment(order, payment, result.paidAt ?? null)

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