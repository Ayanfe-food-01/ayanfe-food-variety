import { SelectField, type SelectOption } from '../ui/SelectField'
import type { Category } from '../../types/category'

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
  const isCategorySelected = (category: Category) =>
    categoryValue === category.slug || categoryValue === category.id

  return (
    <div className="shop-filters" aria-label="Product filters">
      <div className="shop-filter-heading">
        <span>Browse categories</span>
        {!isCategoriesLoading && <span className="shop-filter-count">{categories.length + 1} options</span>}
      </div>

      <div className="shop-category-rail" role="list" aria-label="Product categories" aria-busy={isCategoriesLoading}>
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

      <div className="shop-filter-divider" />

      <div className="shop-sort-row">
        <span className="shop-sort-label">Sort by:</span>
        {sortDisabled ? (
          <span className="shop-sort-static">Newest</span>
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