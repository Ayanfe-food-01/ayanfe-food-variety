import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Product, ProductOption } from '../types/product'
import {
  addCustomerCartItem,
  clearCustomerCart,
  getCustomerCart,
  removeCustomerCartItem,
  syncCustomerCart,
  updateCustomerCartItem,
  type CustomerCartItem,
  type CustomerCartSnapshot,
} from '../services/cartService'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { CartContext, cartItemLineKey, type CartContextValue, type CartItem } from './cartContext'

const CART_STORAGE_KEY = 'ayanfe-cart'
const CART_OWNER_STORAGE_KEY = 'ayanfe-cart-owner'

const messageFromError = (error: unknown) =>
  error instanceof Error ? error.message : 'Your cart could not be updated. Please try again.'

const toCartItem = (item: CustomerCartItem): CartItem => ({
  cartItemId: item.id,
  id: item.productId,
  productOptionId: item.productOptionId,
  productOptionLabel: item.productOptionLabel,
  name: item.name,
  unit: item.unit,
  price: Number(item.price),
  originalPrice: Number(item.originalPrice),
  discountType: item.discountType,
  discountValue: item.discountValue === null ? null : Number(item.discountValue),
  deliveryFee: Number(item.deliveryFee),
  image: item.image,
  quantity: item.quantity,
  itemSubtotal: Number(item.itemSubtotal),
  isAvailable: item.isAvailable,
  availableQuantity: item.availableQuantity,
  canUpdateQuantity: item.canUpdateQuantity,
  availabilityMessage: item.availabilityMessage,
})

const isCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== 'object') return false

  const item = value as Record<string, unknown>
  const price = item.price
  const quantity = item.quantity

  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.unit === 'string' &&
    typeof price === 'number' &&
    Number.isFinite(price) &&
    price > 0 &&
    typeof item.deliveryFee === 'number' &&
    Number.isFinite(item.deliveryFee) &&
    typeof item.image === 'string' &&
    typeof quantity === 'number' &&
    Number.isInteger(quantity) &&
    quantity >= 1
  )
}

const readStoredCart = (): CartItem[] => {
  if (typeof window === 'undefined') return []

  try {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!storedCart) return []

    const parsedCart: unknown = JSON.parse(storedCart)
    if (!Array.isArray(parsedCart)) return []

    return parsedCart.filter(isCartItem).map((item) => ({
      ...item,
      productOptionId: typeof item.productOptionId === 'string' ? item.productOptionId : null,
      productOptionLabel: typeof item.productOptionLabel === 'string' ? item.productOptionLabel : null,
      originalPrice: typeof item.originalPrice === 'number' ? item.originalPrice : item.price,
      discountType: item.discountType === 'PERCENTAGE' || item.discountType === 'FIXED' ? item.discountType : null,
      discountValue: typeof item.discountValue === 'number' && Number.isFinite(item.discountValue) ? item.discountValue : null,
      itemSubtotal: typeof item.itemSubtotal === 'number' ? item.itemSubtotal : item.price * item.quantity,
      deliveryFee: typeof item.deliveryFee === 'number' ? item.deliveryFee : 0,
      isAvailable: item.isAvailable !== false,
      availableQuantity: item.availableQuantity,
      canUpdateQuantity: item.canUpdateQuantity !== false,
      availabilityMessage: item.availabilityMessage ?? null,
    }))
  } catch {
    return []
  }
}

const createCartItem = (product: Product, quantity: number, selectedOption: ProductOption | null): CartItem => {
  const isOptioned = selectedOption !== null
  const unitPrice = isOptioned ? selectedOption.price : product.discountedPrice
  const originalPrice = isOptioned ? selectedOption.price : product.price
  const availableQuantity = isOptioned ? selectedOption.stockQuantity : product.stockQuantity
  const optionInStock = isOptioned ? selectedOption.stockQuantity > 0 : product.stockQuantity > 0
  const isAvailable = product.isAvailable && optionInStock
  const availabilityMessage = isOptioned && selectedOption.stockQuantity === 0
    ? `The ${selectedOption.label} option is out of stock.`
    : product.isAvailable
      ? null
      : 'This product is no longer available.'

  return {
    id: product.id,
    productOptionId: selectedOption?.id ?? null,
    productOptionLabel: selectedOption?.label ?? null,
    name: product.name,
    unit: product.unit,
    price: unitPrice,
    originalPrice,
    discountType: isOptioned ? null : product.discountType,
    discountValue: isOptioned ? null : product.discountValue,
    deliveryFee: product.deliveryFee * quantity,
    image: product.image,
    quantity,
    itemSubtotal: unitPrice * quantity,
    isAvailable,
    availableQuantity,
    canUpdateQuantity: isAvailable,
    availabilityMessage,
  }
}

interface CartProviderProps {
  children: ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart)
  const [authoritativeSubtotal, setAuthoritativeSubtotal] = useState<number | null>(null)
  const [authoritativeDeliveryFee, setAuthoritativeDeliveryFee] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const { user, isLoading: isCustomerAuthLoading } = useCustomerAuth()
  const itemsRef = useRef(items)
  const previousUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // The cart remains usable for this session if storage is unavailable.
    }
  }, [items])

  const applySnapshot = useCallback((snapshot: CustomerCartSnapshot) => {
    setItems(snapshot.items.map(toCartItem))
    setAuthoritativeSubtotal(Number(snapshot.subtotal))
    setAuthoritativeDeliveryFee(Number(snapshot.deliveryFee))
  }, [])

  const refreshCart = useCallback(async () => {
    if (!user) {
      setAuthoritativeSubtotal(null)
      setAuthoritativeDeliveryFee(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      applySnapshot(await getCustomerCart())
    } catch (caught: unknown) {
      setError(messageFromError(caught))
      throw caught
    } finally {
      setIsLoading(false)
    }
  }, [applySnapshot, user])

  useEffect(() => {
    if (isCustomerAuthLoading) return

    if (!user) {
      if (previousUserIdRef.current) {
        setItems([])
        setAuthoritativeSubtotal(null)
        setAuthoritativeDeliveryFee(null)
        window.localStorage.removeItem(CART_OWNER_STORAGE_KEY)
      }
      previousUserIdRef.current = null
      window.setTimeout(() => setIsLoading(false), 0)
      return
    }

    let isCurrent = true
    const hydrationStateTimer = setTimeout(() => {
      if (!isCurrent) return
      setIsLoading(true)
      setError(null)
    }, 0)
    const storedCartOwner = window.localStorage.getItem(CART_OWNER_STORAGE_KEY)
    const localItems = itemsRef.current.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
      productOptionId: item.productOptionId,
    }))
    const hydrateCart = storedCartOwner === user.id
      ? getCustomerCart()
      : syncCustomerCart(localItems)

    hydrateCart
      .then((snapshot) => {
        if (!isCurrent) return
        applySnapshot(snapshot)
        window.localStorage.setItem(CART_OWNER_STORAGE_KEY, user.id)
        previousUserIdRef.current = user.id
      })
      .catch((caught: unknown) => {
        if (isCurrent) setError(messageFromError(caught))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
      clearTimeout(hydrationStateTimer)
    }
  }, [applySnapshot, isCustomerAuthLoading, user])

  const runItemMutation = useCallback(async (
    lineKey: string,
    mutation: () => Promise<CustomerCartSnapshot>,
  ) => {
    setPendingItemIds((current) => current.includes(lineKey) ? current : [...current, lineKey])
    setError(null)
    try {
      applySnapshot(await mutation())
    } catch (caught: unknown) {
      setError(messageFromError(caught))
      throw caught
    } finally {
      setPendingItemIds((current) => current.filter((id) => id !== lineKey))
    }
  }, [applySnapshot])

  const addToCart = useCallback(async (product: Product, quantity = 1, selectedOption: ProductOption | null = null) => {
    const safeQuantity = Math.floor(quantity)
    if (!Number.isInteger(safeQuantity) || safeQuantity < 1) {
      throw new Error('Quantity must be a positive whole number.')
    }

    const optionId = selectedOption?.id ?? null
    const lineKey = cartItemLineKey(product.id, optionId)

    if (user) {
      await runItemMutation(lineKey, () => addCustomerCartItem(product.id, safeQuantity, optionId))
      return
    }

    const stockQuantity = selectedOption ? selectedOption.stockQuantity : product.stockQuantity
    if (!product.isAvailable || (selectedOption && selectedOption.stockQuantity <= 0)) {
      throw new Error(selectedOption && selectedOption.stockQuantity <= 0
        ? `The ${selectedOption.label} option is out of stock.`
        : 'This product is unavailable.')
    }

    const existingItem = itemsRef.current.find(
      (item) => item.id === product.id && (item.productOptionId ?? null) === optionId,
    )
    const nextQuantity = (existingItem?.quantity ?? 0) + safeQuantity
    if (nextQuantity > stockQuantity) {
      const scope = selectedOption ? ` of the ${selectedOption.label} option` : ''
      throw new Error(`Insufficient stock. Only ${stockQuantity} ${stockQuantity === 1 ? 'unit' : 'units'}${scope} available.`)
    }

    setError(null)
    setAuthoritativeSubtotal(null)
    setAuthoritativeDeliveryFee(null)
    const nextItems = !existingItem
      ? [...itemsRef.current, createCartItem(product, safeQuantity, selectedOption)]
      : itemsRef.current.map((item) =>
          cartItemLineKey(item.id, item.productOptionId) === lineKey
            ? {
                ...item,
                quantity: item.quantity + safeQuantity,
                itemSubtotal: item.price * (item.quantity + safeQuantity),
                deliveryFee: item.deliveryFee / item.quantity * (item.quantity + safeQuantity),
              }
            : item,
        )
    itemsRef.current = nextItems
    setItems(nextItems)
  }, [runItemMutation, user])

  const increaseQuantity = useCallback(async (item: CartItem) => {
    const lineKey = cartItemLineKey(item.id, item.productOptionId)
    const currentItem = itemsRef.current.find((candidate) => cartItemLineKey(candidate.id, candidate.productOptionId) === lineKey)
    if (!currentItem || pendingItemIds.includes(lineKey)) return

    if (user && currentItem.cartItemId) {
      await runItemMutation(lineKey, () => updateCustomerCartItem(currentItem.cartItemId!, currentItem.quantity + 1))
      return
    }

    if (!currentItem.isAvailable) return
    if (typeof currentItem.availableQuantity === 'number' && currentItem.quantity >= currentItem.availableQuantity) {
      const scope = currentItem.productOptionId ? ` of the ${currentItem.productOptionLabel} option` : ''
      setError(`Only ${currentItem.availableQuantity} ${currentItem.availableQuantity === 1 ? 'unit' : 'units'}${scope} available.`)
      return
    }
    setAuthoritativeSubtotal(null)
    setAuthoritativeDeliveryFee(null)
    setItems((currentItems) => currentItems.map((candidate) =>
      cartItemLineKey(candidate.id, candidate.productOptionId) === lineKey
        ? {
            ...candidate,
            quantity: candidate.quantity + 1,
            itemSubtotal: candidate.price * (candidate.quantity + 1),
            deliveryFee: candidate.deliveryFee / candidate.quantity * (candidate.quantity + 1),
          }
        : candidate,
    ))
  }, [pendingItemIds, runItemMutation, user])

  const decreaseQuantity = useCallback(async (item: CartItem) => {
    const lineKey = cartItemLineKey(item.id, item.productOptionId)
    const currentItem = itemsRef.current.find((candidate) => cartItemLineKey(candidate.id, candidate.productOptionId) === lineKey)
    if (!currentItem || currentItem.quantity <= 1 || pendingItemIds.includes(lineKey)) return

    if (user && currentItem.cartItemId) {
      if (currentItem.canUpdateQuantity === false) return
      const nextQuantity = currentItem.isAvailable
        ? currentItem.quantity - 1
        : Math.min(currentItem.quantity - 1, currentItem.availableQuantity ?? currentItem.quantity - 1)
      if (nextQuantity < 1) return
      await runItemMutation(lineKey, () => updateCustomerCartItem(currentItem.cartItemId!, nextQuantity))
      return
    }

    setAuthoritativeSubtotal(null)
    setAuthoritativeDeliveryFee(null)
    setItems((currentItems) => currentItems.map((candidate) =>
      cartItemLineKey(candidate.id, candidate.productOptionId) === lineKey
        ? {
            ...candidate,
            quantity: candidate.quantity - 1,
            itemSubtotal: candidate.price * (candidate.quantity - 1),
            deliveryFee: candidate.deliveryFee / candidate.quantity * (candidate.quantity - 1),
          }
        : candidate,
    ))
  }, [pendingItemIds, runItemMutation, user])

  const removeFromCart = useCallback(async (item: CartItem) => {
    const lineKey = cartItemLineKey(item.id, item.productOptionId)
    if (!item || pendingItemIds.includes(lineKey)) return

    if (user && item.cartItemId) {
      await runItemMutation(lineKey, () => removeCustomerCartItem(item.cartItemId!))
      return
    }

    setError(null)
    setAuthoritativeSubtotal(null)
    setAuthoritativeDeliveryFee(null)
    setItems((currentItems) => currentItems.filter(
      (candidate) => cartItemLineKey(candidate.id, candidate.productOptionId) !== lineKey,
    ))
  }, [pendingItemIds, runItemMutation, user])

  const clearCart = useCallback(async () => {
    if (isClearing) return
    setIsClearing(true)
    setError(null)
    try {
      if (user) {
        applySnapshot(await clearCustomerCart())
      } else {
        setItems([])
        setAuthoritativeSubtotal(null)
        setAuthoritativeDeliveryFee(null)
      }
    } catch (caught: unknown) {
      setError(messageFromError(caught))
      throw caught
    } finally {
      setIsClearing(false)
    }
  }, [applySnapshot, isClearing, user])

  const getItemSubtotal = useCallback((item: CartItem) => item.itemSubtotal, [])
  const subtotal = authoritativeSubtotal ?? items.reduce((total, item) => total + getItemSubtotal(item), 0)
  const deliveryFee = authoritativeDeliveryFee ?? items.reduce((total, item) => total + item.deliveryFee, 0)
  const total = subtotal + deliveryFee
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0)
  const canCheckout = items.length > 0 && items.every((item) => item.isAvailable)

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalQuantity,
      subtotal,
      deliveryFee,
      total,
      canCheckout,
      isLoading,
      error,
      pendingItemIds,
      isClearing,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
      getItemSubtotal,
    }),
    [
      addToCart,
      canCheckout,
      clearCart,
      decreaseQuantity,
      error,
      getItemSubtotal,
      increaseQuantity,
      isClearing,
      isLoading,
      items,
      pendingItemIds,
      refreshCart,
      removeFromCart,
      subtotal,
      deliveryFee,
      totalQuantity,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}