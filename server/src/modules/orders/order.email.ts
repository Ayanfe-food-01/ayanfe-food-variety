import { env } from '../../config/env.js'
import type { OrderStatus } from '@prisma/client'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] ?? character)

export async function notifyOrderCreated(order: {
  orderNumber: string
  customerName: string
  customerEmail: string | null
  total: string
  items: Array<{ name: string; quantity: number; subtotal: string }>
  bank: { bankName: string; accountName: string; accountNumber: string; instructions: string } | null
}): Promise<void> {
  if (!order.customerEmail || !env.email.resendApiKey || !env.email.from) {
    if (!env.email.resendApiKey || !env.email.from) console.warn('Order confirmation email skipped: Resend is not configured.')
    return
  }

  const items = order.items
    .map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity} — ₦${escapeHtml(item.subtotal)}</li>`)
    .join('')
  const bank = order.bank
    ? `<p><strong>Bank:</strong> ${escapeHtml(order.bank.bankName)}<br>
       <strong>Account name:</strong> ${escapeHtml(order.bank.accountName)}<br>
       <strong>Account number:</strong> ${escapeHtml(order.bank.accountNumber)}</p>
       <p>${escapeHtml(order.bank.instructions)}</p>`
    : '<p>Payment instructions will be provided by the store.</p>'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.email.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.email.from,
      to: [order.customerEmail],
      subject: `Order received — ${order.orderNumber}`,
      html: `<p>Hi ${escapeHtml(order.customerName)},</p>
        <p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been placed successfully.</p>
        <ul>${items}</ul>
        <p><strong>Total:</strong> ₦${escapeHtml(order.total)}<br>
        <strong>Payment status:</strong> Pending</p>
        ${bank}
        <p>Payment is not confirmed until your transfer is reviewed by the store.</p>`,
    }),
  })
  if (!response.ok) console.error('Order confirmation email provider returned an error', response.status)
}

export async function notifyOrderStatusChanged(order: {
  orderNumber: string
  customerName: string
  customerEmail: string | null
  orderStatus: OrderStatus
}): Promise<void> {
  if (!order.customerEmail) return
  if (!env.email.resendApiKey || !env.email.from) {
    console.warn('Order status email skipped: Resend is not configured.')
    return
  }

  const statusCopy: Record<OrderStatus, string> = {
    ORDER_PLACED: 'Your order has been placed and is awaiting payment verification.',
    PROCESSING: 'Your order is now being prepared.',
    OUT_FOR_DELIVERY: 'Your order is out for delivery.',
    DELIVERED: 'Your order has been delivered.',
    CANCELLED: 'Your order has been cancelled.',
  }
  const orderLink = env.publicAppUrl
    ? `<p><a href="${escapeHtml(`${env.publicAppUrl.replace(/\/+$/, '')}/orders/${encodeURIComponent(order.orderNumber)}`)}">View your order</a></p>`
    : ''
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.email.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.email.from,
      to: [order.customerEmail],
      subject: `Order update — ${order.orderNumber}`,
      html: `<p>Hi ${escapeHtml(order.customerName)},</p>
        <p>${escapeHtml(statusCopy[order.orderStatus])}</p>
        <p>Order: <strong>${escapeHtml(order.orderNumber)}</strong></p>
        ${orderLink}`,
    }),
  })
  if (!response.ok) console.error('Order status email provider returned an error', response.status)
}