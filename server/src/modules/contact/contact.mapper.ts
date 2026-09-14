import type { ContactMessage as ContactMessageRow, ContactMessageStatus } from '@prisma/client'
import type { AdminContactMessage, ContactMessageResponse } from './contact.types.js'

/** Shared serializer for a single contact message. */
export const toContactMessageResponse = (message: ContactMessageRow): ContactMessageResponse => ({
  id: message.id,
  name: message.name,
  email: message.email,
  subject: message.subject,
  message: message.message,
  status: message.status,
  createdAt: message.createdAt.toISOString(),
})

/** Admin list serializer — includes the linked customer id and updatedAt. */
export const toAdminContactMessage = (message: ContactMessageRow): AdminContactMessage => ({
  id: message.id,
  userId: message.userId,
  name: message.name,
  email: message.email,
  subject: message.subject,
  message: message.message,
  status: message.status,
  createdAt: message.createdAt.toISOString(),
  updatedAt: message.updatedAt.toISOString(),
})

export type { ContactMessageRow, ContactMessageStatus }