import { createInitialAdmin } from '../../src/modules/auth/auth.service.js'

const name = (process.env.ADMIN_INITIAL_NAME ?? 'Ayanfe Food Variety Admin').trim()
const email = (process.env.ADMIN_EMAIL ?? process.env.ADMIN_INITIAL_EMAIL)?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_INITIAL_PASSWORD
const forceReset =
  process.env.ADMIN_SEED_FORCE_RESET === undefined || process.env.ADMIN_SEED_FORCE_RESET !== 'false'

if (!name || !email || !password) {
  throw new Error(
    'Seeding an admin requires ADMIN_EMAIL and ADMIN_PASSWORD in the environment (ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD are also accepted).',
  )
}

if (password.length < 12) {
  throw new Error('The admin password must be at least 12 characters.')
}

const result = await createInitialAdmin({ name, email, password, forceReset })
const loginUrl = process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL}/admin/login` : 'the admin login page'
console.info(`Admin seed: ${result}.`)
switch (result) {
  case 'created':
    console.info(`Created the admin account. Sign in at ${loginUrl} with ${email}.`)
    break
  case 'updated':
    console.info(`Reset the password for ${email} and revoked its previous sessions.`)
    break
  case 'exists':
    console.info(`An admin already exists for ${email}. Leave credentials unchanged by setting ADMIN_SEED_FORCE_RESET=false.`)
    break
}