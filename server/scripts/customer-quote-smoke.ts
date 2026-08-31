import { QuoteRequestStatus, UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import {
  acceptQuoteRequest,
  getAdminQuoteRequest,
  getCustomerQuoteRequest,
  listCustomerQuoteRequests,
  rejectQuoteRequest,
  createQuoteRequest,
  prepareQuotePricing,
} from '../src/modules/quotes/quote.service.js'
import { hashPassword, loginCustomer } from '../src/modules/auth/auth.service.js'
import type { AuthenticatedUser } from '../src/modules/auth/auth.types.js'
import { HttpError } from '../src/utils/http.js'

const slug = `quote-customer-smoke-${Date.now().toString(36)}`
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:8000'

const expectHttpError = async (operation: Promise<unknown>, expectedStatus: number): Promise<void> => {
  try {
    await operation
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === expectedStatus) return
    throw error
  }
  throw new Error(`Expected HTTP ${expectedStatus} error.`)
}

const expectNotFound = (operation: Promise<unknown>): Promise<void> => expectHttpError(operation, 404)
const expectConflict = (operation: Promise<unknown>): Promise<void> => expectHttpError(operation, 409)

const moneyEquals = (serialized: string | null, expected: number): boolean => {
  if (serialized === null) return false
  return Math.abs(Number(serialized) - expected) < 0.001
}

const QUOTED = QuoteRequestStatus.QUOTED
const PENDING = QuoteRequestStatus.PENDING
const ACCEPTED = QuoteRequestStatus.ACCEPTED
const CANCELLED = QuoteRequestStatus.CANCELLED

async function main() {
  let categoryId = ''
  let productId = ''
  const customerEmailA = `${slug}-a@smoke.local`
  const customerEmailB = `${slug}-b@smoke.local`
  const quoteNumbers: string[] = []

  const createFixtureQuote = async (userId: string, quantity: number): Promise<string> => {
    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        quoteNumber: `QR-2098-${String(100000 + quoteNumbers.length)}`,
        requestKey: `${slug}-key-${quoteNumbers.length}`,
        userId,
        customerName: `Customer ${quoteNumbers.length}`,
        customerEmail: `${slug}-${quoteNumbers.length}@smoke.local`,
        customerPhone: '+2348099990000',
        message: 'Please price this for me.',
        shoppingMode: 'RETAIL',
        status: PENDING,
        items: {
          create: [{ productId, productName: 'Smoke Product', productOptionId: null, productOptionLabel: null, quantity, note: null }],
        },
      },
    })
    quoteNumbers.push(quoteRequest.quoteNumber)
    return quoteRequest.quoteNumber
  }

  const quoteFor = async (reference: string) => (await prisma.quoteRequest.findUniqueOrThrow({ where: { quoteNumber: reference } }))

  try {
    const category = await prisma.category.create({
      data: { name: `Smoke Category ${slug}`, slug: `smoke-category-${slug}` },
    })
    categoryId = category.id
    const product = await prisma.product.create({
      data: {
        categoryId,
        name: 'Smoke Product',
        slug: `smoke-product-${slug}`,
        description: 'Smoke fixture',
        price: 2500,
        deliveryFee: 0,
        unit: 'bag',
        image: '',
      },
    })
    productId = product.id

    const passwordHash = await hashPassword('smoke-password-123')
    const userA = await prisma.user.create({ data: { name: 'Customer Smoke A', email: customerEmailA, passwordHash, role: UserRole.CUSTOMER, emailVerified: true } })
    const userB = await prisma.user.create({ data: { name: 'Customer Smoke B', email: customerEmailB, passwordHash, role: UserRole.CUSTOMER, emailVerified: true } })

    // Fixtures: A1 (to be accepted), A2 (to be declined), A3 (pending guard).
    const quoteA1 = await createFixtureQuote(userA.id, 2)
    const quoteA2 = await createFixtureQuote(userA.id, 3)
    const quoteA3 = await createFixtureQuote(userA.id, 1)
    const quoteB1 = await createFixtureQuote(userB.id, 5)
    const quoteB2 = await createFixtureQuote(userB.id, 7)

    const priceQuote = async (
      reference: string,
      unitPrice: string,
      deliveryFee = '0.00',
      fulfillmentMethod: 'PICKUP' | 'DELIVERY' = 'PICKUP',
    ): Promise<void> => {
      const { items } = await getAdminQuoteRequest(reference)
      await prepareQuotePricing(reference, {
        items: items.map((item) => ({ itemId: item.id, quotedUnitPrice: unitPrice })),
        deliveryFee,
        fulfillmentMethod,
      })
    }
    await priceQuote(quoteA1, '4500.00', '1000.00', 'DELIVERY')
    await priceQuote(quoteA2, '3000.00')
    await priceQuote(quoteB1, '7000.00')
    await priceQuote(quoteB2, '9000.00')

    // --- Customer lists are scoped to the authenticated user ---
    const listA = await listCustomerQuoteRequests(userA.id)
    if (listA.quoteRequests.length !== 3) throw new Error(`Customer A should see exactly 3 quotes, got ${listA.quoteRequests.length}.`)
    if (listA.quoteRequests.some((quote) => quote.quoteNumber === quoteB1)) throw new Error('Customer A can see customer B quote in their list.')
    for (const field of ['id', 'quoteNumber', 'shoppingMode', 'status', 'itemCount', 'quotedTotal', 'quotedAt', 'createdAt', 'updatedAt']) {
      if (!(field in listA.quoteRequests[0])) throw new Error(`Customer list item is missing "${field}".`)
    }
    if ('rejectionReason' in listA.quoteRequests[0]) throw new Error('Customer list leaked rejectionReason.')

    // --- Cross-owner reads are indistinguishable from a missing quote (404) ---
    await expectNotFound(getCustomerQuoteRequest(quoteB1, userA.id))
    await expectNotFound(getCustomerQuoteRequest(quoteB1, userA.id))

    // Own quote detail resolves, pricing included.
    const ownA1 = await getCustomerQuoteRequest(quoteA1, userA.id)
    if (ownA1.status !== QUOTED) throw new Error('Own quote detail did not resolve as QUOTED.')
    if (!moneyEquals(ownA1.quotedTotal, 10_000)) throw new Error('Customer quote detail has the wrong total.')
    const ownKeys = Object.keys(ownA1)
    for (const secret of ['adminNote', 'requestKey', 'userId', 'rejectionReason']) {
      if (ownKeys.includes(secret)) throw new Error(`Customer detail leaked "${secret}".`)
    }

    // --- Pre-acceptance / pre-decline guards ---
    await expectConflict(acceptQuoteRequest(quoteA3, userA.id))
    await expectConflict(rejectQuoteRequest(quoteA3, userA.id, {}))
    await expectNotFound(acceptQuoteRequest(quoteB2, userA.id))
    await expectNotFound(rejectQuoteRequest(quoteB2, userA.id, {}))

    // --- HTTP flow (only when the API is reachable) ---
    let apiReachable = false
    try {
      const ready = await fetch(`${API_ORIGIN}/ready`)
      if (ready.ok) apiReachable = true
    } catch {
      apiReachable = false
    }

    if (apiReachable) {
      const cookieFor = async (email: string): Promise<string> => {
        const auth = await loginCustomer({ email, password: 'smoke-password-123' })
        return `ayanfe_customer_session=${auth.token}`
      }
      const sessionA = await cookieFor(customerEmailA)
      const sessionB = await cookieFor(customerEmailB)

      const unauthorized = await fetch(`${API_ORIGIN}/api/v1/quotes`)
      if (unauthorized.status !== 401) throw new Error(`Unauthenticated customer quote list returned ${unauthorized.status}.`)

      const listResponse = await fetch(`${API_ORIGIN}/api/v1/quotes`, { headers: { Cookie: sessionA } })
      const listBody = await listResponse.json() as { data?: { quoteRequests?: Array<{ quoteNumber: string; status: string }> } }
      if (listResponse.status !== 200 || (listBody.data?.quoteRequests?.length ?? 0) !== 3) {
        throw new Error(`HTTP customer quote list failed: ${listResponse.status} ${JSON.stringify(listBody).slice(0, 200)}`)
      }

      const crossOwner = await fetch(`${API_ORIGIN}/api/v1/quotes/${quoteB1}`, { headers: { Cookie: sessionA } })
      if (crossOwner.status !== 404) throw new Error(`Cross-owner HTTP detail returned ${crossOwner.status}.`)

      const destDetail = await fetch(`${API_ORIGIN}/api/v1/quotes/${quoteA1}`, { headers: { Cookie: sessionA } })
      if (destDetail.status !== 200) throw new Error(`Own HTTP detail returned ${destDetail.status}.`)

      const pendingAccept = await fetch(`${API_ORIGIN}/api/v1/quotes/${quoteA3}/accept`, {
        method: 'POST',
        headers: { Cookie: sessionA },
      })
      if (pendingAccept.status !== 409) throw new Error(`Accepting a pending quote via HTTP returned ${pendingAccept.status}.`)

      const crossOwnerAccept = await fetch(`${API_ORIGIN}/api/v1/quotes/${quoteA1}/accept`, {
        method: 'POST',
        headers: { Cookie: sessionB },
      })
      if (crossOwnerAccept.status !== 404) throw new Error(`Cross-owner HTTP accept returned ${crossOwnerAccept.status}.`)

      console.log('HTTP customer quote flow passed.')
    } else {
      console.log('Skipping HTTP customer flow (API not reachable).')
    }

    // --- Accept lifecycle ---
    const acceptedA1 = await acceptQuoteRequest(quoteA1, userA.id)
    if (acceptedA1.status !== ACCEPTED) throw new Error(`Accepting moved quote to ${acceptedA1.status}.`)
    if (acceptedA1.fulfillmentMethod !== 'DELIVERY') throw new Error('Accepted quote lost its fulfillment method.')
    if (acceptedA1.acceptedAt === null) throw new Error('Accepting did not record acceptedAt.')
    if (acceptedA1.rejectedAt !== null) throw new Error('Accepted quote unexpectedly has rejectedAt.')
    if (!moneyEquals(acceptedA1.quotedTotal, 10_000)) throw new Error('Accepted quote lost its quotation totals.')
    if (acceptedA1.items[0].quotedUnitPrice === null || !moneyEquals(acceptedA1.items[0].quotedUnitPrice, 4500)) {
      throw new Error('Accepted quote lost its snapshot unit price.')
    }

    // Accepting again is a safe, idempotent no-op.
    const acceptedA1Again = await acceptQuoteRequest(quoteA1, userA.id)
    if (acceptedA1Again.status !== ACCEPTED) throw new Error('Second accept did not stay ACCEPTED.')

    // An accepted quote cannot later be declined.
    await expectConflict(rejectQuoteRequest(quoteA1, userA.id, {}))

    // --- Decline lifecycle ---
    const rejectedA2 = await rejectQuoteRequest(quoteA2, userA.id, { reason: 'Out of budget' })
    if (rejectedA2.status !== CANCELLED) throw new Error(`Declining moved quote to ${rejectedA2.status}.`)
    if (rejectedA2.rejectedAt === null) throw new Error('Declining did not record rejectedAt.')
    if ('rejectionReason' in rejectedA2) throw new Error('Customer response leaked rejectionReason.')

    const adminA2 = await getAdminQuoteRequest(quoteA2)
    if (adminA2.status !== CANCELLED) throw new Error('Admin sees the wrong status after customer declined.')
    if (adminA2.rejectedAt === null) throw new Error('Admin detail is missing rejectedAt.')
    if (adminA2.rejectionReason !== 'Out of budget') throw new Error('Admin detail is missing the customer decline reason.')

    // Declining again is idempotent; the reason is preserved.
    const rejectedA2Again = await rejectQuoteRequest(quoteA2, userA.id, {})
    if (rejectedA2Again.status !== CANCELLED) throw new Error('Second decline did not stay CANCELLED.')
    const adminA2After = await getAdminQuoteRequest(quoteA2)
    if (adminA2After.rejectionReason !== 'Out of budget') throw new Error('Idempotent decline wiped the stored reason.')

    // Admin detail for an accepted quote carries the acceptance timestamp.
    const adminA1 = await getAdminQuoteRequest(quoteA1)
    if (adminA1.status !== ACCEPTED) throw new Error('Admin sees the wrong status after customer accepted.')
    if (adminA1.acceptedAt === null) throw new Error('Admin detail is missing acceptedAt for an accepted quote.')
    if (adminA1.fulfillmentMethod !== 'DELIVERY') throw new Error('Admin detail is missing the fulfillment method.')
    if (adminA1.convertedOrderNumber !== null) throw new Error('Accepted quote unexpectedly reports a converted order.')

    // --- Public create-request serializer still hides internal fields ---
    const requestKeyA1 = (await quoteFor(quoteA1)).requestKey!
    const customerA: AuthenticatedUser = {
      id: userA.id,
      name: userA.name,
      email: customerEmailA,
      phone: null,
      role: UserRole.CUSTOMER,
      shoppingMode: 'RETAIL',
    }
    const publicSnapshot = await createQuoteRequest(customerA, {
      requestKey: requestKeyA1,
      customerName: 'Customer Smoke A',
      customerEmail: customerEmailA,
      customerPhone: '+2348099990000',
      message: 'Please price this for me.',
      items: [{ productId, quantity: 2 }],
    })
    if (publicSnapshot.created) throw new Error('Request key idempotency was not honored.')
    const publicKeys = Object.keys(publicSnapshot.quoteRequest)
    for (const secret of ['adminNote', 'requestKey', 'userId', 'rejectionReason']) {
      if (publicKeys.includes(secret)) throw new Error(`Public response leaked "${secret}".`)
    }
    for (const field of ['acceptedAt', 'rejectedAt']) {
      if (!publicKeys.includes(field)) throw new Error(`Public response is missing "${field}".`)
    }

    console.log('Customer quote smoke test passed.')
  } finally {
    const smokeReferences = await prisma.quoteRequest.findMany({
      where: { customerPhone: '+2348099990000' },
      select: { quoteNumber: true },
    })
    await prisma.adminNotification.deleteMany({
      where: { href: { in: smokeReferences.map((quote) => `/admin/quote-requests/${quote.quoteNumber}`) } },
    })
    await prisma.quoteRequest.deleteMany({ where: { customerPhone: '+2348099990000' } })
    await prisma.user.deleteMany({ where: { email: { in: [customerEmailA, customerEmailB] } } })
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'smoke-product-' } } })
    await prisma.category.deleteMany({ where: { slug: { startsWith: 'smoke-category-' } } })
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