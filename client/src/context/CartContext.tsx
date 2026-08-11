import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Product } from '../types/product'
import { getCustomerCart, replaceCustomerCart, syncCustomerCart } from '../services/cartService'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { CartContext, type CartContextValue, type CartItem } from './cartContext'

const CART_STORAGE_KEY = 'ayanfe-cart'
const CART_OWNER_STORAGE_KEY = 'ayanfe-cart-owner'

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
    return Array.isArray(parsedCart) ? parsedCart.filter(isCartItem) : []
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
})

interface CartProviderProps {
  children: ReactNode
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(readStoredCart)
  const { user, isLoading: isCustomerAuthLoading } = useCustomerAuth()
  const itemsRef = useRef(items)
  const previousUserIdRef = useRef<string | null>(null)
  const hydratedCustomerIdRef = useRef<string | null>(null)
  const isHydratingCustomerCartRef = useRef(false)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Cart functionality still works for this session if storage is unavailable.
    }
  }, [items])

  useEffect(() => {
    if (isCustomerAuthLoading) return

    if (!user) {
      if (previousUserIdRef.current) {
        setItems([])
        window.localStorage.removeItem(CART_OWNER_STORAGE_KEY)
      }
      previousUserIdRef.current = null
      hydratedCustomerIdRef.current = null
      return
    }

    let isCurrent = true
    const storedCartOwner = window.localStorage.getItem(CART_OWNER_STORAGE_KEY)
    const localItems = itemsRef.current.map((item) => ({ productId: item.id, quantity: item.quantity }))
    isHydratingCustomerCartRef.current = true

    const hydrateCart = storedCartOwner === user.id
      ? getCustomerCart()
      : syncCustomerCart(localItems)

    hydrateCart
      .then((serverItems) => {
        if (!isCurrent) return
        setItems(
          serverItems.map((item): CartItem => ({
            id: item.productId,
            name: item.name,
            unit: item.unit,
            price: Number(item.price),
            image: item.image,
            quantity: item.quantity,
          })),
        )
        window.localStorage.setItem(CART_OWNER_STORAGE_KEY, user.id)
        previousUserIdRef.current = user.id
        hydratedCustomerIdRef.current = user.id
      })
      .catch(() => {
        // Keep the local cart if the persistent cart is temporarily unavailable.
      })
      .finally(() => {
        if (isCurrent) isHydratingCustomerCartRef.current = false
      })

    return () => {
      isCurrent = false
      isHydratingCustomerCartRef.current = false
    }
  }, [isCustomerAuthLoading, user])

  useEffect(() => {
    if (
      isCustomerAuthLoading ||
      !user ||
      hydratedCustomerIdRef.current !== user.id ||
      isHydratingCustomerCartRef.current
    ) {
      return
    }

    void replaceCustomerCart(
      items.map((item) => ({ productId: item.id, quantity: item.quantity })),
    ).catch(() => {
      // The local cart remains usable if persistence is temporarily unavailable.
    })
  }, [isCustomerAuthLoading, items, user])

  const getItemSubtotal = (item: CartItem) => item.price * item.quantity

  const addToCart = (product: Product, quantity = 1) => {
    const safeQuantity = Math.max(1, Math.floor(quantity))

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)

      if (!existingItem) {
        return [...currentItems, createCartItem(product, safeQuantity)]
      }

      return currentItems.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + safeQuantity }
          : item,
      )
    })
  }

  const increaseQuantity = (productId: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    )
  }

  const decreaseQuantity = (productId: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item,
      ),
    )
  }

  const removeFromCart = (productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== productId))
  }

  const clearCart = () => setItems([])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce((total, item) => total + getItemSubtotal(item), 0),
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      getItemSubtotal,
    }),
    [items],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}