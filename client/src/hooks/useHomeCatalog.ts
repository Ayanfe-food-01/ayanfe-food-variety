import { useCallback, useEffect, useState } from 'react'
import { getCategories } from '../services/categoryService'
import {
  getCategoryProductSections,
  getFeaturedProducts,
  getNewArrivals,
  getPopularProducts,
  type CategoryProductSection,
} from '../services/productService'
import type { Category } from '../types/category'
import type { Product } from '../types/product'

interface HomeCatalog {
  categories: Category[]
  popularProducts: Product[]
  featuredProducts: Product[]
  newArrivals: Product[]
  categorySections: CategoryProductSection[]
  isLoading: boolean
  errors: { categories: boolean; popular: boolean; featured: boolean; newArrivals: boolean; categorySections: boolean }
  retry: () => void
}

const initialErrors = { categories: false, popular: false, featured: false, newArrivals: false, categorySections: false }

export function useHomeCatalog(): HomeCatalog {
  const [categories, setCategories] = useState<Category[]>([])
  const [popularProducts, setPopularProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [categorySections, setCategorySections] = useState<CategoryProductSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState(initialErrors)

  const loadCatalog = useCallback(async () => {
    setIsLoading(true)
    setErrors(initialErrors)
    const [categoryResult, popularResult, featuredResult, arrivalResult, categorySectionsResult] = await Promise.allSettled([
      getCategories(),
      getPopularProducts({ limit: 8 }),
      getFeaturedProducts({ limit: 8 }),
      getNewArrivals({ limit: 8 }),
      getCategoryProductSections(6),
    ])

    if (categoryResult.status === 'fulfilled') setCategories(categoryResult.value)
    if (popularResult.status === 'fulfilled') setPopularProducts(popularResult.value.products)
    if (featuredResult.status === 'fulfilled') setFeaturedProducts(featuredResult.value.products)
    if (arrivalResult.status === 'fulfilled') setNewArrivals(arrivalResult.value.products)
    if (categorySectionsResult.status === 'fulfilled') setCategorySections(categorySectionsResult.value)
    setErrors({
      categories: categoryResult.status === 'rejected',
      popular: popularResult.status === 'rejected',
      featured: featuredResult.status === 'rejected',
      newArrivals: arrivalResult.status === 'rejected',
      categorySections: categorySectionsResult.status === 'rejected',
    })
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCatalog(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCatalog])

  return { categories, popularProducts, featuredProducts, newArrivals, categorySections, isLoading, errors, retry: loadCatalog }
}