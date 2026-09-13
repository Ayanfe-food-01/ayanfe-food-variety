import { randomUUID } from 'node:crypto'
import { FulfillmentMethod, PaymentMethod, UserRole } from '@prisma/client'
import { app } from '../src/app.js'
import { prisma, closeDatabase } from '../src/config/prisma.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'

const slug = `account-checkout-e2e-${Date.now().toString(36)}`
const generatedEmail = (prefix: string) => `${prefix}-${slug}@example.com`

const expectStatus = (actual: number, expected: number, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}.`)
}

async function main() {
  const createdOrderIds: string[] = []
  const createdProductIds: string[] = []
  let categoryId = ''
  let customerCookie = ''
  const createdUserIds: string[] = []
  let productId = ''
  let foundedAt = ''

  const baseUrl = () => `http://127.0.0.1:${(server?.address() as { port: number }).port}/api/v1`

  const requestAs = async (
    cookie: string | undefined,
    path: string,
    init?: { method?: string; body?: unknown; extraHeaders?: Record<string, string> },
  ): Promise<{ status: number; body: any; setCookie?: string }> => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (cookie) headers.Cookie = cookie
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json'
    if (init?.extraHeaders) Object.assign(headers, init.extraHeaders)
    const response = await fetch(`${baseUrl()}${path}`, {
      method: init?.method ?? 'GET',
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    let body: any = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    return { status: response.status, body, setCookie: response.headers.get('set-cookie') ?? undefined }
  }

  const loginCustomer = async (email: string, password: string) => {
    const { status, setCookie } = await requestAs(undefined, '/auth/customer/login', {
      method: 'POST',
      body: { email, password },
    })
    expectStatus(status, 200, 'customer login')
    if (!setCookie) throw new Error('customer login: no session cookie set')
    const sessionCookie = setCookie.split(';')[0].trim()
    if (!sessionCookie.startsWith('ayanfe_customer_session=')) {
      throw new Error(`customer login: unexpected cookie ${sessionCookie.slice(0, 40)}`)
    }
    return sessionCookie
  }

  try {
    const category = await prisma.category.create({
      data: { name: `E2E Category ${slug}`, slug: `e2e-category-${slug}`, isActive: true },
    })
    categoryId = category.id
    const product = await prisma.product.create({
      data: {
        name: `E2E Product ${slug}`,
        slug: `e2e-product-${slug}`,
        description: 'Temporary product created by account-checkout-e2e.',
        categoryId,
        price: 2500,
        stockQuantity: 50,
        unit: 'bag',
        image: '',
        isActive: true,
      },
    })
    productId = product.id
    createdProductIds.push(product.id)

    const password = 'E2e_Test_1234567!'
    const customer = await prisma.user.create({
      data: {
        email: generatedEmail('acct'),
        passwordHash: await hashPassword(password),
        role: UserRole.CUSTOMER,
        name: 'E2E Account Customer',
        phone: '+2348010000001',
        emailVerified: true,
        shoppingMode: 'RETAIL',
      },
    })
    createdUserIds.push(customer.id)
    foundedAt = customer.createdAt.toISOString()

    customerCookie = await loginCustomer(customer.email, password)

    // Account profile (wrapped as data.profile)
    const profile = (await requestAs(customerCookie, '/customer/account/profile')).body.data.profile
    if (profile.email !== customer.email) throw new Error('profile: email mismatch')
    if (profile.hasPassword !== true || profile.authProvider !== 'PASSWORD') {
      throw new Error(`profile: bad auth flags ${JSON.stringify({ provider: profile.authProvider, hasPassword: profile.hasPassword })}`)
    }
    const me = (await requestAs(customerCookie, '/auth/customer/me')).body.data?.user ?? (await requestAs(customerCookie, '/auth/customer/me')).body.data
    if (!me.shoppingMode) throw new Error('profile: shoppingMode missing on /auth/customer/me')
    if (me.email !== customer.email) throw new Error('profile: /auth/customer/me email mismatch')
    if (profile.createdAt !== foundedAt) throw new Error('profile: createdAt mismatch')
    console.log('PASS profile GET (name, email, auth flags, shoppingMode, createdAt)')

    const profileUpdate = { name: 'E2E Account Customer Renamed', phone: '+2348010000002' }
    const updated = (await requestAs(customerCookie, '/customer/account/profile', {
      method: 'PATCH',
      body: profileUpdate,
    })).body.data.profile
    if (updated.name !== profileUpdate.name || updated.phone !== profileUpdate.phone) throw new Error('profile PATCH failed')
    if (updated.email !== customer.email) throw new Error('profile PATCH: email must be immutable')
    console.log('PASS profile PATCH (name/phone updated; email immutable)')

    const locationStates = (await requestAs(undefined, '/delivery-zones/delivery-locations/states')).body.data.states
    if (!Array.isArray(locationStates) || locationStates.length === 0) throw new Error('delivery locations: none returned')
    const firstState = locationStates[0]
    if (!firstState.id || !firstState.name || !Array.isArray(firstState.cities) || firstState.cities.length === 0) {
      throw new Error(`delivery locations: bad shape ${JSON.stringify(firstState).slice(0, 200)}`)
    }
    console.log('PASS delivery locations states fetch')

    const zone = await prisma.deliveryZone.findFirst({ where: { isActive: true } })

    const addressPayload = {
      label: 'Home',
      recipientName: 'E2E Recipient',
      phone: '+2348011112222',
      address: '4 E2E Close, Motorway',
      city: 'Ikeja',
      cityId: null,
      state: 'Lagos',
      areaName: null,
      areaId: null,
      instructions: 'Ring the bell',
    }
    const addressA = (await requestAs(customerCookie, '/customer/account/addresses', {
      method: 'POST',
      body: { ...addressPayload, isDefault: true },
    })).body.data.addresses
    if (!Array.isArray(addressA) || addressA.length !== 1 || !addressA[0].id || addressA[0].isDefault !== true) {
      throw new Error(`address create: unexpected ${JSON.stringify(addressA).slice(0, 200)}`)
    }
    const addressB = (await requestAs(customerCookie, '/customer/account/addresses', {
      method: 'POST',
      body: { ...addressPayload, label: 'Office', recipientName: 'E2E Boss', phone: '+2348013334444', address: '11 E2E Avenue', isDefault: false },
    })).body.data.addresses
    const addressAItem = addressA.find((a: any) => a.label === 'Home')
    const addressBItem = addressB.find((a: any) => a.label === 'Office')
    if (!addressAItem || !addressBItem) throw new Error('address create: created items not found in list response')
    if (addressBItem.isDefault !== false) throw new Error('address create: B should not be default')
    console.log('PASS address create (default honored, non-default on create)')

    const listed1 = (await requestAs(customerCookie, '/customer/account/addresses')).body.data.addresses
    if (listed1.length !== 2) throw new Error(`address list: expected 2, got ${listed1.length}`)
    const defaults1 = listed1.filter((a: any) => a.isDefault)
    if (defaults1.length !== 1 || defaults1[0].id !== addressAItem.id) throw new Error('address list: expected A exclusively default')
    console.log('PASS address list (exactly one default = A)')

    const patchB = (await requestAs(customerCookie, `/customer/account/addresses/${addressBItem.id}`, {
      method: 'PATCH',
      body: { ...addressPayload, label: 'Office', isDefault: true },
    })).body.data.addresses
    if (patchB.some((a: any) => a.id === addressBItem.id && a.isDefault !== true)) throw new Error('address PATCH: B not set default')
    const listed2 = (await requestAs(customerCookie, '/customer/account/addresses')).body.data.addresses
    const defaults2 = listed2.filter((a: any) => a.isDefault)
    if (defaults2.length !== 1 || defaults2[0].id !== addressBItem.id) throw new Error('address set-default: expected exactly B default')
    console.log('PASS address set-default via PATCH (auto-clears A, single default)')

    const deleteResult = (await requestAs(customerCookie, `/customer/account/addresses/${addressBItem.id}`, {
      method: 'DELETE',
    })).body.data.addresses
    if (!Array.isArray(deleteResult) || deleteResult.length !== 1) throw new Error('address delete: expected 1 remaining')
    const listed3 = (await requestAs(customerCookie, '/customer/account/addresses')).body.data.addresses
    if (listed3.some((a: any) => a.id === addressBItem.id)) throw new Error('address delete: still listed')
    if (listed3[0].isDefault !== true) throw new Error('address delete: remaining should become default')
    console.log('PASS address delete (remaining address promoted to default)')

    const checkoutAs = async (cookie: string | undefined, guestAccessToken: string | undefined, customerName: string) => {
      const { status, body } = await requestAs(cookie, '/orders', {
        method: 'POST',
        extraHeaders: { 'X-Checkout-Request': '1' },
        body: {
          checkoutKey: randomUUID(),
          guestAccessToken,
          cartItems: [{ productId, quantity: 1, productOptionId: null }],
          customerName,
          phone: '+2348010000003',
          email: generatedEmail('checkout'),
          fulfillmentMethod: zone ? FulfillmentMethod.DELIVERY : FulfillmentMethod.PICKUP,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          ...(zone
            ? {
                deliveryAddress: '4 E2E Close, Motorway',
                city: 'Ikeja',
                deliveryInstructions: 'Ring the bell',
                deliveryZoneId: zone.id,
              }
            : {}),
        },
      })
      expectStatus(status, 201, `checkout order (body: ${JSON.stringify(body)?.slice(0, 300)})`)
      if (!body.data?.order?.orderNumber || !body.data?.order?.id) throw new Error('checkout: missing id/orderNumber')
      return body.data.order
    }

    const cartPut = (await requestAs(customerCookie, '/customer/cart', {
      method: 'PUT',
      body: { items: [{ productId, quantity: 1 }] },
    }))
    expectStatus(cartPut.status, 200, 'customer cart replace')
    console.log('PASS customer cart replace (DB-backed cart for checkout)')

    const myOrder = await checkoutAs(customerCookie, undefined, 'E2E Account Customer Renamed')
    createdOrderIds.push(myOrder.id)
    const guestOrder = await checkoutAs(undefined, randomUUID(), 'E2E Guest Customer')
    createdOrderIds.push(guestOrder.id)

    const myOrders = (await requestAs(customerCookie, '/orders')).body.data.orders
    if (!Array.isArray(myOrders) || !myOrders.some((o: any) => o.id === myOrder.id)) {
      throw new Error('order list: placed order missing')
    }
    if (myOrder.paymentStatus !== 'PENDING') throw new Error(`order: expected PENDING, got ${myOrder.paymentStatus}`)
    console.log('PASS customer checkout (bank transfer → PENDING) + orders list')

    const guestTrack = (await requestAs(undefined, '/orders/guest/track', {
      method: 'POST',
      body: { orderNumber: guestOrder.orderNumber, contact: generatedEmail('checkout') },
    }))
    expectStatus(guestTrack.status, 200, 'guest order tracking')
    console.log('PASS guest checkout (guest tracking resolves by order number + email)')

    const passwordUpdate = (await requestAs(customerCookie, '/auth/customer/password', {
      method: 'PATCH',
      body: { currentPassword: password, newPassword: 'E2e_Test_New_7654321!', confirmPassword: 'E2e_Test_New_7654321!' },
    }))
    expectStatus(passwordUpdate.status, 200, 'change password')
    await loginCustomer(customer.email, 'E2e_Test_New_7654321!')
    console.log('PASS change password (old rejected-path replaced; new password logs in)')

    console.log('\nACCOUNT + CHECKOUT E2E: ALL CHECKS PASSED')
    process.exitCode = 0
  } catch (error) {
    console.error('\nACCOUNT + CHECKOUT E2E: FAILED', error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    for (const id of [...new Set(createdOrderIds)]) await prisma.order.deleteMany({ where: { id } }).catch(() => undefined)
    for (const id of createdProductIds) await prisma.product.deleteMany({ where: { id } }).catch(() => undefined)
    for (const id of createdUserIds) await prisma.user.deleteMany({ where: { id } }).catch(() => undefined)
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } }).catch(() => undefined)
    closeDatabase()
  }
}

const server = app.listen(0, '127.0.0.1', () => {
  void main().finally(() => server.close())
})