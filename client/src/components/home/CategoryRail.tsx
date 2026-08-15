import { Link } from 'react-router-dom'
import type { Category } from '../../types/category'
import { ArrowRight } from '../../assets/icons'
import { CategoryCard } from './CategoryCard'

interface CategoryRailProps {
  categories: Category[]
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
}

export function CategoryRail({ categories, isLoading, hasError, onRetry }: CategoryRailProps) {
  return (
    <section className="home-section bg-white" id="categories" aria-labelledby="category-heading">
      <div className="container">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Start shopping</p>
            <h2 id="category-heading">Shop by category</h2>
          </div>
          <Link className="section-link" to="/shop">See all <ArrowRight size={16} /></Link>
        </div>
        {isLoading ? <div className="category-rail" aria-busy="true" aria-label="Loading categories">
          {Array.from({ length: 5 }, (_, index) => <span className="category-skeleton" key={index} />)}
        </div> : hasError ? <div className="section-message" role="alert">
          <span>Categories are temporarily unavailable.</span><button type="button" onClick={onRetry}>Try again</button>
        </div> : categories.length ? <div className="category-rail">
          {categories.map((category) => <CategoryCard category={category} key={category.id} />)}
        </div> : <div className="section-message">No categories are available right now.</div>}
      </div>
    </section>
  )
}