import { useCallback, useEffect, useState } from 'react'
import { getCategories } from '../services/categoryService'
import { getFeaturedProducts, getNewArrivals, getPopularProducts } from '../services/productService'
import type { Category } from '../types/category'
import type { Product } from '../types/product'

interface HomeCatalog {
  categories: Category[]
  popularProducts: Product[]
  featuredProducts: Product[]
  newArrivals: Product[]
  isLoading: boolean
  errors: { categories: boolean; popular: boolean; featured: boolean; newArrivals: boolean }
  retry: () => void
}

const initialErrors = { categories: false, popular: false, featured: false, newArrivals: false }

export function useHomeCatalog(): HomeCatalog {
  const [categories, setCategories] = useState<Category[]>([])
  const [popularProducts, setPopularProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState(initialErrors)

  const loadCatalog = useCallback(async () => {
    setIsLoading(true)
    setErrors(initialErrors)
    const [categoryResult, popularResult, featuredResult, arrivalResult] = await Promise.allSettled([
      getCategories(),
      getPopularProducts({ limit: 8 }),
      getFeaturedProducts({ limit: 8 }),
      getNewArrivals({ limit: 8 }),
    ])

    if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
    if (popularResult.status === 'fulfilled') setPopularProducts(popularResult.value.products)
    if (featuredResult.status === 'fulfilled') setFeaturedProducts(featuredResult.value.products)
    if (arrivalResult.status === 'fulfilled') setNewArrivals(arrivalResult.value.products)
    setErrors({
      categories: categoryResult.status === 'rejected',
      popular: popularResult.status === 'rejected',
      featured: featuredResult.status === 'rejected',
      newArrivals: arrivalResult.status === 'rejected',
    })
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCatalog(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCatalog])

  return { categories, popularProducts, featuredProducts, newArrivals, isLoading, errors, retry: loadCatalog }
}