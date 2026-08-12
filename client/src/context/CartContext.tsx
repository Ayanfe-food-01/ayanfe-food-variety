import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Product } from '../types/product'
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
import { CartContext, type CartContextValue, type CartItem } from './cartContext'

const CART_STORAGE_KEY = 'ayanfe-cart'
const CART_OWNER_STORAGE_KEY = 'ayanfe-cart-owner'

const messageFromError = (error: unknown) =>
  error instanceof Error ? error.message : 'Your cart could not be updated. Please try again.'

const toCartItem = (item: CustomerCartItem): CartItem => ({
  cartItemId: item.id,
  id: item.productId,
  name: item.name,
  unit: item.unit,
  price: Number(item.price),
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
      itemSubtotal: typeof item.itemSubtotal === 'number' ? item.itemSubtotal : item.price * item.quantity,
      isAvailable: item.isAvailable !== false,
      availableQuantity: item.availableQuantity,
      canUpdateQuantity: item.canUpdateQuantity !== false,
      availabilityMessage: item.availabilityMessage ?? null,
    }))
  } catch {
    return []
  }
}

const createCartItem = (product: Product, quantity: number): CartItem => ({
  id: product.id,
  name: product.name,
  unit: product.unit,
  price: product.price,
  image: product.image,
  quantity,
  itemSubtotal: product.price * quantity,
  isAvailable: product.isAvailable,
  canUpdateQuantity: product.isAvailable,
  availabilityMessage: product.isAvailable ? null : 'This product is no longer available.',
})

interface CartProviderProps {
  children: ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart)
  const [authoritativeSubtotal, setAuthoritativeSubtotal] = useState<number | null>(null)
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
  }, [])

  const refreshCart = useCallback(async () => {
    if (!user) {
      setAuthoritativeSubtotal(null)
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
    const localItems = itemsRef.current.map((item) => ({ productId: item.id, quantity: item.quantity }))
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
    productId: string,
    mutation: () => Promise<CustomerCartSnapshot>,
  ) => {
    setPendingItemIds((current) => current.includes(productId) ? current : [...current, productId])
    setError(null)
    try {
      applySnapshot(await mutation())
    } catch (caught: unknown) {
      setError(messageFromError(caught))
      throw caught
    } finally {
      setPendingItemIds((current) => current.filter((id) => id !== productId))
    }
  }, [applySnapshot])

  const addToCart = useCallback(async (product: Product, quantity = 1) => {
    const safeQuantity = Math.floor(quantity)
    if (!Number.isInteger(safeQuantity) || safeQuantity < 1) {
      throw new Error('Quantity must be a positive whole number.')
    }

    if (user) {
      await runItemMutation(product.id, () => addCustomerCartItem(product.id, safeQuantity))
      return
    }

    setError(null)
    setAuthoritativeSubtotal(null)
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)
      if (!existingItem) return [...currentItems, createCartItem(product, safeQuantity)]

      return currentItems.map((item) =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + safeQuantity,
              itemSubtotal: item.price * (item.quantity + safeQuantity),
            }
          : item,
      )
    })
  }, [runItemMutation, user])

  const increaseQuantity = useCallback(async (productId: string) => {
    const item = itemsRef.current.find((currentItem) => currentItem.id === productId)
    if (!item || pendingItemIds.includes(productId)) return

    if (user && item.cartItemId) {
      await runItemMutation(productId, () => updateCustomerCartItem(item.cartItemId!, item.quantity + 1))
      return
    }

    if (!item.isAvailable) return
    setAuthoritativeSubtotal(null)
    setItems((currentItems) => currentItems.map((currentItem) =>
      currentItem.id === productId
        ? {
            ...currentItem,
            quantity: currentItem.quantity + 1,
            itemSubtotal: currentItem.price * (currentItem.quantity + 1),
          }
        : currentItem,
    ))
  }, [pendingItemIds, runItemMutation, user])

  const decreaseQuantity = useCallback(async (productId: string) => {
    const item = itemsRef.current.find((currentItem) => currentItem.id === productId)
    if (!item || item.quantity <= 1 || pendingItemIds.includes(productId)) return

    if (user && item.cartItemId) {
      if (item.canUpdateQuantity === false) return
      const nextQuantity = item.isAvailable
        ? item.quantity - 1
        : Math.min(item.quantity - 1, item.availableQuantity ?? item.quantity - 1)
      if (nextQuantity < 1) return
      await runItemMutation(productId, () => updateCustomerCartItem(item.cartItemId!, nextQuantity))
      return
    }

    setAuthoritativeSubtotal(null)
    setItems((currentItems) => currentItems.map((currentItem) =>
      currentItem.id === productId
        ? {
            ...currentItem,
            quantity: currentItem.quantity - 1,
            itemSubtotal: currentItem.price * (currentItem.quantity - 1),
          }
        : currentItem,
    ))
  }, [pendingItemIds, runItemMutation, user])

  const removeFromCart = useCallback(async (productId: string) => {
    const item = itemsRef.current.find((currentItem) => currentItem.id === productId)
    if (!item || pendingItemIds.includes(productId)) return

    if (user && item.cartItemId) {
      await runItemMutation(productId, () => removeCustomerCartItem(item.cartItemId!))
      return
    }

    setError(null)
    setAuthoritativeSubtotal(null)
    setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== productId))
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
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0)
  const canCheckout = items.length > 0 && items.every((item) => item.isAvailable)

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalQuantity,
      subtotal,
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
      totalQuantity,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}