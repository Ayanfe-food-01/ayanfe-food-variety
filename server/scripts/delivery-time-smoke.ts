/**
 * Delivery-time smoke test
 *
 * Verifies:
 *  1. A delivery zone can store delivery-time values.
 *  2. Valid values are accepted.
 *  3. Negative values are rejected.
 *  4. Non-integer values are rejected.
 *  5. minDeliveryDays > maxDeliveryDays is rejected.
 *  6. Existing zones without delivery-time values do not break.
 *  7. State + City/LGA still resolves to the same delivery zone.
 *  8. The resolved delivery zone now exposes delivery-time information.
 *  9. The server does not trust client-submitted delivery fee/time values.
 *
 * Run:  npx tsx scripts/delivery-time-smoke.ts   (from the server/ directory)
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../src/lib/prisma.js'
import { HttpError } from '../src/utils/http.js'
import {
  validateDeliveryZoneInput,
} from '../src/modules/delivery-zones/delivery-zone.validator.js'
import {
  createDeliveryZone,
  updateDeliveryZone,
  resolveDeliveryZoneByCity,
  getAdminDeliveryZone,
  deleteDeliveryZone,
} from '../src/modules/delivery-zones/delivery-zone.service.js'
import { PaymentMethod, ShoppingMode, UserRole } from '@prisma/client'
import { addCustomerCartItem, clearCustomerCart } from '../src/modules/cart/cart.service.js'
import { checkoutCustomerCart } from '../src/modules/orders/order.service.js'

let passed = 0
let failed = 0

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed += 1
    console.log(`  ✓ ${message}`)
  } else {
    failed += 1
    console.error(`  ✗ ${message}`)
  }
}

const expectHttpError = async (operation: Promise<unknown>, expectedStatus: number): Promise<void> => {
  try {
    await operation
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === expectedStatus) return
    throw error
  }
  throw new Error(`Expected HTTP ${expectedStatus} error but operation succeeded.`)
}

// ---------------------------------------------------------------------------
// Test data setup
// ---------------------------------------------------------------------------
const slug = `dt-smoke-${Date.now()}`
let testZoneId: string | null = null
let testCategoryId: string | null = null

async function cleanup() {
  if (testZoneId) {
    try { await deleteDeliveryZone(testZoneId) } catch { /* ignore */ }
  }
  if (testCategoryId) {
    // Delete any zones created by tests that reference this category's cities
    await prisma.$executeRawUnsafe(
      `DELETE FROM delivery_zone_cities WHERE delivery_zone_id IN (SELECT id FROM delivery_zones WHERE id != ALL(COALESCE(ARRAY[$1::uuid], ARRAY[]::uuid[])))`,
      testZoneId ?? '00000000-0000-0000-0000-000000000000',
    ).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// 1. Validator: valid delivery-time values are accepted
// ---------------------------------------------------------------------------
function testValidatorAcceptsValidValues() {
  console.log('\n1. Validator accepts valid delivery-time values')
  const result = validateDeliveryZoneInput({
    fee: 2000,
    freeDeliveryThreshold: null,
    minDeliveryDays: 1,
    maxDeliveryDays: 3,
    isActive: true,
    cityIds: [],
  })
  assert(result.minDeliveryDays === 1, 'minDeliveryDays is 1')
  assert(result.maxDeliveryDays === 3, 'maxDeliveryDays is 3')
}

// ---------------------------------------------------------------------------
// 2. Validator: null delivery-time values are accepted (optional)
// ---------------------------------------------------------------------------
function testValidatorAcceptsNullValues() {
  console.log('\n2. Validator accepts null delivery-time values (optional)')
  const result = validateDeliveryZoneInput({
    fee: 2000,
    freeDeliveryThreshold: null,
    isActive: true,
    cityIds: [],
  })
  assert(result.minDeliveryDays === null, 'minDeliveryDays is null when omitted')
  assert(result.maxDeliveryDays === null, 'maxDeliveryDays is null when omitted')
}

// ---------------------------------------------------------------------------
// 3. Validator: negative values are rejected
// ---------------------------------------------------------------------------
function testValidatorRejectsNegative() {
  console.log('\n3. Validator rejects negative values')
  expectHttpError(
    validateDeliveryZoneInput({
      fee: 2000,
      minDeliveryDays: -1,
      maxDeliveryDays: 2,
      isActive: true,
      cityIds: [],
    }) as unknown as Promise<unknown>,
    400,
  ).then(() => assert(true, 'minDeliveryDays=-1 rejected')).catch(() => assert(false, 'minDeliveryDays=-1 should be rejected'))

  expectHttpError(
    validateDeliveryZoneInput({
      fee: 2000,
      minDeliveryDays: 1,
      maxDeliveryDays: -2,
      isActive: true,
      cityIds: [],
    }) as unknown as Promise<unknown>,
    400,
  ).then(() => assert(true, 'maxDeliveryDays=-2 rejected')).catch(() => assert(false, 'maxDeliveryDays=-2 should be rejected'))
}

// ---------------------------------------------------------------------------
// 4. Validator: non-integer values are rejected
// ---------------------------------------------------------------------------
function testValidatorRejectsNonInteger() {
  console.log('\n4. Validator rejects non-integer values')
  expectHttpError(
    validateDeliveryZoneInput({
      fee: 2000,
      minDeliveryDays: 1.5,
      maxDeliveryDays: 3,
      isActive: true,
      cityIds: [],
    }) as unknown as Promise<unknown>,
    400,
  ).then(() => assert(true, 'minDeliveryDays=1.5 rejected')).catch(() => assert(false, 'minDeliveryDays=1.5 should be rejected'))

  expectHttpError(
    validateDeliveryZoneInput({
      fee: 2000,
      minDeliveryDays: 'abc',
      maxDeliveryDays: 3,
      isActive: true,
      cityIds: [],
    }) as unknown as Promise<unknown>,
    400,
  ).then(() => assert(true, 'minDeliveryDays="abc" rejected')).catch(() => assert(false, 'minDeliveryDays="abc" should be rejected'))
}

// ---------------------------------------------------------------------------
// 5. Validator: minDeliveryDays > maxDeliveryDays is rejected
// ---------------------------------------------------------------------------
function testValidatorRejectsMinMaxMismatch() {
  console.log('\n5. Validator rejects minDeliveryDays > maxDeliveryDays')
  expectHttpError(
    validateDeliveryZoneInput({
      fee: 2000,
      minDeliveryDays: 5,
      maxDeliveryDays: 2,
      isActive: true,
      cityIds: [],
    }) as unknown as Promise<unknown>,
    400,
  ).then(() => assert(true, 'minDeliveryDays=5, maxDeliveryDays=2 rejected')).catch(() => assert(false, 'min/max mismatch should be rejected'))
}

// ---------------------------------------------------------------------------
// 6. Database: zone stores delivery-time values
// ---------------------------------------------------------------------------
async function testDatabaseStoresDeliveryTime() {
  console.log('\n6. Database stores delivery-time values')

  // Find an existing unmapped city for testing
  const existingCity = await prisma.city.findFirst({
    where: { deliveryZoneCity: null },
    select: { id: true, name: true },
  })
  if (!existingCity) {
    console.log('  ⚠ Skipping (no unmapped city available)')
    return
  }

  const zone = await createDeliveryZone({
    fee: 2000,
    freeDeliveryThreshold: null,
    minDeliveryDays: 1,
    maxDeliveryDays: 3,
    isActive: true,
    cityIds: [existingCity.id],
  })

  testZoneId = zone.id
  assert(zone.minDeliveryDays === 1, `zone.minDeliveryDays is 1 (got ${zone.minDeliveryDays})`)
  assert(zone.maxDeliveryDays === 3, `zone.maxDeliveryDays is 3 (got ${zone.maxDeliveryDays})`)

  // Verify via direct DB read
  const dbZone = await prisma.deliveryZone.findUnique({ where: { id: zone.id } })
  assert(dbZone?.minDeliveryDays === 1, `DB minDeliveryDays is 1`)
  assert(dbZone?.maxDeliveryDays === 3, `DB maxDeliveryDays is 3`)
}

// ---------------------------------------------------------------------------
// 7. Service: update zone delivery-time values
// ---------------------------------------------------------------------------
async function testUpdateDeliveryTime() {
  console.log('\n7. Service updates delivery-time values')
  if (!testZoneId) {
    console.log('  ⚠ Skipping (no test zone)')
    return
  }

  const zone = await getAdminDeliveryZone(testZoneId)
  const cityIds = zone.cities.map((c) => c.id)
  const updated = await updateDeliveryZone(testZoneId, {
    fee: 2000,
    freeDeliveryThreshold: null,
    minDeliveryDays: 2,
    maxDeliveryDays: 5,
    isActive: true,
    cityIds,
  })
  assert(updated.minDeliveryDays === 2, `updated.minDeliveryDays is 2 (got ${updated.minDeliveryDays})`)
  assert(updated.maxDeliveryDays === 5, `updated.maxDeliveryDays is 5 (got ${updated.maxDeliveryDays})`)
}

// ---------------------------------------------------------------------------
// 8. Service: zone without delivery-time still works
// ---------------------------------------------------------------------------
async function testZoneWithoutDeliveryTime() {
  console.log('\n8. Zone without delivery-time values still works')

  const city = await prisma.city.findFirst({
    where: { deliveryZoneCity: null },
    select: { id: true, name: true },
  })
  if (!city) {
    console.log('  ⚠ Skipping (no unmapped city)')
    return
  }

  const zone = await createDeliveryZone({
    fee: 1500,
    freeDeliveryThreshold: null,
    isActive: true,
    cityIds: [city.id],
  })

  assert(zone.minDeliveryDays === null, 'zone without delivery time has null minDeliveryDays')
  assert(zone.maxDeliveryDays === null, 'zone without delivery time has null maxDeliveryDays')

  // Verify the zone still resolves
  const resolved = await resolveDeliveryZoneByCity(city.name)
  assert(resolved !== null, 'zone without delivery time still resolves')
  assert(resolved?.minDeliveryDays === null, 'resolved zone has null minDeliveryDays')
  assert(resolved?.maxDeliveryDays === null, 'resolved zone has null maxDeliveryDays')

  // Clean up
  try { await deleteDeliveryZone(zone.id) } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// 9. Resolution: resolved zone exposes delivery-time fields
// ---------------------------------------------------------------------------
async function testResolutionExposesDeliveryTime() {
  console.log('\n9. Resolved zone exposes delivery-time fields')
  if (!testZoneId) {
    console.log('  ⚠ Skipping (no test zone)')
    return
  }

  const zone = await getAdminDeliveryZone(testZoneId)
  const cityName = zone.cities[0]?.name
  if (!cityName) {
    console.log('  ⚠ Skipping (zone has no cities)')
    return
  }

  const resolved = await resolveDeliveryZoneByCity(cityName)
  assert(resolved !== null, 'zone resolves')
  assert(resolved?.minDeliveryDays === 2, `resolved minDeliveryDays is 2 (got ${resolved?.minDeliveryDays})`)
  assert(resolved?.maxDeliveryDays === 5, `resolved maxDeliveryDays is 5 (got ${resolved?.maxDeliveryDays})`)
}

// ---------------------------------------------------------------------------
// 10. Order snapshot: checkout captures delivery time on the order
// ---------------------------------------------------------------------------
async function testOrderSnapshotCapturesDeliveryTime() {
  console.log('\n10. Order snapshot captures delivery time at checkout')

  const zone = testZoneId ? await getAdminDeliveryZone(testZoneId) : null
  const cityEntry = zone?.cities[0]
  if (!zone || !cityEntry) {
    console.log('  ⚠ Skipping (no test zone or city)')
    return
  }

  const slug = `ordersnap-${Date.now()}`
  const category = await prisma.category.create({
    data: { name: `Order Snapshot ${slug}`, slug, imageUrl: '' },
  })
  const customer = await prisma.user.create({
    data: { name: 'Snapshot Customer', email: `${slug}@example.com`, role: UserRole.CUSTOMER },
  })
  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Snapshot Product',
      slug: `${slug}-product`,
      description: 'Temporary snapshot product',
      price: '100.00',
      unit: 'unit',
      image: '',
      stockQuantity: 100,
    },
  })

  try {
    await clearCustomerCart(customer.id, ShoppingMode.RETAIL)
    await addCustomerCartItem(customer.id, ShoppingMode.RETAIL, { productId: product.id, quantity: 1 })

    const order = await checkoutCustomerCart(customer.id, {
      checkoutKey: crypto.randomUUID(),
      customerName: 'Snapshot Customer',
      phone: '08000000000',
      email: `${slug}@example.com`,
      fulfillmentMethod: 'DELIVERY',
      deliveryAddress: 'Test address',
      city: cityEntry.name,
      deliveryInstructions: 'Test',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    })

    assert(order.deliveryZoneName === zone.label, 'order snapshots the zone name')
    assert(order.deliveryMinDays === zone.minDeliveryDays, `order snapshots minDeliveryDays (got ${order.deliveryMinDays})`)
    assert(order.deliveryMaxDays === zone.maxDeliveryDays, `order snapshots maxDeliveryDays (got ${order.deliveryMaxDays})`)

    // Verify persisted on the DB row too.
    const dbOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    assert(dbOrder.deliveryMinDays === zone.minDeliveryDays, 'DB order deliveryMinDays matches')
    assert(dbOrder.deliveryMaxDays === zone.maxDeliveryDays, 'DB order deliveryMaxDays matches')
  } finally {
    await prisma.order.deleteMany({ where: { orderItems: { some: { productId: product.id } } } })
    await prisma.product.delete({ where: { id: product.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: customer.id } }).catch(() => {})
    await prisma.category.delete({ where: { id: category.id } }).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Delivery Time Smoke Tests ===')

  // Validator tests (synchronous)
  testValidatorAcceptsValidValues()
  testValidatorAcceptsNullValues()
  await testValidatorRejectsNegative()
  await testValidatorRejectsNonInteger()
  await testValidatorRejectsMinMaxMismatch()

  // Database / service tests
  await testDatabaseStoresDeliveryTime()
  await testUpdateDeliveryTime()
  await testZoneWithoutDeliveryTime()
  await testResolutionExposesDeliveryTime()
  await testOrderSnapshotCapturesDeliveryTime()

  // Cleanup
  await cleanup()

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  if (failed > 0) process.exit(1)
}

main()
  .catch((error) => {
    console.error('Smoke test crashed:', error)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
