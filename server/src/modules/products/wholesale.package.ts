import { HttpError } from '../../utils/http.js'

// A wholesale package (carton/case) is the atomic unit a wholesale buyer
// purchases. Buyers never buy loose units: they choose ONE package and then
// enter how many complete packages they want. unitsPerPackage records how many
// individual pieces are inside one package and price is the cost of ONE complete
// package — the source of truth for wholesale billing. Every price is re-derived
// from the database (never from the browser) at cart and checkout time.

export interface WholesalePackageShape {
  id: string
  productOptionId: string | null
  unitsPerPackage: number
  price: { toString(): string }
  isActive: boolean
}

export const assertWholesalePackageActive = (pkg: WholesalePackageShape | null | undefined): void => {
  if (!pkg) throw new HttpError(404, 'The selected wholesale package no longer exists.')
  if (pkg.unitsPerPackage < 1) throw new HttpError(409, 'The selected wholesale package is not valid.')
  if (!pkg.isActive) throw new HttpError(409, 'The selected wholesale package is no longer available.')
}

// The number of complete packages that can be fulfilled from the available
// stock (units on hand).
export const wholesaleAvailableCartons = (unitsInStock: number, unitsPerPackage: number): number => {
  if (!Number.isInteger(unitsPerPackage) || unitsPerPackage < 1 || !Number.isInteger(unitsInStock) || unitsInStock < 0) {
    return 0
  }
  return Math.floor(unitsInStock / unitsPerPackage)
}
