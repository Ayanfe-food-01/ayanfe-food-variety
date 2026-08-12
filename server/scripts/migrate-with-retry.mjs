import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

const maxAttempts = 3
const retryDelaysMs = [5000, 10000]
const retryableMigrationFailure = /P1002|advisory lock|timed out trying to acquire/i
const prismaBinary = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
)

const runMigration = () => new Promise((resolve, reject) => {
  let errorOutput = ''
  const child = spawn(prismaBinary, ['migrate', 'deploy'], {
    env: {
      ...process.env,
       DATABASE_URL: process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL,
    },
    stdio: ['inherit', 'inherit', 'pipe'],
  })

  child.stderr.on('data', (chunk) => {
    errorOutput += chunk.toString()
    process.stderr.write(chunk)
  })

  child.once('error', reject)
  child.once('close', (code) => {
    resolve({
      code: code ?? 1,
      retryable: retryableMigrationFailure.test(errorOutput),
    })
  })
})

const main = async () => {
  try {
    await access(prismaBinary, constants.X_OK)
  } catch {
    throw new Error(`Prisma CLI was not found at ${prismaBinary}`)
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await runMigration()
    if (result.code === 0) return

    const canRetry = result.retryable && attempt < maxAttempts
    if (!canRetry) {
      process.exitCode = result.code
      return
    }

    const delayMs = retryDelaysMs[attempt - 1]
    console.warn(
      `Prisma migration hit a transient advisory-lock timeout; retrying in ${delayMs / 1000}s ` +
      `(attempt ${attempt + 1}/${maxAttempts}).`,
    )
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

main().catch((error) => {
  console.error('Unable to run Prisma migrations', error)
  process.exitCode = 1
})