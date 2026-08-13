import { Link } from 'react-router-dom'
import type { Category } from '../../types/category'
import { ArrowRight } from '../../assets/icons'

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
          {categories.map((category) => (
            <Link className="category-tile" to={`/shop?category=${category.slug}`} key={category.id}>
              {category.imageUrl ? <img src={category.imageUrl} alt={`${category.name} Nigerian foodstuff - Ayanfe Food Variety`} loading="lazy" /> : <span className="category-placeholder" aria-hidden="true" />}
              <span>{category.name}</span>
            </Link>
          ))}
        </div> : <div className="section-message">No categories are available right now.</div>}
      </div>
    </section>
  )
}