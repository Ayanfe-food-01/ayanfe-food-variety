import { env } from '../../config/env.js';
import { escapeHtml, getAppLink, renderBrandedEmail, sendEmail, } from '../../lib/email/email.service.js';
export const formatPrice = (value) => new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
}).format(Number(value));
const formatPaymentMethod = (method) => method === 'BANK_TRANSFER' ? 'Bank transfer' : method;
const formatFulfillmentMethod = (method) => method === 'PICKUP' ? 'Pickup' : 'Delivery';
const formatStatus = (status) => status
    .split('_')
    .map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`)
    .join(' ');
const formatDateTime = (value) => new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
}).format(new Date(value));
const renderOrderItems = (items) => `
  <table role="presentation" class="email-table" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:24px 0;border-collapse:collapse;color:#173b2b;font-size:14px;">
    <thead>
      <tr style="border-bottom:2px solid #dfe7dc;">
        <th align="left" style="padding:0 0 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#66756b;">Product</th>
        <th align="center" style="padding:0 8px 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#66756b;">Qty</th>
        <th align="right" style="padding:0 0 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#66756b;">Price</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item) => `
        <tr style="border-bottom:1px solid #edf1eb;">
          <td style="padding:13px 0;line-height:1.45;">${escapeHtml(item.name)}${item.optionLabel ? `<br><span style="color:#66756b;font-size:12px;">${escapeHtml(item.optionLabel)}</span>` : ''}<br><span style="color:#66756b;font-size:12px;">${escapeHtml(formatPrice(item.unitPrice))} each</span></td>
          <td align="center" style="padding:13px 8px;color:#58695e;">${item.quantity}</td>
          <td align="right" style="padding:13px 0;font-weight:bold;white-space:nowrap;">${escapeHtml(formatPrice(item.subtotal))}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;
const renderTotals = (order) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #dfe7dc;color:#58695e;font-size:14px;">
    <tr><td style="padding:11px 0 0;">Subtotal</td><td align="right" style="padding:11px 0 0;color:#173b2b;font-weight:bold;">${escapeHtml(formatPrice(order.subtotal))}</td></tr>
    <tr><td style="padding:8px 0;">Delivery fee</td><td align="right" style="padding:8px 0;color:#173b2b;font-weight:bold;">${escapeHtml(formatPrice(order.deliveryFee))}</td></tr>
    <tr><td style="padding:14px 0 0;color:#173b2b;font-size:17px;font-weight:bold;">Total</td><td align="right" style="padding:14px 0 0;color:#173b2b;font-size:17px;font-weight:bold;">${escapeHtml(formatPrice(order.total))}</td></tr>
  </table>
`;
const renderOrderDetails = (order, includeCustomerEmail) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:20px 0;background:#f5f7f1;border-radius:14px;color:#58695e;font-size:13px;">
    <tr><td style="padding:14px 16px 5px;">Order number</td><td align="right" style="padding:14px 16px 5px;color:#173b2b;font-weight:bold;">${escapeHtml(order.orderNumber)}</td></tr>
    ${includeCustomerEmail && order.customerEmail ? `<tr><td style="padding:5px 16px;">Customer email</td><td align="right" style="padding:5px 16px;color:#173b2b;">${escapeHtml(order.customerEmail)}</td></tr>` : ''}
    <tr><td style="padding:5px 16px;">Payment method</td><td align="right" style="padding:5px 16px;color:#173b2b;font-weight:bold;">${escapeHtml(formatPaymentMethod(order.paymentMethod))}</td></tr>
    <tr><td style="padding:5px 16px;">Fulfillment</td><td align="right" style="padding:5px 16px;color:#173b2b;font-weight:bold;">${escapeHtml(formatFulfillmentMethod(order.fulfillmentMethod))}</td></tr>
    <tr><td style="padding:5px 16px;">Payment status</td><td align="right" style="padding:5px 16px;color:#173b2b;">${escapeHtml(formatStatus(order.paymentStatus))}</td></tr>
    <tr><td style="padding:5px 16px 14px;">Order status</td><td align="right" style="padding:5px 16px 14px;color:#173b2b;">${escapeHtml(formatStatus(order.orderStatus))}</td></tr>
  </table>
`;
const renderDeliveryDetails = (order, includePhone) => order.fulfillmentMethod === 'PICKUP'
    ? `
  <div style="margin-top:24px;padding-top:22px;border-top:1px solid #dfe7dc;">
    <h2 style="margin:0 0 12px;color:#173b2b;font-size:18px;">Pickup details</h2>
    <p style="margin:0;color:#58695e;font-size:14px;line-height:1.75;">
      <strong style="color:#173b2b;">Pickup order</strong><br>
      ${escapeHtml(order.customerName)}${includePhone ? `<br>${escapeHtml(order.phone)}` : ''}<br>
      The customer will collect this order from the store.
    </p>
  </div>
`
    : `
  <div style="margin-top:24px;padding-top:22px;border-top:1px solid #dfe7dc;">
    <h2 style="margin:0 0 12px;color:#173b2b;font-size:18px;">Delivery details</h2>
    <p style="margin:0;color:#58695e;font-size:14px;line-height:1.75;">
      <strong style="color:#173b2b;">${escapeHtml(order.customerName)}</strong><br>
      ${includePhone ? `${escapeHtml(order.phone)}<br>` : ''}
      ${escapeHtml(order.deliveryAddress)}, ${escapeHtml(order.city)}
      ${order.note ? `<br><span style="color:#66756b;">Instructions: ${escapeHtml(order.note)}</span>` : ''}
    </p>
  </div>
`;
const customerOrderMessage = (order) => {
    const orderLink = getAppLink(`/orders/${encodeURIComponent(order.orderNumber)}`);
    return {
        to: order.customerEmail,
        subject: `Order confirmation — ${order.orderNumber}`,
        html: renderBrandedEmail({
            title: 'Order received',
            preheader: `Your order ${order.orderNumber} has been placed successfully.`,
            intro: `Hi ${escapeHtml(order.customerName)}, your order has been placed successfully. We will keep you updated as it moves through fulfilment.`,
            contentHtml: `
        ${renderOrderDetails(order, false)}
        ${renderOrderItems(order.items)}
        ${renderTotals(order)}
        ${renderDeliveryDetails(order, true)}
        ${orderLink ? `<p style="margin:28px 0 0;text-align:center;"><a href="${escapeHtml(orderLink)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#285b37;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">View your order</a></p>` : ''}
      `,
            footerNote: 'Payment remains pending until your transfer is reviewed by the store.',
        }),
        text: [
            'Ayanfe Food Variety order confirmation',
            `Hi ${order.customerName},`,
            `Order: ${order.orderNumber}`,
            ...order.items.map((item) => `${item.name}${item.optionLabel ? ` (${item.optionLabel})` : ''} — ${item.quantity} × ${formatPrice(item.unitPrice)} = ${formatPrice(item.subtotal)}`),
            `Subtotal: ${formatPrice(order.subtotal)}`,
            `Delivery fee: ${formatPrice(order.deliveryFee)}`,
            `Total: ${formatPrice(order.total)}`,
            `Payment method: ${formatPaymentMethod(order.paymentMethod)}`,
            `Order status: ${formatStatus(order.orderStatus)}`,
            `Fulfillment: ${formatFulfillmentMethod(order.fulfillmentMethod)}`,
            ...(order.fulfillmentMethod === 'DELIVERY' ? [`Delivery: ${order.deliveryAddress}, ${order.city}`] : ['Pickup: customer will collect the order']),
        ].join('\n'),
    };
};
const adminOrderMessage = (order) => {
    const orderLink = getAppLink(`/admin/orders/${encodeURIComponent(order.orderNumber)}`);
    return {
        to: env.email.businessEmail,
        subject: `New Order Received — ${order.orderNumber}`,
        html: renderBrandedEmail({
            title: 'New Order Received',
            preheader: `Order ${order.orderNumber} from ${order.customerName}`,
            intro: `A new order was created at ${escapeHtml(formatDateTime(order.createdAt))}. Review the order details below.`,
            contentHtml: `
        ${renderOrderDetails(order, true)}
        ${renderOrderItems(order.items)}
        ${renderTotals(order)}
        ${renderDeliveryDetails(order, true)}
        <p style="margin:24px 0 0;color:#58695e;font-size:13px;line-height:1.7;">Customer phone: <strong style="color:#173b2b;">${escapeHtml(order.phone)}</strong></p>
        ${orderLink ? `<p style="margin:28px 0 0;text-align:center;"><a href="${escapeHtml(orderLink)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#285b37;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">Open in Admin Portal</a></p>` : ''}
      `,
            footerNote: `Order created ${formatDateTime(order.createdAt)}.`,
        }),
        text: [
            'New Order Received',
            `Order: ${order.orderNumber}`,
            `Customer: ${order.customerName}`,
            `Email: ${order.customerEmail ?? 'Not provided'}`,
            `Phone: ${order.phone}`,
            ...order.items.map((item) => `${item.name}${item.optionLabel ? ` (${item.optionLabel})` : ''} — ${item.quantity} × ${formatPrice(item.unitPrice)} = ${formatPrice(item.subtotal)}`),
            `Total: ${formatPrice(order.total)}`,
            `Payment method: ${formatPaymentMethod(order.paymentMethod)}`,
            `Payment status: ${formatStatus(order.paymentStatus)}`,
            `Fulfillment: ${formatFulfillmentMethod(order.fulfillmentMethod)}`,
            ...(order.fulfillmentMethod === 'DELIVERY' ? [`Delivery: ${order.deliveryAddress}, ${order.city}`] : ['Pickup: customer will collect the order']),
            `Created: ${formatDateTime(order.createdAt)}`,
        ].join('\n'),
    };
};
async function sendOrderMessage(message, audience, orderNumber) {
    try {
        await sendEmail(message);
    }
    catch (error) {
        console.error(JSON.stringify({
            event: 'order_email_failed',
            audience,
            orderNumber,
            reason: error instanceof Error ? error.message : 'UnknownError',
            errorName: error instanceof Error ? error.name : 'UnknownError',
        }));
    }
}
export async function notifyOrderCreated(order) {
    const messages = [];
    if (order.customerEmail) {
        messages.push(sendOrderMessage(customerOrderMessage(order), 'customer', order.orderNumber));
    }
    else {
        console.warn(JSON.stringify({
            event: 'order_email_skipped',
            audience: 'customer',
            orderNumber: order.orderNumber,
            reason: 'missing_customer_email',
        }));
    }
    if (env.email.businessEmail) {
        messages.push(sendOrderMessage(adminOrderMessage(order), 'business', order.orderNumber));
    }
    else {
        console.warn(JSON.stringify({
            event: 'order_email_skipped',
            audience: 'business',
            orderNumber: order.orderNumber,
            reason: 'BUSINESS_EMAIL_not_configured',
        }));
    }
    await Promise.all(messages);
}
export async function notifyOrderStatusChanged(order) {
    if (!order.customerEmail)
        return;
    const statusCopy = {
        ORDER_PLACED: 'Your order has been placed and is awaiting payment verification.',
        PROCESSING: 'Your order is now being prepared.',
        OUT_FOR_DELIVERY: 'Your order is out for delivery.',
        DELIVERED: 'Your order has been delivered.',
        CANCELLED: 'Your order has been cancelled.',
    };
    const orderLink = getAppLink(`/orders/${encodeURIComponent(order.orderNumber)}`);
    await sendEmail({
        to: order.customerEmail,
        subject: `Order update — ${order.orderNumber}`,
        html: renderBrandedEmail({
            title: 'Order update',
            preheader: `An update is available for order ${order.orderNumber}.`,
            intro: `Hi ${escapeHtml(order.customerName)}, ${escapeHtml(statusCopy[order.orderStatus])}`,
            contentHtml: `
        <div style="padding:16px;border-radius:14px;background:#f5f7f1;">
          <p style="margin:0;color:#66756b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Order number</p>
          <p style="margin:6px 0 0;color:#173b2b;font-size:20px;font-weight:bold;">${escapeHtml(order.orderNumber)}</p>
        </div>
        ${orderLink ? `<p style="margin:26px 0 0;text-align:center;"><a href="${escapeHtml(orderLink)}" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#285b37;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">View your order</a></p>` : ''}
      `,
        }),
        text: `Ayanfe Food Variety order update\n\nHi ${order.customerName}, ${statusCopy[order.orderStatus]}\n\nOrder: ${order.orderNumber}`,
    });
}
