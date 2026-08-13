import { env } from '../../config/env.js'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character)

interface EmailMessage {
  to: string
  subject: string
  html: string
}

type PaymentRejectionReason =
  | 'AMOUNT_MISMATCH'
  | 'PROOF_UNCLEAR'
  | 'TRANSACTION_UNVERIFIED'
  | 'WRONG_ACCOUNT'
  | 'DUPLICATE_PROOF'
  | 'OTHER'

async function sendEmail(message: EmailMessage): Promise<void> {
  if (!env.email.resendApiKey || !env.email.from) {
    console.warn('Payment email skipped: Resend is not configured.')
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.email.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.email.from, to: [message.to], subject: message.subject, html: message.html }),
  })
  if (!response.ok) console.error('Payment email provider returned an error', response.status)
}

export async function notifyPaymentSubmitted(order: {
  id: string
  customerName: string
  total: string
  transactionReference: string
  transferredAt: string
}): Promise<void> {
  if (!env.email.businessEmail) {
    console.warn('Payment submission email skipped: BUSINESS_EMAIL is not configured.')
    return
  }
  await sendEmail({
    to: env.email.businessEmail,
    subject: `New Payment Proof Submitted — Order #${order.id}`,
    html: `<p>A new bank-transfer payment proof is awaiting review.</p>
      <p>Order: ${escapeHtml(order.id)}<br>Customer: ${escapeHtml(order.customerName)}<br>
      Amount: ${escapeHtml(order.total)}<br>Transaction reference: ${escapeHtml(order.transactionReference)}<br>
      Transfer date: ${escapeHtml(order.transferredAt)}</p>
      <p>Review it from the payment review area.</p>`,
  })
}

export async function notifyPaymentReviewed(order: {
  id: string
  customerEmail: string | null
  verified: boolean
  reviewNote: string | null
  rejectionReason?: PaymentRejectionReason | null
}): Promise<void> {
  if (!order.customerEmail) return
  const subject = order.verified
    ? `Payment Confirmed — Order #${order.id}`
    : `Payment Verification Issue — Order #${order.id}`
  const message = order.verified
    ? 'Your payment has been verified. Your order remains pending fulfillment review.'
    : `We could not verify your payment proof. Reason: ${order.rejectionReason?.replaceAll('_', ' ').toLowerCase() ?? 'Please contact us for help.'}${order.reviewNote ? ` — ${order.reviewNote}` : ''}`
  await sendEmail({
    to: order.customerEmail,
    subject,
    html: `<p>${escapeHtml(message)}</p><p>Order: ${escapeHtml(order.id)}</p>`,
  })
}