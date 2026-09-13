import { UserRole } from '@prisma/client'
import { prisma, closeDatabase } from '../src/config/prisma.js'
import { hashPassword } from '../src/modules/auth/auth.service.js'

// Seeds a password-only, email-verified customer used by the UI browser smoke
// (account + checkout flows). Idempotent on the shared email per environment.
const EMAIL = process.env.UI_TEST_CUSTOMER_EMAIL || 'ui-browser-smoke@example.com'
const PASSWORD = process.env.UI_TEST_CUSTOMER_PASSWORD || 'UIBrowserTest!2345'

await prisma.user.deleteMany({ where: { email: EMAIL } }).catch(() => undefined)
const user = await prisma.user.create({
  data: {
    email: EMAIL,
    passwordHash: await hashPassword(PASSWORD),
    role: UserRole.CUSTOMER,
    name: 'Browser Smoke Tester',
    phone: '+2348010020304',
    emailVerified: true,
    shoppingMode: 'RETAIL',
  },
})
console.log(`Seeded UI test customer ${EMAIL} (${user.id})`)
await closeDatabase()