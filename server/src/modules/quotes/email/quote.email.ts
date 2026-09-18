import type { AdminQuoteRequest, QuoteRequestItemResponse, QuoteRequestResponse } from '../quote.types.js'
import { formatPrice } from '../../orders/order.email.js'
import {
  escapeHtml,
  getAppLink,
  renderBrandedEmail,
  sendEmail,
  type EmailMessage,
} from '../../../services/email/email.service.js'

// Structural subset shared by the admin and customer quote serializers; every
// email helper reads only the fields the customer is allowed to see.
type QuoteEmailData = {
  customerEmail: string
  customerName: string
  quoteNumber: string
  fulfillmentMethod: AdminQuoteRequest['fulfillmentMethod']
  deliveryFeeMode: AdminQuoteRequest['deliveryFeeMode']
  deliveryAreaName: string | null
  deliveryMinDays: number | null
  deliveryMaxDays: number | null
  quotedSubtotal: string | null
  deliveryFee: string | null
  quotedTotal: string | null
  items: QuoteRequestItemResponse[]
}

const formatFulfillment = (method: QuoteEmailData['fulfillmentMethod']): string =>
  method === 'DELIVERY' ? 'Delivery' : method === 'PICKUP' ? 'Pickup' : 'To be confirmed'

const formatDayRange = (minDays: number | null, maxDays: number | null): string | null => {
  if (minDays === null && maxDays === null) return null
  const lower = minDays ?? maxDays
  const upper = maxDays ?? minDays
  if (lower === upper) return `${lower} day${lower === 1 ? '' : 's'}`
  return `${lower}–${upper} days`
}

const formatFeeLabel = (quote: QuoteEmailData): string => {
  if (quote.fulfillmentMethod === 'PICKUP') return 'Pickup — no delivery fee'
  if (quote.deliveryFeeMode === 'FREE') return 'Free delivery'
  if (quote.deliveryFeeMode === 'CUSTOM') return 'Delivery fee (fixed)'
  if (quote.deliveryFeeMode === 'ZONE') {
    return quote.deliveryAreaName
      ? `Delivery fee (from ${quote.deliveryAreaName})`
      : 'Delivery fee (from your delivery zone)'
  }
  return 'Delivery fee'
}

const renderQuotedItems = (quote: QuoteEmailData): string => `
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

const renderQuotedTotals = (quote: QuoteEmailData): string => {
  const dayRange = formatDayRange(quote.deliveryMinDays, quote.deliveryMaxDays)
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #dfe7dc;color:#58695e;font-size:14px;">
    <tr><td style="padding:11px 0 0;">Quoted subtotal</td><td align="right" style="padding:11px 0 0;color:#173b2b;font-weight:bold;">${escapeHtml(formatPrice(quote.quotedSubtotal ?? '0'))}</td></tr>
    <tr><td style="padding:8px 0;">${escapeHtml(formatFeeLabel(quote))}</td><td align="right" style="padding:8px 0;color:#173b2b;font-weight:bold;">${escapeHtml(formatPrice(quote.deliveryFee ?? '0'))}</td></tr>
    ${dayRange ? `<tr><td style="padding:8px 0;">Estimated delivery</td><td align="right" style="padding:8px 0;color:#173b2b;font-weight:bold;">${escapeHtml(dayRange)}</td></tr>` : ''}
    <tr><td style="padding:14px 0 0;color:#173b2b;font-size:17px;font-weight:bold;">Total</td><td align="right" style="padding:14px 0 0;color:#173b2b;font-size:17px;font-weight:bold;">${escapeHtml(formatPrice(quote.quotedTotal ?? '0'))}</td></tr>
  </table>
`
}

/**
 * "Quotation ready" email sent to the customer once an admin has prepared a
 * quotation. It only ever surfaces fields the customer is allowed to see;
 * admin notes and internal pricing rationale are never included.
 */
export const quoteReadyMessage = (quote: AdminQuoteRequest): EmailMessage => {
  const quoteLink = getAppLink(`/quotes/${encodeURIComponent(quote.quoteNumber)}`)
  const dayRange = formatDayRange(quote.deliveryMinDays, quote.deliveryMaxDays)
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
        <p style="margin:18px 0 0;color:#66756b;font-size:13px;">Fulfilment: <strong style="color:#173b2b;">${escapeHtml(formatFulfillment(quote.fulfillmentMethod))}</strong>${dayRange ? ` · Estimated delivery <strong style="color:#173b2b;">${escapeHtml(dayRange)}</strong>` : ''}</p>
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
      `${formatFeeLabel(quote)}: ${formatPrice(quote.deliveryFee ?? '0')}`,
      ...(dayRange ? [`Estimated delivery: ${dayRange}`] : []),
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

/**
 * "Quotation accepted" email sent to the customer right after they accept a
 * prepared quotation. Reminds them of the quoted terms and the next step
 * (placing the order), and only surfaces customer-visible fields.
 */
export const quoteAcceptedMessage = (quote: QuoteRequestResponse): EmailMessage => {
  const quoteLink = getAppLink(`/quotes/${encodeURIComponent(quote.quoteNumber)}`)
  const dayRange = formatDayRange(quote.deliveryMinDays, quote.deliveryMaxDays)
  return {
    to: quote.customerEmail,
    subject: `Quotation accepted — ${quote.quoteNumber}`,
    html: renderBrandedEmail({
      title: 'Quotation accepted',
      preheader: `You've accepted quotation ${quote.quoteNumber}.`,
      intro: `Hi ${escapeHtml(quote.customerName)}, you've accepted quotation ${escapeHtml(quote.quoteNumber)}. The quoted prices below are locked in for you.`,
      contentHtml: `
        ${renderQuotedItems(quote)}
        ${renderQuotedTotals(quote)}
        <p style="margin:18px 0 0;color:#66756b;font-size:13px;">Fulfilment: <strong style="color:#173b2b;">${escapeHtml(formatFulfillment(quote.fulfillmentMethod))}</strong>${dayRange ? ` · Estimated delivery <strong style="color:#173b2b;">${escapeHtml(dayRange)}</strong>` : ''}</p>
        ${quoteLink ? `<p style="margin:28px 0 0;text-align:center;"><a href="${escapeHtml(quoteLink)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#285b37;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Place your order</a></p>` : ''}
      `,
      footerNote: 'Place your order to convert this quotation into an order.',
    }),
    text: [
      'Ayanfe Food Variety quotation accepted',
      `Hi ${quote.customerName},`,
      `Quotation: ${quote.quoteNumber}`,
      `Status: Accepted`,
      ...quote.items.map((item) => `${item.productName}${item.productOptionLabel ? ` (${item.productOptionLabel})` : ''} — ${item.quantity} × ${formatPrice(item.quotedUnitPrice ?? '0')}`),
      `Quoted subtotal: ${formatPrice(quote.quotedSubtotal ?? '0')}`,
      `${formatFeeLabel(quote)}: ${formatPrice(quote.deliveryFee ?? '0')}`,
      ...(dayRange ? [`Estimated delivery: ${dayRange}`] : []),
      `Total: ${formatPrice(quote.quotedTotal ?? '0')}`,
      `Fulfilment: ${formatFulfillment(quote.fulfillmentMethod)}`,
      `Next step: place your order to convert this quotation into an order.`,
      quoteLink ? `Place your order here: ${quoteLink}` : '',
    ].filter(Boolean).join('\n'),
  }
}

/**
 * Sends the acceptance confirmation. Failures are logged and never roll back
 * the acceptance.
 */
export async function notifyQuoteAccepted(quote: QuoteRequestResponse): Promise<void> {
  try {
    await sendEmail(quoteAcceptedMessage(quote))
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