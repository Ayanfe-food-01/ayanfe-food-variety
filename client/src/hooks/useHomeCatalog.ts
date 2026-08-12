import { useCallback, useEffect, useState } from 'react'
import { getCategories } from '../services/categoryService'
import { getNewArrivals, getProducts } from '../services/productService'
import type { Category } from '../types/category'
import type { Product } from '../types/product'

interface HomeCatalog {
  categories: Category[]
  featured: Product[]
  newArrivals: Product[]
  isLoading: boolean
  errors: { categories: boolean; featured: boolean; newArrivals: boolean }
  retry: () => void
}

const initialErrors = { categories: false, featured: false, newArrivals: false }

export function useHomeCatalog(): HomeCatalog {
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState(initialErrors)

  const loadCatalog = useCallback(async () => {
    setIsLoading(true)
    setErrors(initialErrors)
    const [categoryResult, featuredResult, arrivalResult] = await Promise.allSettled([
      getCategories(),
      getProducts({ limit: 8 }),
      getNewArrivals({ limit: 8 }),
    ])

    if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
    if (featuredResult.status === 'fulfilled') setFeatured(featuredResult.value.products)
    if (arrivalResult.status === 'fulfilled') setNewArrivals(arrivalResult.value.products)
    setErrors({
      categories: categoryResult.status === 'rejected',
      featured: featuredResult.status === 'rejected',
      newArrivals: arrivalResult.status === 'rejected',
    })
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCatalog(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCatalog])

  return { categories, featured, newArrivals, isLoading, errors, retry: loadCatalog }
}