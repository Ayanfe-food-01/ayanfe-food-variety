import type { RequestHandler } from 'express'
import { recordAdminAudit, ADMIN_AUDIT_EVENTS } from '../audit/audit.service.js'

/**
 * Records every mutating admin request (WHO/WHAT/WHEN/WITH WHAT OUTCOME).
 *
 * Only POST/PATCH/PUT/DELETE are captured so the log stays meaningful and
 * bounded; read-only GETs are already covered above by activity touch timestamps.
 * The request body is intentionally excluded (no secrets); the admin path and
 * query string carry the resource identifiers.
 */
export const adminRequestAuditMiddleware: RequestHandler = (request, response, next) => {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
    next()
    return
  }

  const admin = request.authenticatedUser
  const startedAt = Date.now()

  response.once('finish', () => {
    void recordAdminAudit({
      adminUserId: admin?.id,
      adminEmail: admin?.email,
      event: ADMIN_AUDIT_EVENTS.REQUEST,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      ipAddress: request.ip,
      metadata: { durationMs: Date.now() - startedAt },
    })
  })

  next()
}