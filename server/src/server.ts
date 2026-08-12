import { app } from './app.js'
import { env } from './config/env.js'
import { closeDatabase, verifyDatabaseConnection } from './lib/prisma.js'

const start = async () => {
  await verifyDatabaseConnection()

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.info(`Ayanfe API listening on port ${env.port}`)
  })

  const shutdown = async (signal: string) => {
    console.info(`${signal} received, shutting down`)
    server.close(async () => {
      await closeDatabase()
      process.exit(0)
    })
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

start().catch((error: unknown) => {
  console.error('Unable to start Ayanfe API', error)
  process.exit(1)
})