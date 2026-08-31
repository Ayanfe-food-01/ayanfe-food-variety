import 'dotenv/config'
import { spawn } from 'node:child_process'

const commands = [
  ['client', ['--prefix', 'client', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5000']],
  ['server', ['--prefix', 'server', 'run', 'dev']],
]

const children = commands.map(([name, args]) => {
  const child = spawn('npm', args, {
    env: process.env,
    stdio: 'inherit',
  })
  child.on('exit', (code, signal) => {
    if (code && code !== 0) console.error(`${name} process exited with code ${code}.`)
    if (signal) console.error(`${name} process stopped by ${signal}.`)
  })
  return child
})

const shutdown = (signal) => {
  for (const child of children) {
    if (!child.killed) child.kill(signal)
  }
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))