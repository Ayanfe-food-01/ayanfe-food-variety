let bodyScrollLockCount = 0
let bodyScrollLockSnapshot: {
  scrollY: number
  overflow: string
  position: string
  top: string
  width: string
  paddingRight: string
} | null = null

export function createRequestKey(): string {
  const browserCrypto = globalThis.crypto
  if (typeof browserCrypto?.randomUUID === 'function') {
    return browserCrypto.randomUUID()
  }

  if (typeof browserCrypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    browserCrypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    return Array.from(bytes, (byte, index) => {
      const value = byte.toString(16).padStart(2, '0')
      return [4, 6, 8, 10].includes(index) ? `-${value}` : value
    }).join('')
  }

  return `request-${Date.now().toString(36)}-${String(++fallbackRequestCounter).padStart(4, '0')}`
}

let fallbackRequestCounter = 0

export function localDateTimeToIso(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) {
    throw new Error('Please enter a valid transfer date and time.')
  }

  const [, year, month, day, hour, minute] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  )
  if (Number.isNaN(date.getTime())) {
    throw new Error('Please enter a valid transfer date and time.')
  }
  return date.toISOString()
}

export function lockBodyScroll(): () => void {
  if (bodyScrollLockCount === 0) {
    const body = document.body
    const scrollY = window.scrollY
    bodyScrollLockSnapshot = {
      scrollY,
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
  }

  bodyScrollLockCount += 1
  let released = false

  return () => {
    if (released) return
    released = true
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
    if (bodyScrollLockCount > 0 || !bodyScrollLockSnapshot) return

    const snapshot = bodyScrollLockSnapshot
    bodyScrollLockSnapshot = null
    const body = document.body
    body.style.overflow = snapshot.overflow
    body.style.position = snapshot.position
    body.style.top = snapshot.top
    body.style.width = snapshot.width
    body.style.paddingRight = snapshot.paddingRight
    window.scrollTo(0, snapshot.scrollY)
  }
}