import type { RequestHandler } from 'express'
import {
  deleteAdminContactMessage,
  listAdminContactMessages,
  updateAdminContactMessageStatus,
} from './contact.admin.service.js'
import { validContactMessageId, validContactStatus, validateAdminContactMessageQuery } from './contact.validator.js'

export const listAdminContactMessagesController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await listAdminContactMessages(
      validateAdminContactMessageQuery(request.query as Record<string, unknown>),
    ),
  })
}

export const updateAdminContactMessageStatusController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Contact message status updated.',
    data: {
      contactMessage: await updateAdminContactMessageStatus(
        validContactMessageId(request.params.id),
        validContactStatus(request.body && typeof request.body === 'object' ? (request.body as Record<string, unknown>).status : undefined),
      ),
    },
  })
}

export const deleteAdminContactMessageController: RequestHandler = async (request, response) => {
  await deleteAdminContactMessage(validContactMessageId(request.params.id))
  response.json({ success: true, message: 'Contact message deleted.' })
}