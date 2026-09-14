import type { RequestHandler } from 'express'
import { createContactMessage } from './contact.service.js'
import { validateCreateContactMessageInput } from './contact.validator.js'

export const createContactMessageController: RequestHandler = async (request, response) => {
  const { contactMessage, created } = await createContactMessage(
    request.authenticatedUser,
    validateCreateContactMessageInput(request.body),
  )
  response.status(created ? 201 : 200).json({
    success: true,
    message: created
      ? "Your message has been sent. We'll get back to you as soon as we can."
      : 'This message has already been received.',
    data: { contactMessage },
  })
}