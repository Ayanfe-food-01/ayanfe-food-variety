import { FulfillmentMethod, QuoteRequestStatus } from '@prisma/client'
import { prisma, closeDatabase } from '../src/lib/prisma.js'
import {
  createQuoteRequest,
  getAdminQuoteRequest,
  prepareQuotePricing,
  updateAdminQuoteRequestStatus,
} from '../src/modules/quotes/quote.service.js'
import { login } from '../src/modules/auth/auth.service.js'
import { validatePrepareQuotePricingInput } from '../src/modules/quotes/quote.validator.js'
import { HttpError } from '../src/utils/http.js'

const slug = `quote-price-smoke-${Date.now().toString(36)}`
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:8000'

let quoteNumberIndex = 0
const nextQuoteNumber = () => `QR-2099-${String(quoteNumberIndex++).padStart(6, '0')}`

const expectHttpError = async (operation: Promise<unknown>, expectedStatus: number): Promise<void> => {
  try {
    await operation
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === expectedStatus) return
    throw error
  }
  throw new Error(`Expected HTTP ${expectedStatus} error.`)
}

const expectValidatorError = (operation: () => unknown, expectedStatus: number): void => {
  try {
    operation()
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === expectedStatus) return
    throw error
  }
  throw new Error(`Expected validator HTTP ${expectedStatus} error.`)
}

const moneyEquals = (serialized: string | null, expected: number): boolean => {
  if (serialized === null) return false
  return Math.abs(Number(serialized) - expected) < 0.001
}

const QUOTED = QuoteRequestStatus.QUOTED
const PENDING = QuoteRequestStatus.PENDING
const CONTACTED = QuoteRequestStatus.CONTACTED
const COMPLETED = QuoteRequestStatus.COMPLETED
const PICKUP = FulfillmentMethod.PICKUP
const DELIVERY = FulfillmentMethod.DELIVERY

async function main() {
  let categoryId = ''
  let productId = ''
  const quoteRequestIds: string[] = []

  const createQuote = async (items: Array<{ quantity: number }>, status = PENDING): Promise<string> => {
    const requestKey = `${slug}-${quoteRequestIds.length}`
    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        quoteNumber: nextQuoteNumber(),
        requestKey,
        userId: null,
        customerName: 'Phase Four Customer',
        customerEmail: 'phase-four@example.com',
        customerPhone: '+2348012345678',
        message: 'Please advise pricing.',
        shoppingMode: 'RETAIL',
        status,
        items: {
          create: items.map((item, index) => ({
            productId,
            productName: 'Smoke Product',
            productOptionId: null,
            productOptionLabel: null,
            quantity: item.quantity,
            note: index === 0 ? 'first item' : null,
          })),
        },
      },
      select: { id: true, quoteNumber: true, requestKey: true },
    })
    quoteRequestIds.push(quoteRequest.id)
    return quoteRequest.quoteNumber
  }

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
        deliveryFee: 800,
        unit: 'bag',
        image: '',
      },
    })
    productId = product.id

    // --- Fresh request has no pricing data ---
    const referenceA = await createQuote([{ quantity: 2 }, { quantity: 3 }])
    const freshA = await getAdminQuoteRequest(referenceA)
    if (freshA.quotedSubtotal !== null || freshA.quotedTotal !== null || freshA.quotedAt !== null) {
      throw new Error('Unpriced quote unexpectedly exposes quotation totals.')
    }
    if (freshA.items.some((item) => item.quotedUnitPrice !== null)) {
      throw new Error('Unpriced quote unexpectedly exposes item unit prices.')
    }

    // --- Public serializer: never leaks admin fields; carries pricing data ---
    const requestKeyA = (await prisma.quoteRequest.findUniqueOrThrow({ where: { id: freshA.id } })).requestKey
    const publicSnapshot = await createQuoteRequest(undefined, {
      requestKey: requestKeyA,
      customerName: 'Phase Four Customer',
      customerEmail: 'phase-four@example.com',
      customerPhone: '+2348012345678',
      message: 'Please advise pricing.',
      items: [{ productId, quantity: 2 }],
    })
    if (publicSnapshot.created) throw new Error('Request key idempotency was not honored.')
    const publicKeys = Object.keys(publicSnapshot.quoteRequest)
    for (const secret of ['adminNote', 'requestKey', 'userId']) {
      if (publicKeys.includes(secret)) throw new Error(`Public response leaked "${secret}".`)
    }
    for (const field of ['quotedSubtotal', 'deliveryFee', 'quotedTotal', 'quotedAt', 'fulfillmentMethod']) {
      if (!publicKeys.includes(field)) throw new Error(`Public response missing "${field}".`)
    }

    // --- Pre-quote guards ---
    await expectHttpError(
      prepareQuotePricing('QR-2099-999999', {
        items: [{ itemId: freshA.items[0].id, quotedUnitPrice: '100.00' }],
        deliveryFee: '0.00',
        fulfillmentMethod: PICKUP,
      }),
      404,
    )
    await expectHttpError(
      prepareQuotePricing(referenceA, {
        items: [{ itemId: freshA.items[0].id, quotedUnitPrice: '100.00' }],
        deliveryFee: '0.00',
        fulfillmentMethod: PICKUP,
      }),
      400,
    )
    await expectHttpError(
      prepareQuotePricing(referenceA, {
        items: [
          { itemId: freshA.items[0].id, quotedUnitPrice: '100.00' },
          { itemId: '00000000-0000-4000-8000-000000000000', quotedUnitPrice: '100.00' },
        ],
        deliveryFee: '0.00',
        fulfillmentMethod: PICKUP,
      }),
      400,
    )

    // --- Validator rejects malformed money ---
    expectValidatorError(() =>
      validatePrepareQuotePricingInput({
        items: [
          { itemId: freshA.items[0].id, quotedUnitPrice: '100.00' },
          { itemId: freshA.items[0].id, quotedUnitPrice: '100.00' },
        ],
        fulfillmentMethod: PICKUP,
      }),
      400,
    )
    for (const badPrice of ['abc', '-5', '0', '12.345', '9'.repeat(20), '10000001']) {
      expectValidatorError(() =>
        validatePrepareQuotePricingInput({
          items: [{ itemId: freshA.items[0].id, quotedUnitPrice: badPrice }],
          fulfillmentMethod: PICKUP,
        }),
        400,
      )
    }
    expectValidatorError(() =>
      validatePrepareQuotePricingInput({
        items: [{ itemId: freshA.items[0].id, quotedUnitPrice: '100.00' }],
        deliveryFee: '0.00',
        fulfillmentMethod: 'COURIER' as 'PICKUP',
      }),
      400,
    )
    for (const badFee of ['abc', '-1', '12.345', '10000001']) {
      expectValidatorError(() =>
        validatePrepareQuotePricingInput({
          items: [{ itemId: freshA.items[0].id, quotedUnitPrice: '100.00' }],
          deliveryFee: badFee,
          fulfillmentMethod: DELIVERY,
        }),
        400,
      )
    }
    const validInput = validatePrepareQuotePricingInput({
      items: [{ itemId: freshA.items[0].id, quotedUnitPrice: '4500.5' }],
      fulfillmentMethod: PICKUP,
    })
    if (validInput.items[0].quotedUnitPrice !== '4500.50' || validInput.deliveryFee !== '0.00' || validInput.fulfillmentMethod !== PICKUP) {
      throw new Error('Validator did not normalize money values.')
    }
    const zeroFeeInput = validatePrepareQuotePricingInput({
      items: [{ itemId: freshA.items[0].id, quotedUnitPrice: '100' }],
      deliveryFee: '0',
      fulfillmentMethod: PICKUP,
    })
    if (zeroFeeInput.deliveryFee !== '0.00') throw new Error('Validator did not accept a zero delivery fee.')

    // --- Prepare a quotation on the PENDING request ---
    const expectedSubtotalA = 4500 * freshA.items[0].quantity + 3000 * freshA.items[1].quantity
    const expectedTotalA = expectedSubtotalA + 5000
    const quotedA = await prepareQuotePricing(referenceA, {
      items: [
        { itemId: freshA.items[0].id, quotedUnitPrice: '4500.00' },
        { itemId: freshA.items[1].id, quotedUnitPrice: '3000.00' },
      ],
      deliveryFee: '5000.00',
      fulfillmentMethod: DELIVERY,
    })
    if (quotedA.status !== QUOTED) throw new Error('Pricing did not move the request to QUOTED.')
    if (quotedA.fulfillmentMethod !== DELIVERY) throw new Error('Pricing did not store the fulfillment method.')
    if (quotedA.quotedAt === null) throw new Error('Pricing did not record a quotedAt timestamp.')
    if (!moneyEquals(quotedA.quotedSubtotal, expectedSubtotalA)) {
      throw new Error(`Quoted subtotal is wrong: expected ${expectedSubtotalA} got ${JSON.stringify(quotedA.quotedSubtotal)}`)
    }
    if (!moneyEquals(quotedA.deliveryFee, 5_000)) throw new Error('Quoted delivery fee is wrong.')
    if (!moneyEquals(quotedA.quotedTotal, expectedTotalA)) {
      throw new Error(`Quoted total is wrong: expected ${expectedTotalA} got ${JSON.stringify(quotedA.quotedTotal)}`)
    }
    if (!moneyEquals(quotedA.items[0].quotedUnitPrice, 4500) || !moneyEquals(quotedA.items[1].quotedUnitPrice, 3000)) {
      throw new Error('Quoted item unit prices are wrong.')
    }

    // --- A QUOTED request can no longer be re-priced or walked back ---
    await expectHttpError(
      prepareQuotePricing(referenceA, {
        items: [
          { itemId: freshA.items[0].id, quotedUnitPrice: '1.00' },
          { itemId: freshA.items[1].id, quotedUnitPrice: '1.00' },
        ],
        deliveryFee: '0.00',
        fulfillmentMethod: PICKUP,
      }),
      409,
    )
    await expectHttpError(
      updateAdminQuoteRequestStatus(referenceA, CONTACTED),
      409,
    )

    // --- A pickup quotation cannot carry a delivery fee ---
    const referenceAFee = await createQuote([{ quantity: 1 }])
    const freshAFee = await getAdminQuoteRequest(referenceAFee)
    await expectHttpError(
      prepareQuotePricing(referenceAFee, {
        items: [{ itemId: freshAFee.items[0].id, quotedUnitPrice: '100.00' }],
        deliveryFee: '200.00',
        fulfillmentMethod: PICKUP,
      }),
      400,
    )
    const quotedAFee = await prepareQuotePricing(referenceAFee, {
      items: [{ itemId: freshAFee.items[0].id, quotedUnitPrice: '100.00' }],
      deliveryFee: '200.00',
      fulfillmentMethod: DELIVERY,
    })
    if (!moneyEquals(quotedAFee.deliveryFee, 200)) throw new Error('Delivery fulfilled quotation lost its delivery fee.')
    if (!moneyEquals(quotedAFee.quotedTotal, 300)) throw new Error('Delivery fulfilled quotation total is wrong.')

    // --- Moving to COMPLETED preserves the quotation ---
    const completedA = await updateAdminQuoteRequestStatus(referenceA, COMPLETED)
    if (completedA.status !== COMPLETED) throw new Error('Quote did not move to COMPLETED.')
    if (!moneyEquals(completedA.quotedTotal, expectedTotalA)) throw new Error('COMPLETED quote lost its quoted totals.')
    if (completedA.adminNote !== null) throw new Error('COMPLETED quote unexpectedly has an internal note.')

    // --- Snapshot survives later catalog changes ---
    const referenceB = await createQuote([{ quantity: 4 }])
    await updateAdminQuoteRequestStatus(referenceB, CONTACTED)
    const freshB = await getAdminQuoteRequest(referenceB)
    const quotedB = await prepareQuotePricing(referenceB, {
      items: [{ itemId: freshB.items[0].id, quotedUnitPrice: '1200.00' }],
      deliveryFee: '1000.00',
      fulfillmentMethod: DELIVERY,
    })
    await prisma.product.update({ where: { id: productId }, data: { price: 99, deliveryFee: 0 } })
    const afterCatalogChange = await getAdminQuoteRequest(referenceB)
    if (!moneyEquals(afterCatalogChange.quotedSubtotal, 4_800)) throw new Error('Snapshot subtotal changed after catalog edit.')
    if (!moneyEquals(afterCatalogChange.quotedTotal, 5_800)) throw new Error('Snapshot total changed after catalog edit.')
    if (!moneyEquals(afterCatalogChange.items[0].quotedUnitPrice, 1200)) throw new Error('Snapshot unit price changed after catalog edit.')
    if (quotedB.items[0].quotedUnitPrice !== afterCatalogChange.items[0].quotedUnitPrice) {
      throw new Error('Snapshot unit price does not match the original quotation.')
    }

    // --- Large-quantity quote with a free delivery fee ---
    const referenceC = await createQuote([{ quantity: 100000 }])
    const freshC = await getAdminQuoteRequest(referenceC)
    const quotedC = await prepareQuotePricing(referenceC, {
      items: [{ itemId: freshC.items[0].id, quotedUnitPrice: '200.00' }],
      deliveryFee: '0.00',
      fulfillmentMethod: PICKUP,
    })
    if (quotedC.fulfillmentMethod !== PICKUP) throw new Error('Pricing did not store pickup fulfillment.')
    if (!moneyEquals(quotedC.quotedSubtotal, 20_000_000)) throw new Error('Large quote subtotal is wrong.')
    if (!moneyEquals(quotedC.deliveryFee, 0)) throw new Error('Free delivery fee was not stored.')
    if (!moneyEquals(quotedC.quotedTotal, 20_000_000)) throw new Error('Large quote total is wrong.')

    // --- A subtotal that would overflow the money column is rejected ---
    const referenceD = await createQuote([{ quantity: 100000 }])
    const freshD = await getAdminQuoteRequest(referenceD)
    await expectHttpError(
      prepareQuotePricing(referenceD, {
        items: [{ itemId: freshD.items[0].id, quotedUnitPrice: '9000000.00' }],
        deliveryFee: '0.00',
        fulfillmentMethod: PICKUP,
      }),
      400,
    )

    // --- HTTP: admin-only route ---
    let apiReachable = false
    try {
      const ready = await fetch(`${API_ORIGIN}/ready`)
      if (ready.ok) apiReachable = true
    } catch {
      apiReachable = false
    }
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    if (apiReachable && adminEmail && adminPassword) {
      const loginResponse = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      })
      let sessionCookie: string | undefined
      if (loginResponse.status === 200) {
        const setCookies = typeof loginResponse.headers.getSetCookie === 'function'
          ? loginResponse.headers.getSetCookie()
          : [loginResponse.headers.get('set-cookie') ?? '']
        sessionCookie = setCookies
          .map((cookie) => cookie.split(';')[0])
          .find((cookie) => cookie.startsWith('ayanfe_admin_session='))
      } else {
        // The login route is rate limited per IP; fall back to minting the same
        // admin session through the service so repeated dev runs stay stable.
        const auth = await login({ email: adminEmail, password: adminPassword })
        sessionCookie = `ayanfe_admin_session=${auth.token}`
      }
      if (!sessionCookie) throw new Error('No admin session could be obtained for the HTTP flow.')

      const referenceE = await createQuote([{ quantity: 5 }])
      const freshE = await getAdminQuoteRequest(referenceE)
      const itemIdE = freshE.items[0].id

      const unauthorized = await fetch(`${API_ORIGIN}/api/v1/admin/quotes/${referenceE}/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ itemId: itemIdE, quotedUnitPrice: '100.00' }], deliveryFee: '0.00', fulfillmentMethod: 'PICKUP' }),
      })
      if (unauthorized.status !== 401) throw new Error(`Unauthenticated pricing returned ${unauthorized.status}.`)

      const adminHeaders = {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      }
      const pricedResponse = await fetch(`${API_ORIGIN}/api/v1/admin/quotes/${referenceE}/price`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ items: [{ itemId: itemIdE, quotedUnitPrice: '500.00' }], deliveryFee: '250.00', fulfillmentMethod: 'DELIVERY' }),
      })
      const pricedBody = await pricedResponse.json() as {
        success?: boolean
        message?: string
        data?: { quoteRequest?: { status?: string; quotedTotal?: string | null; adminNote?: string | null; requestKey?: string; userId?: string } }
      }
      if (pricedResponse.status !== 200 || pricedBody.success !== true || pricedBody.message !== 'Quotation prepared.') {
        throw new Error(`Admin pricing endpoint failed: ${pricedResponse.status} ${JSON.stringify(pricedBody).slice(0, 200)}`)
      }
      if (pricedBody.data?.quoteRequest?.status !== 'QUOTED') throw new Error('Admin endpoint did not return a QUOTED request.')
      if (pricedBody.data?.quoteRequest?.fulfillmentMethod !== 'DELIVERY') throw new Error('Admin endpoint did not return the fulfillment method.')
      if (!moneyEquals(pricedBody.data?.quoteRequest?.quotedTotal ?? null, 2_750)) {
        throw new Error(`Admin endpoint returned the wrong total: ${pricedBody.data?.quoteRequest?.quotedTotal}`)
      }
      if ('adminNote' in (pricedBody.data?.quoteRequest ?? {}) === false) {
        throw new Error('Admin response is missing the adminNote field.')
      }
      if ('requestKey' in (pricedBody.data?.quoteRequest ?? {})) throw new Error('Admin response leaked the request key.')

      const secondPriced = await fetch(`${API_ORIGIN}/api/v1/admin/quotes/${referenceE}/price`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ items: [{ itemId: itemIdE, quotedUnitPrice: '1.00' }], deliveryFee: '0.00', fulfillmentMethod: 'PICKUP' }),
      })
      if (secondPriced.status !== 409) throw new Error(`Already-quoted endpoint returned ${secondPriced.status}.`)

      const invalidBody = await fetch(`${API_ORIGIN}/api/v1/admin/quotes/${referenceE}/price`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ items: [{ itemId: itemIdE, quotedUnitPrice: 'bogus' }], deliveryFee: '0.00', fulfillmentMethod: 'PICKUP' }),
      })
      if (invalidBody.status !== 400) throw new Error(`Invalid pricing body returned ${invalidBody.status}.`)

      // Public serializer after HTTP pricing still hides admin fields.
      const requestKeyE = (await prisma.quoteRequest.findUniqueOrThrow({ where: { id: freshE.id } })).requestKey
      const publicAfterHttp = await createQuoteRequest(undefined, {
        requestKey: requestKeyE,
        customerName: 'Phase Four Customer',
        customerEmail: 'phase-four@example.com',
        customerPhone: '+2348012345678',
        message: 'Please advise pricing.',
        items: [{ productId, quantity: 2 }],
      })
      const afterHttpKeys = Object.keys(publicAfterHttp.quoteRequest)
      for (const secret of ['adminNote', 'requestKey', 'userId']) {
        if (afterHttpKeys.includes(secret)) throw new Error(`Public response leaked "${secret}" after pricing.`)
      }
      if (!moneyEquals(publicAfterHttp.quoteRequest.quotedTotal, 2_750)) {
        throw new Error('Public quotation total after HTTP pricing is wrong.')
      }

      console.log('HTTP admin pricing flow passed.')
    } else {
      console.log('Skipping HTTP admin flow (API not reachable or no ADMIN_EMAIL/ADMIN_PASSWORD in env).')
    }

    console.log('Quote pricing smoke test passed.')
  } finally {
    await prisma.quoteRequest.deleteMany({ where: { customerEmail: 'phase-four@example.com' } })
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