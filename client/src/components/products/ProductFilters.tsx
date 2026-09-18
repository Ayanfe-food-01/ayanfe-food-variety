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

const CHIP_BASE =
  'flex-none min-h-9 rounded-full border border-line bg-card px-3.5 text-[10px] font-extrabold whitespace-nowrap cursor-pointer transition-[border-color,background-color,color,transform] duration-200 hover:border-green hover:bg-sage hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-[rgb(217_111_60/0.28)] focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70'
const CHIP_ACTIVE = 'border-green bg-green text-cream'

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
    <div className="block min-w-0 overflow-hidden rounded-[14px] border border-line bg-[#fdfaf9] px-4 pt-[14px] pb-3" aria-label="Product filters">
      <div className="mb-[9px] flex items-center justify-between gap-3 text-[10px] font-extrabold uppercase tracking-[.06em] text-green-dark">
        <span>Browse categories</span>
        {!isCategoriesLoading && <span className="text-[9px] font-bold tracking-[.02em] normal-case text-muted">{categories.length + 1} options</span>}
      </div>

      <div
        className={`flex max-w-full items-center gap-[7px] overflow-x-auto px-px pt-[3px] pb-[15px] overscroll-x-contain x-scrollbar ${isScrolling ? 'is-scrolling' : ''}`}
        role="list"
        aria-label="Product categories"
        aria-busy={isCategoriesLoading}
        onScroll={(event) => onScroll(event.currentTarget)}
      >
        <button
          className={`${CHIP_BASE} ${!categoryValue ? CHIP_ACTIVE : ''}`}
          type="button"
          aria-pressed={!categoryValue}
          onClick={() => onCategoryChange('')}
          disabled={isCategoriesLoading}
        >
          All categories
        </button>
        {isCategoriesLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <span
                className="flex-none min-h-9 w-[92px] rounded-full bg-sage animate-pulse"
                aria-hidden="true"
                key={index}
              />
            ))
          : categories.map((category) => (
            <button
              className={`${CHIP_BASE} ${isCategorySelected(category) ? CHIP_ACTIVE : ''}`}
              type="button"
              aria-pressed={isCategorySelected(category)}
              onClick={() => onCategoryChange(category.slug)}
              key={category.id}
            >
              {category.name}
            </button>
          ))}
      </div>
      <div className="relative h-px mt-px mb-[7px] bg-line" aria-hidden="true">
        <span
          className="absolute left-0 top-0 h-full rounded-full bg-green transition-transform duration-200"
          style={{ width: `${thumbWidth}%`, transform: `translateX(${thumbOffset}%)` }}
        />
      </div>

      <div className="flex min-h-[30px] items-center gap-[7px] text-[11px] text-muted">
        <span className="whitespace-nowrap">Sort by:</span>
        {sortDisabled ? (
          <span className="min-w-[110px] py-1 text-green-dark font-bold">Newest</span>
        ) : (
          <SelectField
            ariaLabel="Sort products"
            className="min-w-[110px] text-green-dark font-bold"
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