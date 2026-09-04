import { SelectField, type SelectOption } from '../ui/SelectField'
import type { Category } from '../../types/category'
import { useHorizontalScrollIndicator } from '../../hooks/useHorizontalScrollIndicator'

interface ProductFiltersProps {
  categories: Category[]
  categoryValue: string
  isCategoriesLoading: boolean
  sortOptions: readonly SelectOption[]
  sortValue: string
  sortDisabled?: boolean
  onCategoryChange: (value: string) => void
  onSortChange: (value: string) => void
}

export function ProductFilters({
  categories,
  categoryValue,
  isCategoriesLoading,
  sortOptions,
  sortValue,
  sortDisabled = false,
  onCategoryChange,
  onSortChange,
}: ProductFiltersProps) {
  const { isScrolling, thumbWidth, thumbOffset, onScroll } = useHorizontalScrollIndicator()
  const isCategorySelected = (category: Category) =>
    categoryValue === category.slug || categoryValue === category.id

  return (
    <div className="shop-filters" aria-label="Product filters">
      <div className="shop-filter-heading">
        <span>Browse categories</span>
        {!isCategoriesLoading && <span className="shop-filter-count">{categories.length + 1} options</span>}
      </div>

      <div
        className={`shop-category-rail x-scrollbar ${isScrolling ? 'is-scrolling' : ''}`}
        role="list"
        aria-label="Product categories"
        aria-busy={isCategoriesLoading}
        onScroll={(event) => onScroll(event.currentTarget)}
      >
        <button
          className={`shop-category-chip ${!categoryValue ? 'is-active' : ''}`}
          type="button"
          aria-pressed={!categoryValue}
          onClick={() => onCategoryChange('')}
          disabled={isCategoriesLoading}
        >
          All categories
        </button>
        {isCategoriesLoading
          ? Array.from({ length: 4 }, (_, index) => <span className="shop-category-chip-skeleton" aria-hidden="true" key={index} />)
          : categories.map((category) => (
            <button
              className={`shop-category-chip ${isCategorySelected(category) ? 'is-active' : ''}`}
              type="button"
              aria-pressed={isCategorySelected(category)}
              onClick={() => onCategoryChange(category.slug)}
              key={category.id}
            >
              {category.name}
            </button>
          ))}
      </div>
      <div className={`shop-category-scroll-indicator ${isScrolling ? 'is-visible' : ''}`} aria-hidden="true">
        <span style={{ width: `${thumbWidth}%`, transform: `translateX(${thumbOffset}%)` }} />
      </div>

      <div className="shop-filter-divider" />

      <div className="shop-sort-row">
        <span className="shop-sort-label">Sort by:</span>
        {sortDisabled ? (
          <span className="min-w-[110px] py-1 text-green-dark font-bold">Newest</span>
        ) : (
          <SelectField
            ariaLabel="Sort products"
            className="shop-sort-select"
            options={sortOptions}
            onChange={onSortChange}
            value={sortValue}
            variant="compact"
          />
        )}
      </div>
    </div>
  )
}