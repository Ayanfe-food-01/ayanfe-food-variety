import { OrderStatus, PaymentProvider, PaymentRecordStatus, Prisma, type Order, type Payment } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { prisma } from '../../config/prisma.js'
import { hashGuestOrderAccessToken } from '../../utils/guestOrderAccess.js'
import { HttpError } from '../../utils/http.js'
import { getProviderAdapter, requireOnlinePaymentEnabled } from './payment.provider.js'
import { createPaymentRecord } from './payment.record.js'
import type { PaymentInitResponse } from './payment.types.js'

export interface InitializePaymentInput {
  orderId: string
  authenticatedUserId?: string
  guestAccessToken?: string
  /** Where Paystack returns the customer after checkout. Origin must be whitelisted. */
  callbackUrl?: string
}

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
