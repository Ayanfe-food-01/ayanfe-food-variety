import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { Prisma } from '@prisma/client'
import { env } from '../src/config/env.js'
import { prisma, closeDatabase } from '../src/lib/prisma.js'

// Test-data cleanup for orders, payments and notifications only.
//
// Safe-guards:
//  - Shows row counts first and requires an explicit "DELETE" confirmation.
//  - Runs inside a single transaction; any failure rolls back everything.
//  - Deletes child rows before parents so referential integrity is respected.
//  - Touches ONLY the tables below. Products, categories, banners,
//    testimonials, reviews, admin accounts, settings, quotes, carts, sessions
//    and wishlists are never deleted.

const CONFIRMATION = 'DELETE'

// Child tables first, parent `orders` last.
const DELETION_ORDER = [
  'payment_audit_events',
  'admin_notification_reads',
  'order_items',
  'order_payments',
  'order_status_history',
  'payment_submissions',
  'payments',
  'admin_notifications',
  'orders',
] as const

type TransactionClient = Prisma.TransactionClient

const countRows = async (client: TransactionClient, table: string): Promise<number> => {
  const rows = await client.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT count(*)::bigint AS count FROM "${table}"`,
  )
  return Number(rows[0]?.count ?? 0)
}

const deleteAllRows = async (client: TransactionClient, table: string): Promise<number> =>
  client.$executeRawUnsafe(`DELETE FROM "${table}"`)

const printTable = (title: string, rows: Array<[string, string | number]>): void => {
  const width = Math.max(title.length, ...rows.map(([label]) => label.length))
  console.log(`${title.padEnd(width)}  count`)
  console.log('-'.repeat(width + 7))
  for (const [label, value] of rows) {
    console.log(`${label.padEnd(width)}  ${String(value)}`)
  }
}

const databaseDescriptor = (): string => {
  const url = new URL(env.databaseUrl)
  return `${url.hostname}${url.pathname}`
}

const run = async () => {
  console.log(`Target database: ${databaseDescriptor()}`)
  console.log('')

  // ---- Before counts (read-only) ------------------------------------------
  console.log('Rows that will be deleted:')
  const before = new Map<string, number>()
  for (const table of DELETION_ORDER) {
    before.set(table, await countRows(prisma, table))
  }
  const orderCount = before.get('orders') ?? 0
  const paymentCount = before.get('payments') ?? 0
  const notificationCount = before.get('admin_notifications') ?? 0
  printTable('table', DELETION_ORDER.map((table) => [table, before.get(table) ?? 0]))

  const reviewBlockerCount = await countRows(prisma, 'reviews')

  console.log('')
  console.log('Summary:')
  console.log(`- Orders: ${orderCount} (${before.get('order_items') ?? 0} order items, ${before.get('order_status_history') ?? 0} status history entries, ${before.get('order_payments') ?? 0} payment snapshots)`)
  console.log(`- Payments: ${paymentCount} gateway payments, ${before.get('payment_submissions') ?? 0} payment submissions, ${before.get('payment_audit_events') ?? 0} audit events`)
  console.log(`- Notifications: ${notificationCount} notifications (${before.get('admin_notification_reads') ?? 0} read entries)`)
  console.log('')

  if (reviewBlockerCount > 0) {
    console.error(`BLOCKED: ${reviewBlockerCount} review(s) reference orders/order items.`)
    console.error('Reviews are outside this script\'s scope and their foreign keys use Restrict, so orders they reference cannot be deleted.')
    console.error('Remove or detach those reviews first (outside this script), then re-run.')
    process.exitCode = 1
    return
  }

  console.log('Plan: executes the following inside a single transaction, in this order,')
  console.log(`then deletes their parent "orders" last. No schema changes, no sequence resets.`)
  console.log('')
  console.log(DELETION_ORDER.map((table, index) => `  ${index + 1}. DELETE FROM "${table}"  (${before.get(table) ?? 0} rows)`).join('\n'))
  console.log('')

  // ---- Confirmation ---------------------------------------------------------
  let confirmed = process.env.SKIP_CONFIRM === '1'
  if (!confirmed) {
    const rl = createInterface({ input: stdin, output: stdout })
    try {
      const answer = await rl.question(`Type exactly "${CONFIRMATION}" to permanently delete this data (any other input cancels): `)
      confirmed = answer.trim() === CONFIRMATION
    } catch {
      confirmed = false
    } finally {
      rl.close()
    }
  }

  if (!confirmed) {
    console.log('Cancelled. No rows were deleted.')
    return
  }

  console.log('')
  console.log('Confirmed. Deleting…')

  // ---- Deletion + after counts in one transaction --------------------------
  let deleted: Record<string, number> | null = null
  let after: Record<string, number> | null = null

  try {
    await prisma.$transaction(async (tx) => {
      deleted = {}
      for (const table of DELETION_ORDER) {
        deleted[table] = await deleteAllRows(tx, table)
      }
      after = {}
      for (const table of DELETION_ORDER) {
        after[table] = await countRows(tx, table)
      }
      // Any exception raised above rolls back the whole transaction, leaving
      // the database untouched.
    })
  } catch (error) {
    console.error('')
    console.error('Deletion failed and was rolled back. No rows were deleted.')
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
    return
  }

  const deletedRows = deleted ?? {}
  const afterRows = after ?? {}

  console.log('')
  console.log('Deleted rows:')
  printTable('table', DELETION_ORDER.map((table) => [table, deletedRows[table] ?? 0]))
  console.log('')
  console.log('Remaining rows after deletion:')
  printTable('table', DELETION_ORDER.map((table) => [table, afterRows[table] ?? 0]))
  console.log('')
  console.log(`Orders: ${afterRows.orders ?? 0}, Payments: ${afterRows.payments ?? 0}, Notifications: ${afterRows.admin_notifications ?? 0}.`)
  console.log('Done.')
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })