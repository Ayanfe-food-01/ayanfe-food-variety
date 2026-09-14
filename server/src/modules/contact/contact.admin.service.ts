import { type ContactMessageStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { HttpError } from '../../utils/http.js'
import { buildSearchWhere, type SearchFieldConfig } from '../../utils/search.js'
import { toAdminContactMessage } from './contact.mapper.js'
import type { AdminContactMessage, AdminContactMessagePage, AdminContactMessageQuery } from './contact.types.js'

const ADMIN_CONTACT_SEARCH_FIELDS: SearchFieldConfig[] = [
  { path: 'name', primary: true, weight: 2 },
  { path: 'email', primary: true, weight: 2 },
  { path: 'subject', weight: 0.8 },
  { path: 'message', weight: 0.5 },
]

export async function listAdminContactMessages(query: AdminContactMessageQuery): Promise<AdminContactMessagePage> {
  const where = {
    ...(buildSearchWhere(query.search, ADMIN_CONTACT_SEARCH_FIELDS) ?? {}),
    ...(query.status ? { status: query.status } : {}),
  }

  const [total, contactMessages] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    contactMessages: contactMessages.map(toAdminContactMessage),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  }
}

export async function updateAdminContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<AdminContactMessage> {
  const existing = await prisma.contactMessage.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!existing) throw new HttpError(404, 'Contact message not found.')
  if (existing.status === status) {
    const message = await prisma.contactMessage.findUnique({ where: { id } })
    if (!message) throw new HttpError(404, 'Contact message not found.')
    return toAdminContactMessage(message)
  }

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: { status },
  })
  return toAdminContactMessage(updated)
}

export async function deleteAdminContactMessage(id: string): Promise<void> {
  const existing = await prisma.contactMessage.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) throw new HttpError(404, 'Contact message not found.')
  await prisma.contactMessage.delete({ where: { id } })
}