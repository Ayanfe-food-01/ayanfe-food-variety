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
  const messageClass = 'flex min-h-[100px] items-center justify-center gap-[13px] rounded-xl border border-dashed border-green px-6 text-[13px] text-muted'
  const skeletonClass = 'block aspect-square w-full animate-pulse rounded-[14px] bg-sage'

  return (
    <section className="border-b border-line bg-white py-[25px] md:py-8" id="categories" aria-labelledby="category-heading">
      <div className="container">
        <div className="mb-4 flex items-center justify-between gap-[18px]">
          <div>
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.15em] text-orange">Start shopping</p>
            <h2 id="category-heading" className="m-0 text-[clamp(1.35rem,3vw,1.8rem)] tracking-[-0.035em] text-green-dark">Shop by category</h2>
          </div>
          <Link className="inline-flex items-center gap-[5px] whitespace-nowrap text-[12px] font-extrabold text-green transition-colors hover:text-orange" to="/shop">See all <ArrowRight size={16} /></Link>
        </div>
        {isLoading ? <div className="x-scrollbar grid grid-flow-col auto-cols-[minmax(142px,1fr)] gap-2.5 overflow-x-auto px-0.5 pb-2 pt-[3px] snap-x snap-proximity [scrollbar-gutter:stable] md:auto-cols-[1fr] md:grid-cols-5 md:overflow-visible"
          aria-busy="true" aria-label="Loading categories">
          {Array.from({ length: 5 }, (_, index) => <span className={skeletonClass} key={index} />)}
        </div> : hasError ? <div className={messageClass} role="alert">
          <span>Categories are temporarily unavailable.</span><button type="button" className="border-0 bg-transparent text-orange font-extrabold cursor-pointer" onClick={onRetry}>Try again</button>
        </div> : categories.length ? <div className="x-scrollbar grid grid-flow-col auto-cols-[minmax(142px,1fr)] gap-2.5 overflow-x-auto px-0.5 pb-2 pt-[3px] snap-x snap-proximity [scrollbar-gutter:stable] md:auto-cols-[1fr] md:grid-cols-5 md:overflow-visible">
          {categories.map((category) => <CategoryCard category={category} key={category.id} />)}
        </div> : <div className={messageClass}>No categories are available right now.</div>}
      </div>
    </section>
  )
}