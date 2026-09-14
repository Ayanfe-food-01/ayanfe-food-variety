import type { ContactMessageStatus } from '@prisma/client'

/**
 * Payload accepted from the public contact form. The request key lets a resubmit
 * (e.g. browser refresh, re-tapped submit) resolve to the already stored message
 * instead of creating a duplicate.
 */
export interface CreateContactMessageInput {
  requestKey: string
  name: string
  email: string
  subject: string
  message: string
}

/** Public representation of a contact form message. */
export interface ContactMessageResponse {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: ContactMessageStatus
  createdAt: string
}

export interface AdminContactMessage extends ContactMessageResponse {
  userId: string | null
  subject: string
  updatedAt: string
}

export interface AdminContactMessageQuery {
  search?: string
  status?: ContactMessageStatus
  sort: 'newest' | 'oldest'
  page: number
  pageSize: number
}

export interface AdminContactMessagePage {
  contactMessages: AdminContactMessage[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface ApplyContactMessageResult {
  contactMessage: ContactMessageResponse
  created: boolean
}