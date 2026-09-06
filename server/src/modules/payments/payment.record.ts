import { PaymentProvider, PaymentRecordStatus, Prisma, PrismaClient, type Order, type Payment } from '@prisma/client'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/http.js'

type DbExecutor = Prisma.TransactionClient | PrismaClient

// Service layer for the provider-agnostic Payment record.
//
// Phase 1 establishes the database/backend foundation for gateway payments:
// typed creation, server-side amount handling in minor units via Prisma.Decimal,
// and idempotent provider-reference handling. Paystack initialization/verification
// is added in a later phase on top of these primitives.

export interface CreatePaymentRecordInput {
  orderId: string
  provider: PaymentProvider
  providerReference: string
  amount: string | Prisma.Decimal
  currency?: string
  status?: PaymentRecordStatus
  method?: string
  providerMetadata?: Record<string, unknown>
  completedAt?: Date
}

/** The money the server expects for an order, as a Decimal. */
export const serverExpectedAmount = (order: Pick<Order, 'total'>): Prisma.Decimal =>
  new Prisma.Decimal(order.total.toString())

/**
 * Create a Payment record atomically. Amount is converted from the string kobo
 * equivalent the provider returns (already handled server-side) or stored as the
 * server-computed order total. The composite unique constraint on
 * [provider, providerReference] is the guard against duplicate processing.
 */
export async function createPaymentRecord(
  executor: DbExecutor,
  input: CreatePaymentRecordInput,
): Promise<Payment> {
  try {
    return await executor.payment.create({
      data: {
        orderId: input.orderId,
        provider: input.provider,
        providerReference: input.providerReference,
        amount: input.amount,
        currency: input.currency ?? env.payments.currency,
        status: input.status ?? PaymentRecordStatus.PENDING,
        method: input.method ?? null,
        providerMetadata: input.providerMetadata === undefined
          ? undefined
          : (input.providerMetadata as Prisma.InputJsonValue),
        initializedAt: new Date(),
        completedAt: input.completedAt ?? null,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'A payment for this transaction already exists.')
    }
    throw error
  }
}

export async function findPaymentByProviderReference(
  executor: DbExecutor,
  provider: PaymentProvider,
  providerReference: string,
): Promise<Payment | null> {
  return executor.payment.findUnique({
    where: {
      provider_providerReference: { provider, providerReference },
    },
  })
}

/**
 * Verify that an incoming gateway amount matches what the server expects for the
 * order. Amount input is the gateway's kobo (minor unit) value as a string, and
 * is compared against the server-computed order total converted to kobo. This is
 * the server-side amount check the security foundation requires — the frontend
 * amount is never trusted.
 */
export function assertServerAmountMatches(
  order: Pick<Order, 'total'>,
  providerAmountInKobo: string | number,
): void {
  const expected = serverExpectedAmount(order).mul(100)
  const received = new Prisma.Decimal(String(providerAmountInKobo))
  if (!expected.eq(received)) {
    throw new HttpError(400, 'Payment amount does not match the order total.')
  }
}