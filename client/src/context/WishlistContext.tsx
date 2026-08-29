import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../services/api'
import { addToWishlist, getWishlist, removeFromWishlist } from '../services/wishlistService'
import type { Product } from '../types/product'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { WishlistContext, type WishlistContextValue } from './wishlistContext'

interface WishlistSnapshot {
  products: Product[]
  productIds: Set<string>
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useCustomerAuth()
  const userKey = user?.id ?? null
  const [snapshots, setSnapshots] = useState<Map<string | null, WishlistSnapshot>>(new Map())
  const [settledKeys, setSettledKeys] = useState<Set<string | null>>(new Set())
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (userKey === null) return
    let current = true
    void getWishlist()
      .then((wishlist) => {
        if (!current) return
        setSnapshots((prev) => new Map(prev).set(userKey, {
          products: wishlist.products,
          productIds: new Set(wishlist.productIds),
        }))
      })
      .finally(() => {
        if (current) setSettledKeys((prev) => new Set(prev).add(userKey))
      })
    return () => { current = false }
  }, [userKey])

  const snapshot = snapshots.get(userKey)
  const products = useMemo(() => snapshot?.products ?? [], [snapshot])
  const wishlistIds = useMemo(() => snapshot?.productIds ?? new Set<string>(), [snapshot])
  const isLoading = userKey !== null && !settledKeys.has(userKey)

  const refreshWishlist = useCallback(async () => {
    if (!user) return
    const wishlist = await getWishlist()
    setSnapshots((prev) => new Map(prev).set(user.id, {
      products: wishlist.products,
      productIds: new Set(wishlist.productIds),
    }))
  }, [user])

  const isWishlisted = useCallback((productId: string, fallback = false) => {
    if (!user) return false
    const userSnapshot = snapshots.get(user.id)
    return userSnapshot !== undefined ? userSnapshot.productIds.has(productId) : fallback
  }, [snapshots, user])

  const toggleWishlist = useCallback(async (product: Product) => {
    const currentIds = snapshots.get(userKey)?.productIds ?? new Set<string>()
    const hasCurrentLoaded = userKey === null || snapshots.has(userKey)
    const wasWishlisted = hasCurrentLoaded
      ? currentIds.has(product.id)
      : currentIds.has(product.id) || product.isWishlisted

    setPendingProductIds((current) => new Set(current).add(product.id))
    setSnapshots((prev) => {
      const base = prev.get(userKey) ?? { products: [], productIds: new Set<string>() }
      const nextIds = new Set(base.productIds)
      if (wasWishlisted) nextIds.delete(product.id)
      else nextIds.add(product.id)
      const nextProducts = wasWishlisted
        ? base.products.filter((item) => item.id !== product.id)
        : base.products.some((item) => item.id === product.id) ? base.products : [product, ...base.products]
      const next = new Map(prev)
      next.set(userKey, { products: nextProducts, productIds: nextIds })
      return next
    })

    try {
      return wasWishlisted ? await removeFromWishlist(product.id) : await addToWishlist(product.id)
    } catch (error: unknown) {
      setSnapshots((prev) => {
        const base = prev.get(userKey) ?? { products: [], productIds: new Set<string>() }
        const nextIds = new Set(base.productIds)
        if (wasWishlisted) nextIds.add(product.id)
        else nextIds.delete(product.id)
        const nextProducts = wasWishlisted
          ? [product, ...base.products.filter((item) => item.id !== product.id)]
          : base.products.filter((item) => item.id !== product.id)
        const next = new Map(prev)
        next.set(userKey, { products: nextProducts, productIds: nextIds })
        return next
      })
      throw error instanceof ApiError ? error : new Error('Your wishlist could not be updated.')
    } finally {
      setPendingProductIds((current) => {
        const next = new Set(current)
        next.delete(product.id)
        return next
      })
    }
  }, [snapshots, userKey])

  const value = useMemo<WishlistContextValue>(() => ({
    products,
    count: wishlistIds.size,
    isLoading,
    isWishlisted,
    pendingProductIds: [...pendingProductIds],
    toggleWishlist,
    refreshWishlist,
  }), [isLoading, isWishlisted, pendingProductIds, products, refreshWishlist, toggleWishlist, wishlistIds.size])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}