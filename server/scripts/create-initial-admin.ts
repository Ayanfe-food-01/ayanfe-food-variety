import 'dotenv/config'
import { createInitialAdmin } from '../src/modules/auth/auth.service.js'

const name = process.env.ADMIN_INITIAL_NAME?.trim()
const email = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_INITIAL_PASSWORD
const forceReset = process.env.ADMIN_INITIAL_FORCE_RESET === 'true'

if (!name || !email || !password) {
  throw new Error(
    'ADMIN_INITIAL_NAME, ADMIN_INITIAL_EMAIL, and ADMIN_INITIAL_PASSWORD must be provided through the environment.',
  )
}

if (password.length < 12) {
  throw new Error('ADMIN_INITIAL_PASSWORD must be at least 12 characters.')
}

const result = await createInitialAdmin({ name, email, password, forceReset })
console.info(`Initial admin setup: ${result}.`)