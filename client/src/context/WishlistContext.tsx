import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../services/api'
import { addToWishlist, getWishlist, removeFromWishlist } from '../services/wishlistService'
import type { Product } from '../types/product'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { WishlistContext, type WishlistContextValue } from './wishlistContext'

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useCustomerAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setProducts([])
      setWishlistIds(new Set())
      setHasLoaded(true)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const wishlist = await getWishlist()
      setProducts(wishlist.products)
      setWishlistIds(new Set(wishlist.productIds))
      setHasLoaded(true)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    let current = true
    setHasLoaded(false)
    if (!user) {
      setProducts([])
      setWishlistIds(new Set())
      setIsLoading(false)
      setHasLoaded(true)
      return () => { current = false }
    }

    setIsLoading(true)
    void getWishlist()
      .then((wishlist) => {
        if (!current) return
        setProducts(wishlist.products)
        setWishlistIds(new Set(wishlist.productIds))
        setHasLoaded(true)
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })

    return () => { current = false }
  }, [user])

  const isWishlisted = useCallback((productId: string, fallback = false) => {
    if (!user) return false
    return hasLoaded ? wishlistIds.has(productId) : fallback
  }, [hasLoaded, user, wishlistIds])

  const toggleWishlist = useCallback(async (product: Product) => {
    const wasWishlisted = wishlistIds.has(product.id)
    setPendingProductIds((current) => new Set(current).add(product.id))
    setWishlistIds((current) => {
      const next = new Set(current)
      if (wasWishlisted) next.delete(product.id)
      else next.add(product.id)
      return next
    })
    setProducts((current) => wasWishlisted
      ? current.filter((item) => item.id !== product.id)
      : current.some((item) => item.id === product.id) ? current : [product, ...current])

    try {
      return wasWishlisted ? !(await removeFromWishlist(product.id)) : await addToWishlist(product.id)
    } catch (error: unknown) {
      setWishlistIds((current) => {
        const next = new Set(current)
        if (wasWishlisted) next.add(product.id)
        else next.delete(product.id)
        return next
      })
      setProducts((current) => wasWishlisted
        ? [product, ...current.filter((item) => item.id !== product.id)]
        : current.filter((item) => item.id !== product.id))
      throw error instanceof ApiError ? error : new Error('Your wishlist could not be updated.')
    } finally {
      setPendingProductIds((current) => {
        const next = new Set(current)
        next.delete(product.id)
        return next
      })
    }
  }, [wishlistIds])

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