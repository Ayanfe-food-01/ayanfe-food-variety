import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma.js'

/**
 * Admin audit trail: WHO (admin identity), WHAT (event/resource), WHEN
 * (created_at), and WHERE it came from. Never logs passwords, tokens, or
 * request bodies. Failures are swallowed so auditing can never break a request.
 */

export interface AdminAuditInput {
  adminUserId?: string
  adminEmail?: string
  event: string
  resource?: string
  resourceId?: string
  method?: string
  path?: string
  statusCode?: number
  ipAddress?: string
  metadata?: Prisma.InputJsonValue
}

export const recordAdminAudit = async (input: AdminAuditInput): Promise<void> => {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId ?? null,
        adminEmail: input.adminEmail ?? null,
        event: input.event,
        resource: input.resource ?? null,
        resourceId: input.resourceId ?? null,
        method: input.method ?? null,
        path: input.path ?? null,
        statusCode: input.statusCode ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    })
  } catch (error: unknown) {
    console.error(JSON.stringify({
      event: 'admin_audit_write_failed',
      auditEvent: input.event,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }))
  }
}

export const ADMIN_AUDIT_EVENTS = {
  LOGIN_SUCCESS: 'admin.login_success',
  LOGIN_FAILED: 'admin.login_failed',
  LOGOUT: 'admin.logout',
  SESSION_EXPIRED: 'admin.session_expired',
  REQUEST: 'admin.request',
} as const