import { HttpError } from '../../utils/http.js'

export type QuoteItem = {
  productId: string
  productName: string
  productOptionId: string | null
  quantity: number
}

export type ProductRow = {
  id: string
  name: string
  isActive: boolean
  stockQuantity: number
  category: { isActive: boolean }
}

export type ProductOptionRow = {
  id: string
  productId: string
  label: string
  isActive: boolean
  stockQuantity: number
}

export function assertItemsAvailable(
  items: QuoteItem[],
  productsById: Map<string, ProductRow>,
  productOptionsById: Map<string, ProductOptionRow>,
): void {
  const messages = items.flatMap((item) => {
    const product = productsById.get(item.productId)
    if (!product) return [`Product ${item.productId} no longer exists.`]
    if (!product.isActive || !product.category.isActive) return [`${item.productName} is no longer available.`]
    if (item.productOptionId) {
      const option = productOptionsById.get(item.productOptionId)
      if (!option) return [`${item.productName}: the requested option no longer exists.`]
      if (option.productId !== item.productId) return [`${item.productName}: the requested option is invalid.`]
      if (!option.isActive) return [`${item.productName} (${option.label}) is no longer available.`]
      if (option.stockQuantity < item.quantity) {
        return [`${item.productName} (${option.label}): only ${option.stockQuantity} unit(s) currently available.`]
      }
    } else if (product.stockQuantity < item.quantity) {
      return [`${item.productName}: only ${product.stockQuantity} unit(s) currently available.`]
    }
    return []
  })
  if (messages.length > 0) {
    throw new HttpError(409, messages.join(' '))
  }
}