import type { Category } from '../../types/category'
import type { CategoryProductSection } from '../../services/productService'
import { ProductRail } from './ProductRail'

interface CategoryProductSectionsProps {
  categories: Category[]
  sections: CategoryProductSection[]
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
}

export function CategoryProductSections({
  categories,
  sections,
  isLoading,
  hasError,
  onRetry,
}: CategoryProductSectionsProps) {
  if (hasError && !sections.length) {
    return (
      <section className="home-section bg-white" aria-labelledby="category-products-error-heading">
        <div className="container">
          <div className="section-message" role="alert">
            <span>Category shelves are temporarily unavailable.</span>
            <button type="button" className="border-0 bg-transparent text-orange font-extrabold cursor-pointer" onClick={onRetry}>Try again</button>
          </div>
        </div>
      </section>
    )
  }

  const categoryOrder = categories.length
    ? categories
    : sections.map(({ category }) => ({ ...category, description: '', imageUrl: '', isActive: true }))

  if (isLoading) {
    return (
      <>
        {categoryOrder.map((category) => (
          <ProductRail
            key={category.id}
            title={category.name}
            eyebrow="Shop by category"
            products={[]}
            isLoading
            hasError={false}
            onRetry={onRetry}
            headingId={`category-products-${category.slug}`}
          />
        ))}
      </>
    )
  }

  const sectionsByCategory = new Map(sections.map((section) => [section.category.id, section]))

  return (
    <>
      {categoryOrder.map((category) => {
        const section = sectionsByCategory.get(category.id)
        if (!section?.products.length) return null

        return (
          <ProductRail
            key={section.category.id}
            title={section.category.name}
            eyebrow="Shop by category"
            products={section.products}
            isLoading={false}
            hasError={false}
            onRetry={onRetry}
            href={`/shop?category=${encodeURIComponent(section.category.slug)}`}
            headingId={`category-products-${section.category.slug}`}
            hideWhenEmpty
          />
        )
      })}
    </>
  )
}