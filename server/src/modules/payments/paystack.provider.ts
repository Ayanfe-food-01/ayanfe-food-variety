import { PaymentProvider, Prisma } from '@prisma/client'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/http.js'
import type { PaymentInitInput, PaymentInitResult } from './payment.provider.js'

// Paystack-specific gateway logic. Nothing else in the application should call
// the Paystack API directly; consumers use the adapter in payment.provider.ts.

const PAYSTACK_API_BASE = 'https://api.paystack.co'
const INITIALIZE_PATH = '/transaction/initialize'
const VERIFY_PATH = '/transaction/verify'
const REQUEST_TIMEOUT_MS = 15000
const SUPPORTED_CURRENCIES = new Set(['NGN', 'GHS', 'ZAR', 'KES', 'USD', 'GBP'])
const SUPPORTED_VERIFY_STATUSES = new Set(['success', 'failed', 'abandoned', 'pending'])

/**
 * Convert a naira (major unit) amount to kobo (minor unit) using exact decimal
 * arithmetic. The order total always has two decimal places, so this yields an
 * integer; string formatting avoids floating-point precision problems.
 */
export const nairaToKobo = (naira: string | Prisma.Decimal): string =>
  new Prisma.Decimal(String(naira)).mul(100).toFixed(0)

const requirePaystackSecretKey = (): string => {
  const secretKey = env.payments.paystack.secretKey
  if (!secretKey) {
    throw new HttpError(503, 'Online payment is not configured yet.')
  }
  return secretKey
}

interface PaystackInitializeResponseData {
  authorization_url?: unknown
  access_code?: unknown
  reference?: unknown
  status?: unknown
  message?: unknown
}

export async function initializePaystackTransaction(
  input: PaymentInitInput,
): Promise<PaymentInitResult> {
  const secretKey = requirePaystackSecretKey()

  if (!SUPPORTED_CURRENCIES.has(input.currency)) {
    throw new HttpError(400, `Currency ${input.currency} is not supported by the payment provider.`)
  }

  const amountKobo = nairaToKobo(input.amountInNaira)

  const requestBody: Record<string, unknown> = {
    reference: input.providerReference,
    amount: amountKobo,
    currency: input.currency,
    email: input.email,
  }
  if (input.callbackUrl) requestBody.callback_url = input.callbackUrl

  let response: Response
  try {
    response = await fetch(`${PAYSTACK_API_BASE}${INITIALIZE_PATH}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error: unknown) {
    console.error('paystack_initialize_network_failure', {
      provider: 'PAYSTACK',
      error: error instanceof Error ? error.message : 'Unknown network error',
    })
    throw new HttpError(502, 'The payment provider could not be reached. Please try again.')
  }

  let payload: { status?: unknown; message?: unknown; data?: PaystackInitializeResponseData }
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    console.error('paystack_initialize_invalid_response', { status: response.status })
    throw new HttpError(502, 'The payment provider returned an invalid response. Please try again.')
  }

  if (!response.ok || payload.status !== true || typeof payload.data?.authorization_url !== 'string') {
    const providerMessage = typeof payload.message === 'string' ? payload.message : null
    console.error('paystack_initialize_declined', {
      provider: 'PAYSTACK',
      httpStatus: response.status,
      providerMessage,
    })
    throw new HttpError(502, 'The payment provider declined the transaction. Please try again.')
  }

  const authorizationUrl = payload.data.authorization_url
  const providerReference = payload.data.reference

  if (typeof providerReference !== 'string' || providerReference !== input.providerReference) {
    console.error('paystack_initialize_reference_mismatch', {
      provider: 'PAYSTACK',
      expected: input.providerReference,
    })
    throw new HttpError(502, 'The payment provider returned an unexpected transaction reference.')
  }

  return {
    provider: PaymentProvider.PAYSTACK,
    providerReference,
    authorizationUrl,
    providerMetadata: {
      authorizationUrl,
      accessCode: typeof payload.data.access_code === 'string' ? payload.data.access_code : null,
    },
  }
}

export interface PaystackVerifyResult {
  /** Provider-level outcome of the verification call. */
  status: 'success' | 'failed' | 'abandoned' | 'pending'
  providerReference: string
  /** Amount charged by the provider, in minor units (kobo). */
  amountInKobo: string
  currency: string
  paidAt: string | null
  channel: string | null
}

interface PaystackVerifyResponseData {
  status?: unknown
  reference?: unknown
  amount?: unknown
  currency?: unknown
  paid_at?: unknown
  channel?: unknown
  [key: string]: unknown
}

/**
 * Ask Paystack for the current state of an initialized transaction. The
 * reference here is ALWAYS the one stored on our Payment record at init time,
 * never a value supplied independently by the client.
 */
export async function verifyPaystackTransaction(
  providerReference: string,
): Promise<PaystackVerifyResult> {
  const secretKey = requirePaystackSecretKey()

  let response: Response
  try {
    response = await fetch(`${PAYSTACK_API_BASE}${VERIFY_PATH}/${encodeURIComponent(providerReference)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error: unknown) {
    console.error('paystack_verify_network_failure', {
      provider: 'PAYSTACK',
      error: error instanceof Error ? error.message : 'Unknown network error',
    })
    throw new HttpError(502, 'Payment status could not be confirmed right now. Please try again.')
  }

  let payload: { status?: unknown; message?: unknown; data?: PaystackVerifyResponseData }
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    console.error('paystack_verify_invalid_response', { status: response.status })
    throw new HttpError(502, 'Payment status could not be confirmed right now. Please try again.')
  }

  // A 404 means Paystack has no transaction for this reference (it was never
  // initialized with the current provider key, or the reference is stale).
  if (response.status === 404 || payload.status !== true || typeof payload.data?.status !== 'string') {
    const providerMessage = typeof payload.message === 'string' ? payload.message : null
    console.error('paystack_verify_transaction_not_found', {
      provider: 'PAYSTACK',
      httpStatus: response.status,
      providerMessage,
    })
    return {
      status: 'abandoned',
      providerReference,
      amountInKobo: '',
      currency: '',
      paidAt: null,
      channel: null,
    }
  }
  // A 4xx/5xx with a recognizable body is a provider-side failure; surface it.
  if (!response.ok) {
    const providerMessage = typeof payload.message === 'string' ? payload.message : null
    console.error('paystack_verify_declined', {
      provider: 'PAYSTACK',
      httpStatus: response.status,
      providerMessage,
    })
    throw new HttpError(502, 'Payment status could not be confirmed right now. Please try again.')
  }

  const status = payload.data.status
  if (!SUPPORTED_VERIFY_STATUSES.has(status)) {
    console.error('paystack_verify_unexpected_status', {
      provider: 'PAYSTACK',
      status,
    })
    throw new HttpError(502, 'Payment status could not be confirmed right now. Please try again.')
  }

  const echoedReference = typeof payload.data.reference === 'string' ? payload.data.reference : null
  const amountInKobo = typeof payload.data.amount === 'string' ? payload.data.amount
    : typeof payload.data.amount === 'number' ? String(payload.data.amount) : null
  const currency = typeof payload.data.currency === 'string' ? payload.data.currency.toUpperCase() : null

  if (!echoedReference || echoedReference !== providerReference) {
    console.error('paystack_verify_reference_mismatch', {
      provider: 'PAYSTACK',
      expected: providerReference,
    })
    throw new HttpError(502, 'Payment status could not be confirmed right now. Please try again.')
  }

  const result: PaystackVerifyResult = {
    status: status as PaystackVerifyResult['status'],
    providerReference: echoedReference,
    amountInKobo: amountInKobo ?? '',
    currency: currency ?? '',
    paidAt: typeof payload.data.paid_at === 'string' ? payload.data.paid_at : null,
    channel: typeof payload.data.channel === 'string' ? payload.data.channel : null,
  }

  return result
}