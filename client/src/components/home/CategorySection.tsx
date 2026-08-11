import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../../assets/icons'
import { CategoryCard } from './CategoryCard'
import { getCategories } from '../../services/categoryService'
import type { Category } from '../../types/category'
import { RevealOnScroll } from '../ui/RevealOnScroll'

export function CategorySection() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await getCategories())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCategories()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCategories])

  const retryCategories = () => {
    setIsLoading(true)
    void loadCategories()
  }

  return (
    <RevealOnScroll>
      <section className="bg-white py-20 lg:py-24" id="categories">
        <div className="mx-auto w-[calc(100%-32px)] max-w-[1160px] md:w-[calc(100%-48px)]">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end md:gap-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange"><span className="inline-block size-2 rounded-full bg-orange" /> Browse the essentials</div>
              <h2 className="m-0 text-4xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-5xl">Shop by category</h2>
            </div>
            <Link className="inline-flex items-center gap-1 text-sm font-bold text-green transition-all duration-200 hover:gap-2" to="/shop">View all products <ArrowUpRight size={16} /></Link>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Loading categories">
              {Array.from({ length: 5 }, (_, index) => (
                <div className="min-h-[180px] animate-pulse rounded-2xl bg-sage sm:min-h-[220px]" key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-line bg-sage/30 px-6 py-10 text-center">
              <p className="m-0 text-sm text-muted">Categories are temporarily unavailable.</p>
              <button
                className="mt-4 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
                type="button"
                onClick={retryCategories}
              >
                Try again
              </button>
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((category) => (
                <CategoryCard category={category} key={category.id} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-10 text-center">
              <p className="m-0 text-sm text-muted">No categories are available right now.</p>
            </div>
          )}
        </div>
      </section>
    </RevealOnScroll>
  )
}