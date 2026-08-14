import { env } from '../../config/env.js'
import {
  escapeHtml,
  renderBrandedEmail,
  sendEmail,
} from '../../lib/email/email.service.js'

type PaymentRejectionReason =
  | 'AMOUNT_MISMATCH'
  | 'PROOF_UNCLEAR'
  | 'TRANSACTION_UNVERIFIED'
  | 'WRONG_ACCOUNT'
  | 'DUPLICATE_PROOF'
  | 'OTHER'

const formatPrice = (value: string): string =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value))

const formatReason = (reason?: PaymentRejectionReason | null): string =>
  reason?.replaceAll('_', ' ').toLowerCase() ?? 'Please contact us for help.'

export async function notifyPaymentSubmitted(order: {
  id: string
  customerName: string
  total: string
  transactionReference: string | null
  transferredAt: string
}): Promise<void> {
  if (!env.email.businessEmail) {
    console.warn('Payment submission email skipped: BUSINESS_EMAIL is not configured.')
    return
  }

  try {
    await sendEmail({
      to: env.email.businessEmail,
      subject: `New Payment Proof Submitted — Order #${order.id}`,
      html: renderBrandedEmail({
        title: 'Payment proof submitted',
        preheader: `A new payment proof is awaiting review for order ${order.id}.`,
        intro: 'A new bank-transfer payment proof is awaiting review.',
        contentHtml: `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7f1;border-radius:14px;color:#58695e;font-size:14px;">
            <tr><td style="padding:14px 16px 5px;">Order</td><td align="right" style="padding:14px 16px 5px;color:#173b2b;font-weight:bold;">${escapeHtml(order.id)}</td></tr>
            <tr><td style="padding:5px 16px;">Customer</td><td align="right" style="padding:5px 16px;color:#173b2b;">${escapeHtml(order.customerName)}</td></tr>
            <tr><td style="padding:5px 16px;">Amount</td><td align="right" style="padding:5px 16px;color:#173b2b;font-weight:bold;">${escapeHtml(formatPrice(order.total))}</td></tr>
            <tr><td style="padding:5px 16px;">Transaction reference</td><td align="right" style="padding:5px 16px;color:#173b2b;">${escapeHtml(order.transactionReference || 'Not provided')}</td></tr>
            <tr><td style="padding:5px 16px 14px;">Transfer date</td><td align="right" style="padding:5px 16px;color:#173b2b;">${escapeHtml(order.transferredAt)}</td></tr>
          </table>
          <p style="margin:24px 0 0;color:#58695e;font-size:14px;line-height:1.7;">Review this payment proof from the admin payment review area.</p>
        `,
      }),
      text: [
        'New Payment Proof Submitted',
        `Order: ${order.id}`,
        `Customer: ${order.customerName}`,
        `Amount: ${formatPrice(order.total)}`,
        `Transaction reference: ${order.transactionReference || 'Not provided'}`,
        `Transfer date: ${order.transferredAt}`,
      ].join('\n'),
    })
  } catch (error: unknown) {
    console.error(JSON.stringify({
      event: 'payment_email_failed',
      audience: 'business',
      orderId: order.id,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
  }
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
    : `We could not verify your payment proof. Reason: ${formatReason(order.rejectionReason)}${order.reviewNote ? ` — ${order.reviewNote}` : ''}`

  try {
    await sendEmail({
      to: order.customerEmail,
      subject,
      html: renderBrandedEmail({
        title: order.verified ? 'Payment confirmed' : 'Payment verification issue',
        preheader: `Payment update for order ${order.id}.`,
        intro: escapeHtml(message),
        contentHtml: `
          <div style="padding:16px;border-radius:14px;background:#f5f7f1;">
            <p style="margin:0;color:#66756b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Order number</p>
            <p style="margin:6px 0 0;color:#173b2b;font-size:20px;font-weight:bold;">${escapeHtml(order.id)}</p>
          </div>
          ${order.reviewNote ? `<p style="margin:22px 0 0;color:#58695e;font-size:14px;line-height:1.7;"><strong style="color:#173b2b;">Review note:</strong> ${escapeHtml(order.reviewNote)}</p>` : ''}
        `,
        footerNote: 'Keep your order number for future reference.',
      }),
      text: `Ayanfe Food Variety payment update\n\n${message}\n\nOrder: ${order.id}${order.reviewNote ? `\nReview note: ${order.reviewNote}` : ''}`,
    })
  } catch (error: unknown) {
    console.error(JSON.stringify({
      event: 'payment_email_failed',
      audience: 'customer',
      orderId: order.id,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
  }
}