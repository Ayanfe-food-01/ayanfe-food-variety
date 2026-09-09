import type { RequestHandler } from 'express'
import {
  createAdminWholesalePackage,
  deleteAdminWholesalePackage,
  listAdminWholesalePackages,
  reorderAdminWholesalePackages,
  toggleAdminWholesalePackageActive,
  updateAdminWholesalePackage,
} from './admin-wholesale.service.js'
import {
  parseWholesalePackageInput,
  validateWholesalePackageId,
  validateWholesalePackageReorderInput,
  validateWholesalePackageStatusInput,
} from './wholesale-package.validator.js'
import { validateAdminProductId } from './product.validator.js'

const routeParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

export const listAdminWholesalePackagesController: RequestHandler = async (request, response) => {
  const packages = await listAdminWholesalePackages(validateAdminProductId(routeParam(request.params.id)))
  response.json({ success: true, data: { packages } })
}

export const createAdminWholesalePackageController: RequestHandler = async (request, response) => {
  const productId = validateAdminProductId(routeParam(request.params.id))
  const pkg = await createAdminWholesalePackage(productId, parseWholesalePackageInput(request.body))
  response.status(201).json({ success: true, message: 'Wholesale package created.', data: { package: pkg } })
}

export const updateAdminWholesalePackageController: RequestHandler = async (request, response) => {
  const packageId = validateWholesalePackageId(routeParam(request.params.packageId))
  const pkg = await updateAdminWholesalePackage(packageId, parseWholesalePackageInput(request.body))
  response.json({ success: true, message: 'Wholesale package updated.', data: { package: pkg } })
}

export const updateAdminWholesalePackageStatusController: RequestHandler = async (request, response) => {
  const packageId = validateWholesalePackageId(routeParam(request.params.packageId))
  const isActive = validateWholesalePackageStatusInput(request.body)
  const pkg = await toggleAdminWholesalePackageActive(packageId, isActive)
  response.json({
    success: true,
    message: isActive ? 'Wholesale package activated.' : 'Wholesale package deactivated.',
    data: { package: pkg },
  })
}

export const reorderAdminWholesalePackagesController: RequestHandler = async (request, response) => {
  const productId = validateAdminProductId(routeParam(request.params.id))
  const packages = await reorderAdminWholesalePackages(productId, validateWholesalePackageReorderInput(request.body))
  response.json({ success: true, message: 'Wholesale package order updated.', data: { packages } })
}

export const deleteAdminWholesalePackageController: RequestHandler = async (request, response) => {
  await deleteAdminWholesalePackage(validateWholesalePackageId(routeParam(request.params.packageId)))
  response.json({ success: true, message: 'Wholesale package deleted.' })
}
