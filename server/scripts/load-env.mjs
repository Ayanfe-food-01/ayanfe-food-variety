import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import dotenv from 'dotenv'

const envPath = fileURLToPath(new URL('../../.env', import.meta.url))
const loaded = dotenv.config({ path: envPath, quiet: true })

if (loaded.error) {
  console.warn(`Unable to load environment from ${envPath}: ${loaded.error.message}`)
}

const prismaBinary = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
)

const main = async () => {
  try {
    await access(prismaBinary, constants.X_OK)
  } catch {
    throw new Error(`Prisma CLI was not found at ${prismaBinary}`)
  }

  const child = spawn(prismaBinary, process.argv.slice(2), { stdio: 'inherit' })

  child.once('error', (error) => {
    console.error('Unable to run the Prisma CLI', error)
    process.exit(1)
  })
  child.once('close', (code) => {
    process.exitCode = code ?? 1
  })
}

main().catch((error) => {
  console.error('Unable to run the Prisma CLI', error)
  process.exitCode = 1
})