import type { RequestHandler } from 'express'
import {
  getAdminContactInformation,
  getAdminStoreInformation,
  getPublicStoreSettings,
  updateAdminContactInformation,
  updateAdminStoreInformation,
} from './settings.service.js'
import {
  validateContactInformationInput,
  validateStoreInformationInput,
} from './settings.validator.js'

export const getAdminStoreInformationController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { settings: await getAdminStoreInformation() } })
}

export const updateAdminStoreInformationController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Store information updated.',
    data: { settings: await updateAdminStoreInformation(validateStoreInformationInput(request.body)) },
  })
}

export const getAdminContactInformationController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: { settings: await getAdminContactInformation() } })
}

export const updateAdminContactInformationController: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    message: 'Contact information updated.',
    data: { settings: await updateAdminContactInformation(validateContactInformationInput(request.body)) },
  })
}

export const getPublicStoreSettingsController: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: await getPublicStoreSettings() })
}