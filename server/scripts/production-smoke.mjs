const apiOrigin = (process.env.SMOKE_API_URL || '').trim().replace(/\/+$/, '')
const frontendOrigin = (process.env.SMOKE_FRONTEND_ORIGIN || '').trim().replace(/\/+$/, '')

if (!apiOrigin) {
  console.error('Set SMOKE_API_URL to the deployed Render origin before running this check.')
  process.exit(1)
}

const checks = [
  { name: 'liveness', path: '/health', expectedStatus: 200 },
  { name: 'readiness', path: '/ready', expectedStatus: 200 },
  { name: 'public catalog', path: '/api/v1/categories', expectedStatus: 200 },
]

let failed = false

for (const check of checks) {
  const response = await fetch(`${apiOrigin}${check.path}`)
  const body = await response.text()
  const passed = response.status === check.expectedStatus
  console.log(`${passed ? 'PASS' : 'FAIL'} ${check.name}: ${response.status} ${body.slice(0, 180)}`)
  failed ||= !passed
}

if (frontendOrigin) {
  const response = await fetch(`${apiOrigin}/api/v1/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: frontendOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })
  const allowedOrigin = response.headers.get('access-control-allow-origin')
  const allowedCredentials = response.headers.get('access-control-allow-credentials')
  const passed = response.ok
    && allowedOrigin === frontendOrigin
    && allowedCredentials === 'true'
  console.log(
    `${passed ? 'PASS' : 'FAIL'} CORS: status=${response.status} `
    + `allow-origin=${allowedOrigin || 'none'} credentials=${allowedCredentials || 'none'}`,
  )
  failed ||= !passed
}

if (failed) process.exit(1)