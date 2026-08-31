import { AdminNotificationType, FulfillmentMethod, UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import {
  acceptQuoteRequest,
  createQuoteRequest,
  prepareQuotePricing,
  rejectQuoteRequest,
} from '../src/modules/quotes/quote.service.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'
import type { AuthenticatedUser } from '../src/modules/auth/auth.types.js'

const slug = `quote-notify-smoke-${Date.now().toString(36)}`

const findNotifications = (quoteNumbers: string[], types: AdminNotificationType[]) =>
  prisma.adminNotification.findMany({
    where: { type: { in: types }, href: { in: quoteNumbers.map((n) => `/admin/quote-requests/${n}`) } },
    select: { type: true, eventKey: true, title: true, message: true, href: true },
    orderBy: { createdAt: 'asc' },
  })

async function main() {
  let productId = ''
  const quoteNumbers: string[] = []

  const createUser = async (name: string, email: string, verified: boolean): Promise<AuthenticatedUser> => {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword('smoke-password-123'), role: UserRole.CUSTOMER, emailVerified: verified },
    })
    return { id: user.id, name: user.name, email: user.email, phone: null, role: user.role, shoppingMode: 'RETAIL' }
  }

  const createQuote = async (user: AuthenticatedUser) => {
    const result = await createQuoteRequest(user, {
      requestKey: `${slug}-key-${quoteNumbers.length}`,
      customerName: `Notification Customer ${quoteNumbers.length}`,
      customerEmail: `${slug}-${quoteNumbers.length}@smoke.local`,
      customerPhone: '+2348091110001',
      message: 'Notify me about this.',
      items: [{ productId, productOptionId: null, quantity: 2 }],
    })
    quoteNumbers.push(result.quoteRequest.quoteNumber)
    return result
  }

  const priceQuote = async (reference: string, unitPrice: string) => {
    const { items } = await prisma.quoteRequest.findUniqueOrThrow({
      where: { quoteNumber: reference },
      include: { items: { select: { id: true } } },
    })
    await prepareQuotePricing(reference, {
      items: items.map((item) => ({ itemId: item.id, quotedUnitPrice: unitPrice })),
      deliveryFee: '0.00',
      fulfillmentMethod: FulfillmentMethod.PICKUP,
    })
  }

  try {
    const category = await prisma.category.create({
      data: { name: `Smoke Notification Category ${slug}`, slug: `smoke-notification-category-${slug}` },
    })
    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        name: 'Notification Product',
        slug: `smoke-notification-product-${slug}`,
        description: 'Smoke fixture',
        price: 1000,
        deliveryFee: 0,
        stockQuantity: 50,
        unit: 'bag',
        image: '',
      },
    })
    productId = product.id

    const userA = await createUser('Notification Customer A', `${slug}-a@smoke.local`, true)
    const userB = await createUser('Notification Customer B', `${slug}-b@smoke.local`, true)

    // --- 1. New quote request → exactly one NEW_QUOTE_REQUEST admin notification ---
    const created = await createQuote(userA)
    if (!created.created) throw new Error('Initial quote submission was not recorded as created.')
    let notifications = await findNotifications(quoteNumbers, [AdminNotificationType.NEW_QUOTE_REQUEST])
    if (notifications.length !== 1) throw new Error(`Expected 1 NEW_QUOTE_REQUEST notification, got ${notifications.length}.`)
    const newQuoteNotification = notifications[0]
    if (newQuoteNotification.title !== 'New quote request received') throw new Error('Unexpected NEW_QUOTE_REQUEST title.')
    if (!newQuoteNotification.message.includes(created.quoteRequest.customerName)) throw new Error('NEW_QUOTE_REQUEST omits the customer name.')
    if (newQuoteNotification.href !== `/admin/quote-requests/${created.quoteRequest.quoteNumber}`) {
      throw new Error(`NEW_QUOTE_REQUEST href points at ${newQuoteNotification.href}.`)
    }

    // --- 2. Retrying the same submission (same request key) creates no duplicate notification ---
    const retried = await createQuoteRequest(userA, {
      requestKey: `${slug}-key-0`,
      customerName: 'Notification Customer 0',
      customerEmail: `${slug}-0@smoke.local`,
      customerPhone: '+2348091110001',
      message: 'Notify me about this.',
      items: [{ productId, productOptionId: null, quantity: 2 }],
    })
    if (retried.created) throw new Error('A retried quote submission was recorded as a new request.')
    notifications = await findNotifications(quoteNumbers, [AdminNotificationType.NEW_QUOTE_REQUEST])
    if (notifications.length !== 1) throw new Error('Repeated quote submission created a duplicate notification.')

    // --- 3. Pricing the quotation (QUOTED) then accepting → QUOTE_ACCEPTED notification ---
    await priceQuote(created.quoteRequest.quoteNumber, '500.00')
    const priced = await prisma.quoteRequest.findUniqueOrThrow({ where: { quoteNumber: created.quoteRequest.quoteNumber } })
    if (priced.status !== 'QUOTED' || priced.quotedTotal === null) throw new Error('Quotation was not prepared.')

    await acceptQuoteRequest(created.quoteRequest.quoteNumber, userA.id)
    notifications = await findNotifications(quoteNumbers, [AdminNotificationType.QUOTE_ACCEPTED])
    if (notifications.length !== 1) throw new Error(`Expected 1 QUOTE_ACCEPTED notification, got ${notifications.length}.`)
    const acceptedNotification = notifications[0]
    if (acceptedNotification.title !== 'Quotation accepted') throw new Error('Unexpected QUOTE_ACCEPTED title.')
    if (!acceptedNotification.message.includes(created.quoteRequest.quoteNumber)) throw new Error('QUOTE_ACCEPTED omits the quote reference.')
    if (acceptedNotification.href !== `/admin/quote-requests/${created.quoteRequest.quoteNumber}`) {
      throw new Error(`QUOTE_ACCEPTED href points at ${acceptedNotification.href}.`)
    }

    // --- 4. Accepting again is idempotent and does not duplicate the notification ---
    await acceptQuoteRequest(created.quoteRequest.quoteNumber, userA.id)
    notifications = await findNotifications(quoteNumbers, [AdminNotificationType.QUOTE_ACCEPTED])
    if (notifications.length !== 1) throw new Error('Repeated acceptance created a duplicate notification.')

    // --- 5. Declining a quotation → QUOTE_REJECTED notification with the customer reason ---
    const toReject = await createQuote(userA)
    await priceQuote(toReject.quoteRequest.quoteNumber, '750.00')
    await rejectQuoteRequest(toReject.quoteRequest.quoteNumber, userA.id, { reason: 'Too expensive for now' })
    notifications = await findNotifications(quoteNumbers, [AdminNotificationType.QUOTE_REJECTED])
    if (notifications.length !== 1) throw new Error(`Expected 1 QUOTE_REJECTED notification, got ${notifications.length}.`)
    const rejectedNotification = notifications[0]
    if (rejectedNotification.title !== 'Quotation declined by customer') throw new Error('Unexpected QUOTE_REJECTED title.')
    if (!rejectedNotification.message.includes('Too expensive for now')) throw new Error('QUOTE_REJECTED omits the customer reason.')
    if (rejectedNotification.href !== `/admin/quote-requests/${toReject.quoteRequest.quoteNumber}`) {
      throw new Error(`QUOTE_REJECTED href points at ${rejectedNotification.href}.`)
    }

    // --- 6. Rejecting again is idempotent and does not duplicate the notification ---
    await rejectQuoteRequest(toReject.quoteRequest.quoteNumber, userA.id, { reason: 'Too expensive for now' })
    notifications = await findNotifications(quoteNumbers, [AdminNotificationType.QUOTE_REJECTED])
    if (notifications.length !== 1) throw new Error('Repeated rejection created a duplicate notification.')

    // --- 7. A different customer's request produces its own notification ---
    await createQuote(userB)
    notifications = await findNotifications(quoteNumbers, [AdminNotificationType.NEW_QUOTE_REQUEST])
    if (notifications.length !== 3) throw new Error('Expected a NEW_QUOTE_REQUEST notification per submission.')

    // --- 8. Notifications link to the admin quote detail pages they describe ---
    for (const notification of notifications) {
      if (!/^\/admin\/quote-requests\/QR-\d{4}-\d{6}$/.test(notification.href)) {
        throw new Error(`Notification href is not a valid admin quote detail link: ${notification.href}`)
      }
    }

    console.log('Quote notification smoke test passed.')
  } finally {
    await prisma.adminNotification.deleteMany({
      where: { href: { in: quoteNumbers.map((n) => `/admin/quote-requests/${n}`) } },
    })
    await prisma.quoteRequest.deleteMany({ where: { customerPhone: '+2348091110001' } })
    await prisma.user.deleteMany({ where: { email: { contains: slug } } })
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'smoke-notification-product-' } } })
    await prisma.category.deleteMany({ where: { slug: { startsWith: 'smoke-notification-category-' } } })
  }
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })