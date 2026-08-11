import 'dotenv/config'
import { env } from '../src/config/env.js'
import { closeDatabase, verifyDatabaseConnection } from '../src/lib/prisma.js'

const run = async () => {
  console.info('Ayanfe API configuration check')
  console.info(`- Database URL: ${env.databaseUrl ? 'configured' : 'missing'}`)

  try {
    await verifyDatabaseConnection()
    console.info('- Database connection: reachable')
  } catch (error: unknown) {
    console.error('- Database connection: failed')
    throw error
  }

  const cloudinaryConfigured = Boolean(
    env.cloudinary.cloudName
      && env.cloudinary.apiKey
      && env.cloudinary.apiSecret,
  )
  console.info(`- Cloudinary image storage: ${cloudinaryConfigured ? 'configured' : 'missing credentials'}`)
  console.info(`- Session secret: ${env.sessionSecret ? 'configured' : 'missing'}`)
  console.info('Configuration check passed.')
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })