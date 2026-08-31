import { createHmac, timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import express from 'express'
import type { RequestHandler } from 'express'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/http.js'
import { reconcilePaymentFromWebhook } from './payment.gateway.js'

// ---------------------------------------------------------------------------
// Paystack webhook: signature verification, event parsing, and reconciliation.
//
// This is a server-to-server endpoint. No customer session is needed or used.
// The webhook never trusts the event payload's own amount/status; it always
// re-verifies the transaction with Paystack's API using the Secret Key.
// ---------------------------------------------------------------------------

const CHARGE_SUCCESS = 'charge.success'
const EVENT_MAX_LENGTH = 80

// --- Pure helpers ----------------------------------------------------------

/**
 * Compute the Paystack webhook signature for a raw request body.
 * Paystack signs with HMAC-SHA512 using the webhook secret hash as the key.
 */
export function computePaystackWebhookSignature(
  body: Buffer | string,
  secret: string,
): string {
  return createHmac('sha512', secret).update(body).digest('hex')
}

/**
 * Timing-safe comparison of an incoming Paystack signature against the
 * expected HMAC.  Returns false for any obviously malformed input.
 */
export function isPaystackWebhookSignatureValid(
  body: Buffer | string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) return false
  let expected: Buffer
  try {
    expected = Buffer.from(computePaystackWebhookSignature(body, secret), 'hex')
  } catch {
    return false
  }
  const provided = Buffer.from(signature, 'hex')
  if (expected.length !== provided.length || expected.length === 0) return false
  return timingSafeEqual(expected, provided)
}

// --- Express middleware ----------------------------------------------------

/**
 * Verify the `x-paystack-signature` header before any JSON parsing or
 * business logic runs.  Rejects with 401 on any mismatch so Paystack
 * does not re-deliver invalid requests.
 */
export const paystackWebhookSignatureVerifier: RequestHandler = (
  request,
  response,
  next,
) => {
  const secret = env.payments.paystack.webhookSecret
  if (!secret) {
    console.error('paystack_webhook_not_configured')
    next(new HttpError(401, 'Webhook authentication is not configured.'))
    return
  }

  const signature = request.get('x-paystack-signature')
  if (!signature) {
    console.error('paystack_webhook_missing_signature')
    next(new HttpError(401, 'Webhook signature is missing.'))
    return
  }

  const body = Buffer.isBuffer(request.body) ? request.body : Buffer.from(String(request.body ?? ''))
  if (!isPaystackWebhookSignatureValid(body, signature, secret)) {
    console.error('paystack_webhook_invalid_signature')
    next(new HttpError(401, 'Webhook signature is invalid.'))
    return
  }

  next()
}

// --- Controller ------------------------------------------------------------

type PaystackWebhookData = {
  reference?: unknown
  [key: string]: unknown
}

type PaystackWebhookPayload = {
  event?: unknown
  data?: PaystackWebhookData
}

/**
 * Parse a signed Paystack event, confirm it is a `charge.success`, and hand
 * the transaction reference off to the reconciler.
 *
 * - Unsupported events and unknown references are acknowledged with 200 so
 *   Paystack does not re-deliver them indefinitely.
 * - Malformed JSON or missing references are rejected with 400.
 * - Provider-verification or database failures surface as 5xx so Paystack
 *   retries the event later.
 */
export const paystackWebhookController: RequestHandler = async (
  request,
  response,
) => {
  let payload: PaystackWebhookPayload
  try {
    const raw = Buffer.isBuffer(request.body)
      ? request.body.toString('utf8')
      : String(request.body ?? '')
    payload = JSON.parse(raw) as PaystackWebhookPayload
  } catch {
    console.error('paystack_webhook_invalid_payload')
    response.status(400).json({ status: 'invalid-payload' })
    return
  }

  if (payload.event !== CHARGE_SUCCESS) {
    console.info('paystack_webhook_ignored_event', {
      event: typeof payload.event === 'string' ? payload.event.slice(0, EVENT_MAX_LENGTH) : 'unknown',
    })
    response.status(200).json({ status: 'ignored' })
    return
  }

  const reference =
    typeof payload.data?.reference === 'string'
      ? payload.data.reference
      : null

  if (!reference) {
    console.error('paystack_webhook_missing_reference', { event: payload.event })
    response.status(400).json({ status: 'invalid-payload' })
    return
  }

  await reconcilePaymentFromWebhook({ providerReference: reference })
  response.status(200).json({ status: 'ok' })
}

// --- Router ----------------------------------------------------------------

/**
 * Mounted in app.ts at `/api/v1/payments/paystack` *before* express.json(),
 * so the raw body buffer is available for HMAC verification.  Only the
 * `/webhook` path applies express.raw(); other routes fall through
 * untouched.
 */
export const paymentWebhookRouter = Router()

paymentWebhookRouter.post(
  '/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  paystackWebhookSignatureVerifier,
  paystackWebhookController,
)
