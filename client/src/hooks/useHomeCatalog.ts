import { useCallback, useEffect, useState } from 'react'
import { getCategories } from '../services/categoryService'
import {
  getCategoryProductSections,
  getFeaturedProducts,
  getHomepageData,
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

const loadIndividualPieces = async (set: {
  categories: (value: Category[]) => void
  popularProducts: (value: Product[]) => void
  featuredProducts: (value: Product[]) => void
  newArrivals: (value: Product[]) => void
  categorySections: (value: CategoryProductSection[]) => void
}): Promise<{
  categories: boolean
  popular: boolean
  featured: boolean
  newArrivals: boolean
  categorySections: boolean
}> => {
  const [categoryResult, popularResult, featuredResult, arrivalResult, categorySectionsResult] = await Promise.allSettled([
    getCategories(),
    getPopularProducts({ limit: 8 }),
    getFeaturedProducts({ limit: 8 }),
    getNewArrivals({ limit: 8 }),
    getCategoryProductSections(6),
  ])

  if (categoryResult.status === 'fulfilled') set.categories(categoryResult.value)
  if (popularResult.status === 'fulfilled') set.popularProducts(popularResult.value.products)
  if (featuredResult.status === 'fulfilled') set.featuredProducts(featuredResult.value.products)
  if (arrivalResult.status === 'fulfilled') set.newArrivals(arrivalResult.value.products)
  if (categorySectionsResult.status === 'fulfilled') set.categorySections(categorySectionsResult.value)

  return {
    categories: categoryResult.status === 'rejected',
    popular: popularResult.status === 'rejected',
    featured: featuredResult.status === 'rejected',
    newArrivals: arrivalResult.status === 'rejected',
    categorySections: categorySectionsResult.status === 'rejected',
  }
}

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

    // Fast path: the server serves the whole homepage from a single 15-minute
    // Redis snapshot. On any failure (endpoint missing, outage) we transparently
    // fall back to the five individual endpoints below.
    try {
      const homepage = await getHomepageData()
      setCategories(homepage.categories)
      setPopularProducts(homepage.popularProducts)
      setFeaturedProducts(homepage.featuredProducts)
      setNewArrivals(homepage.newArrivals)
      setCategorySections(homepage.categorySections)
      setErrors(initialErrors)
      setIsLoading(false)
      return
    } catch {
      // Fall through to the per-endpoint loader.
    }

    const nextErrors = await loadIndividualPieces({ categories: setCategories, popularProducts: setPopularProducts, featuredProducts: setFeaturedProducts, newArrivals: setNewArrivals, categorySections: setCategorySections })
    setErrors(nextErrors)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCatalog(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCatalog])

  return { categories, popularProducts, featuredProducts, newArrivals, categorySections, isLoading, errors, retry: loadCatalog }
}