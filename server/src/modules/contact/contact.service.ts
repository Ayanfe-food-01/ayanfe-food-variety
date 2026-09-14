import { AdminNotificationType, ContactMessageStatus } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { createAdminNotification } from '../notifications/notification.service.js'
import { getStoreSettings } from '../settings/settings.mapper.js'
import { notifyContactMessageReceived } from './contact.email.js'
import { toContactMessageResponse } from './contact.mapper.js'
import type { ApplyContactMessageResult, CreateContactMessageInput } from './contact.types.js'

/**
 * Stores a contact form message. The request key (generated per form load)
 * dedupes accidental resubmits so the same submission resolves to one row. A
 * new message also produces an admin bell notification, and the owner is
 * emailed best-effort — both failures are non-fatal.
 */
export async function createContactMessage(
  user: AuthenticatedUser | undefined,
  input: CreateContactMessageInput,
): Promise<ApplyContactMessageResult> {
  let result: ApplyContactMessageResult | null = null
  let createdId: string | null = null

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.contactMessage.findUnique({
      where: { requestKey: input.requestKey },
    })
    if (existing) {
      result = { contactMessage: toContactMessageResponse(existing), created: false }
      return
    }

    const contactMessage = await transaction.contactMessage.create({
      data: {
        requestKey: input.requestKey,
        userId: user?.id ?? null,
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        status: ContactMessageStatus.NEW,
      },
    })

    result = { contactMessage: toContactMessageResponse(contactMessage), created: true }
    createdId = contactMessage.id

    await createAdminNotification(transaction, {
      type: AdminNotificationType.NEW_CONTACT_MESSAGE,
      eventKey: `contact-message:${contactMessage.id}`,
      title: 'New contact message received',
      message: `${contactMessage.name} (${contactMessage.email}): ${contactMessage.subject || 'No subject'}.`,
      href: '/admin/contact',
    })
  })

  if (createdId) {
    const storedMessage = await prisma.contactMessage.findUnique({ where: { id: createdId } })
    if (storedMessage) {
      const settings = await getStoreSettings()
      await notifyContactMessageReceived(storedMessage, settings?.businessName || 'Ayanfe Food Variety', settings?.businessEmail ?? null)
    }
  }

  return result ?? { contactMessage: {} as ApplyContactMessageResult['contactMessage'], created: false }
}