import { PaymentRecordStatus, Prisma, type Order, type Payment } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { PaymentVerifyResult } from './payment.provider.js'

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

export const expectedCurrencyMatches =
  (expected: string) =>
  (received: string | null): boolean =>
    Boolean(received && received.toUpperCase() === expected.toUpperCase())

// Validates the amount of a successful Paystack transaction in a way that
// supports BOTH merchant fee configurations automatically, without hardcoding
// any fee percentage/flat formula and without a customerPaysFee flag.
//
// Paystack's verify response reports three authoritative figures (all in the
// currency's minor unit, e.g. kobo):
//   requested_amount - what THIS instance asked Paystack to collect. It equals
//                      the stored order total (in kobo) and is set server-side
//                      at initialization, so it is immune to later manipulation.
//   fees             - Paystack's own processing charge for the transaction,
//                      reported directly by Paystack (never derived by us).
//   amount           - the gross amount actually charged to the customer:
//                        = requested_amount  when the merchant absorbs the fee
//                        = requested_amount + fees when the fee is passed to the
//                          customer (Paystack also charges a fee on the added fee,
//                          but its `fees` field already reflects the final total).
//
// The tamper-proof gate is that `requested_amount` must EXACTLY equal the stored
// order total: an attacker cannot inflate the expected value because this amount
// was chosen by the server and locked to a unique, server-verified reference.
// Separately, we require the charged amount to be at least the requested amount
// and the gap (if any) to equal Paystack's own reported fee — so an arbitrary
// overcharge that is not exactly Paystack's fee can never pass.
export function paystackAmountMatches(
  expected: string | Prisma.Decimal,
  result: Pick<PaymentVerifyResult, 'amountInNaira' | 'requestedAmountInNaira' | 'feesInNaira'>,
): boolean {
  if (!result.amountInNaira || !result.requestedAmountInNaira) return false
  const expectedTotal = new Prisma.Decimal(expected.toString())
  let charged: Prisma.Decimal
  let requested: Prisma.Decimal
  let fee: Prisma.Decimal | null
  try {
    charged = new Prisma.Decimal(result.amountInNaira)
    requested = new Prisma.Decimal(result.requestedAmountInNaira)
    fee = result.feesInNaira === null ? null : new Prisma.Decimal(result.feesInNaira)
  } catch {
    return false
  }
  if (!charged.isFinite() || !requested.isFinite() || !expectedTotal.isFinite()) return false
  if (fee !== null && !fee.isFinite()) return false

  // 1) The requested amount must be exactly the stored order total (> 0).
  if (!requested.equals(expectedTotal) || !requested.gt(0)) return false

  // 2) The customer must never be charged less than the requested amount.
  if (charged.lt(requested)) return false

  // 3) The gap between the charged and requested amounts must be exactly
  //    Paystack's own reported fee (customer-pays case) or zero
  //    (merchant-absorbs case). We read `fees`; we do not compute it.
  const surplus = charged.minus(requested)
  if (fee !== null && fee.gte(0) && surplus.equals(fee)) return true
  return surplus.isZero()
}

export interface SettleOutcome {
  alreadySettled: boolean
  /** Source cart row IDs deleted inside the transaction (for post-settle cleanup). */
  releasedCartIds: string[]
}

// Merge the verified provider amounts into the Payment's provider_metadata JSON
// column. Order value (Payment.amount) stays as the order total; the actual
// provider transaction breakdown is stored here so the two are never conflated.
// Existing init metadata (authorizationUrl/accessCode) is preserved.
function buildSettledProviderMetadata(
  existing: Prisma.JsonValue | null,
  result?: Pick<PaymentVerifyResult, 'amountInNaira' | 'requestedAmountInNaira' | 'feesInNaira' | 'providerMetadata'>,
): Prisma.InputJsonValue {
  const base: Record<string, unknown> =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {}
  return {
    ...base,
    ...(result?.amountInNaira != null ? { amountCharged: result.amountInNaira } : {}),
    ...(result?.requestedAmountInNaira != null ? { requestedAmount: result.requestedAmountInNaira } : {}),
    ...(result?.feesInNaira != null ? { processingFee: result.feesInNaira } : {}),
    ...(derivedChannel(null, result) ? { channel: derivedChannel(null, result) } : {}),
  } as Prisma.InputJsonValue
}

// Resolve the payment channel from verified provider metadata, falling back to
// the currently stored method. Channel flows through providerMetadata.{channel}.
function derivedChannel(
  current: string | null | undefined,
  result?: Pick<PaymentVerifyResult, 'providerMetadata'>,
): string | null {
  const meta = result?.providerMetadata as Record<string, unknown> | undefined
  const fromMeta = typeof meta?.channel === 'string' ? meta.channel : null
  return fromMeta ?? current ?? null
}

export async function settleSuccessfulPayment(
  order: Order,
  payment: Payment,
  paidAt: string | null,
  result?: Pick<PaymentVerifyResult, 'amountInNaira' | 'requestedAmountInNaira' | 'feesInNaira' | 'providerMetadata'>,
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
      data: {
        status: PaymentRecordStatus.SUCCESSFUL,
        completedAt: paidAtValue,
        method: derivedChannel(payment.method, result) ?? undefined,
        // Persist the actual provider transaction breakdown so the Payment
        // record can represent the true amount charged (and Paystack's fee)
        // even when it differs from the order total due to fee handling.
        providerMetadata: buildSettledProviderMetadata(payment.providerMetadata, result),
      },
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
