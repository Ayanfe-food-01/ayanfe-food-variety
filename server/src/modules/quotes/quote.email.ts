import type { AdminQuoteRequest } from './quote.types.js'
import {
  escapeHtml,
  getAppLink,
  renderBrandedEmail,
  sendEmail,
  type EmailMessage,
} from '../../lib/email/email.service.js'
import { formatPrice } from '../orders/order.email.js'

const formatFulfillment = (method: AdminQuoteRequest['fulfillmentMethod']): string =>
  method === 'DELIVERY' ? 'Delivery' : method === 'PICKUP' ? 'Pickup' : 'To be confirmed'

const renderQuotedItems = (quote: AdminQuoteRequest): string => `
  <table role="presentation" class="email-table" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:24px 0;border-collapse:collapse;color:#173b2b;font-size:14px;">
    <thead>
      <tr style="border-bottom:2px solid #dfe7dc;">
        <th align="left" style="padding:0 0 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#66756b;">Product</th>
        <th align="center" style="padding:0 8px 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#66756b;">Qty</th>
        <th align="right" style="padding:0 0 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#66756b;">Quoted price</th>
      </tr>
    </thead>
    <tbody>
      ${quote.items.map((item) => {
        const unitPrice = item.quotedUnitPrice ?? '0'
        const subtotal = (Number(unitPrice) * item.quantity).toFixed(2)
        return `
        <tr style="border-bottom:1px solid #edf1eb;">
          <td style="padding:13px 0;line-height:1.45;">${escapeHtml(item.productName)}${item.productOptionLabel ? `<br><span style="color:#66756b;font-size:12px;">${escapeHtml(item.productOptionLabel)}</span>` : ''}<br><span style="color:#66756b;font-size:12px;">${escapeHtml(formatPrice(unitPrice))} each</span></td>
          <td align="center" style="padding:13px 8px;color:#58695e;">${item.quantity}</td>
          <td align="right" style="padding:13px 0;font-weight:bold;white-space:nowrap;">${escapeHtml(formatPrice(subtotal))}</td>
        </tr>
      `}).join('')}
    </tbody>
  </table>
`

const renderQuotedTotals = (quote: AdminQuoteRequest): string => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #dfe7dc;color:#58695e;font-size:14px;">
    <tr><td style="padding:11px 0 0;">Quoted subtotal</td><td align="right" style="padding:11px 0 0;color:#173b2b;font-weight:bold;">${escapeHtml(formatPrice(quote.quotedSubtotal ?? '0'))}</td></tr>
    <tr><td style="padding:8px 0;">Delivery fee</td><td align="right" style="padding:8px 0;color:#173b2b;font-weight:bold;">${escapeHtml(formatPrice(quote.deliveryFee ?? '0'))}</td></tr>
    <tr><td style="padding:14px 0 0;color:#173b2b;font-size:17px;font-weight:bold;">Total</td><td align="right" style="padding:14px 0 0;color:#173b2b;font-size:17px;font-weight:bold;">${escapeHtml(formatPrice(quote.quotedTotal ?? '0'))}</td></tr>
  </table>
`

/**
 * "Quotation ready" email sent to the customer once an admin has prepared a
 * quotation. It only ever surfaces fields the customer is allowed to see;
 * admin notes and internal pricing rationale are never included.
 */
export const quoteReadyMessage = (quote: AdminQuoteRequest): EmailMessage => {
  const quoteLink = getAppLink(`/quotes/${encodeURIComponent(quote.quoteNumber)}`)
  return {
    to: quote.customerEmail,
    subject: `Your quotation is ready — ${quote.quoteNumber}`,
    html: renderBrandedEmail({
      title: 'Your quotation is ready',
      preheader: `Quotation ${quote.quoteNumber} is ready for your review.`,
      intro: `Hi ${escapeHtml(quote.customerName)}, your quotation ${escapeHtml(quote.quoteNumber)} is ready for review. The prices below are locked for your next step.`,
      contentHtml: `
        ${renderQuotedItems(quote)}
        ${renderQuotedTotals(quote)}
        <p style="margin:18px 0 0;color:#66756b;font-size:13px;">Fulfilment: <strong style="color:#173b2b;">${escapeHtml(formatFulfillment(quote.fulfillmentMethod))}</strong></p>
        ${quoteLink ? `<p style="margin:28px 0 0;text-align:center;"><a href="${escapeHtml(quoteLink)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#285b37;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Review your quotation</a></p>` : ''}
      `,
      footerNote: 'Accept your quotation to continue and convert it into an order.',
    }),
    text: [
      'Ayanfe Food Variety quotation',
      `Hi ${quote.customerName},`,
      `Quotation: ${quote.quoteNumber}`,
      `Status: Ready for your review`,
      ...quote.items.map((item) => `${item.productName}${item.productOptionLabel ? ` (${item.productOptionLabel})` : ''} — ${item.quantity} × ${formatPrice(item.quotedUnitPrice ?? '0')}`),
      `Quoted subtotal: ${formatPrice(quote.quotedSubtotal ?? '0')}`,
      `Delivery fee: ${formatPrice(quote.deliveryFee ?? '0')}`,
      `Total: ${formatPrice(quote.quotedTotal ?? '0')}`,
      `Fulfilment: ${formatFulfillment(quote.fulfillmentMethod)}`,
      quoteLink ? `Review it here: ${quoteLink}` : '',
    ].filter(Boolean).join('\n'),
  }
}

/**
 * Sends the customer notification after a quotation has been prepared. Email
 * failures are logged and never bubble up to the caller, so a notification
 * problem can never roll back a completed quotation.
 */
export async function notifyQuoteReady(quote: AdminQuoteRequest): Promise<void> {
  try {
    await sendEmail(quoteReadyMessage(quote))
  } catch (error: unknown) {
    console.error(JSON.stringify({
      event: 'quote_email_failed',
      audience: 'customer',
      quoteNumber: quote.quoteNumber,
      reason: error instanceof Error ? error.message : 'UnknownError',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
  }
}