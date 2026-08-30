import type { RequestHandler } from 'express'
import { getPublicCustomerStories } from './customer-stories.service.js'

export const getPublicCustomerStoriesController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: await getPublicCustomerStories() })
}