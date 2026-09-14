import { request } from './api'

export type ContactMessageStatus = 'NEW' | 'RESOLVED'

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: ContactMessageStatus
  createdAt: string
}

export interface AdminContactMessage extends ContactMessage {
  userId: string | null
  updatedAt: string
}

export interface CreateContactMessageInput {
  requestKey: string
  name: string
  email: string
  subject: string
  message: string
}

interface CreateContactMessageResponse {
  success: true
  message: string
  data: { contactMessage: ContactMessage }
}

interface AdminContactMessageResponse {
  success: true
  message?: string
  data: { contactMessage: AdminContactMessage }
}

export interface AdminContactMessagesPage {
  contactMessages: AdminContactMessage[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface AdminContactMessagesResponse {
  success: true
  data: AdminContactMessagesPage
}

export interface AdminContactMessagesQuery {
  search?: string
  status?: ContactMessageStatus
  sort?: 'newest' | 'oldest'
  page?: number
  pageSize?: number
}

export async function createContactMessage(input: CreateContactMessageInput): Promise<ContactMessage> {
  const response = await request<CreateContactMessageResponse>('/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data.contactMessage
}

export async function getAdminContactMessages(query: AdminContactMessagesQuery = {}): Promise<AdminContactMessagesPage> {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const response = await request<AdminContactMessagesResponse>(`/admin/contact${params.size ? `?${params.toString()}` : ''}`)
  return response.data
}

export async function updateAdminContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<AdminContactMessage> {
  const response = await request<AdminContactMessageResponse>(`/admin/contact/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  return response.data.contactMessage
}

export async function deleteAdminContactMessage(id: string): Promise<void> {
  await request<{ success: true }>(`/admin/contact/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}