import type { RequestHandler } from 'express'

/**
 * Prevents authenticated admin responses from being stored in browser/proxy
 * caches so that back-button and browser-cache navigation can never resurface
 * admin data after logout or session expiry.
 */
export const adminNoStore: RequestHandler = (_request, response, next) => {
  response.set('Cache-Control', 'no-store, max-age=0')
  next()
}