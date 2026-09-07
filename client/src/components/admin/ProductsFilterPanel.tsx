import type { Category } from '../../types/category'
import { ChevronDownIcon } from '../../assets/icons'
import { useDropdown } from '../../hooks/useDropdown'
import type { FilterValues } from '../filters/filterTypes'
import { FilterBar } from '../filters/FilterBar'
import { Popover } from '../ui/Popover'
import type { AdminProductsQuery } from '../../services/adminService'

interface ProductsFilterPanelProps {
  categories: Category[]
  query: AdminProductsQuery
  searchInput: string
  onSearchInputChange: (value: string) => void
  onSearch: (value: string) => void
  onApply: (query: Partial<AdminProductsQuery>) => void
  onReset: () => void
  onSortChange: (sort: AdminProductsQuery['sort']) => void
}

const priceRanges = [
  { value: '', label: 'Any price' },
  { value: '0-5000', label: 'Under ₦5,000' },
  { value: '5000-20000', label: '₦5,000–₦20,000' },
  { value: '20000-50000', label: '₦20,000–₦50,000' },
  { value: '50000+', label: '₦50,000+' },
]

type ProductSort = NonNullable<AdminProductsQuery['sort']>

const sortOptions: Array<{ value: ProductSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'stock_asc', label: 'Lowest stock first' },
  { value: 'stock_desc', label: 'Highest stock first' },
]

const fields = (categories: Category[]) => [
  {
    key: 'categoryIds',
    label: 'Category',
    type: 'multi-select' as const,
    quick: true,
    searchable: true,
    group: 'Catalog',
    placeholder: 'Search categories',
    options: categories.map((category) => ({ value: category.id, label: category.name })),
  },
  {
    key: 'availability',
    label: 'Store status',
    type: 'select' as const,
    quick: true,
    group: 'Status',
    options: [
      { value: '', label: 'All statuses' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    key: 'stockStatus',
    label: 'Stock status',
    type: 'select' as const,
    quick: true,
    group: 'Inventory',
    options: [
      { value: '', label: 'All stock levels' },
      { value: 'in-stock', label: 'Healthy stock' },
      { value: 'low-stock', label: 'Low stock' },
      { value: 'out-of-stock', label: 'Out of stock' },
    ],
  },
  {
    key: 'featured',
    label: 'Featured',
    type: 'select' as const,
    group: 'Status',
    options: [
      { value: '', label: 'All products' },
      { value: 'true', label: 'Featured' },
      { value: 'false', label: 'Not featured' },
    ],
  },
  {
    key: 'discount',
    label: 'Discount',
    type: 'select' as const,
    group: 'Pricing',
    options: [
      { value: '', label: 'All pricing' },
      { value: 'on-sale', label: 'On sale' },
      { value: 'no-discount', label: 'No discount' },
    ],
  },
  {
    key: 'priceRange',
    label: 'Price range',
    type: 'select' as const,
    group: 'Pricing',
    options: priceRanges,
  },
  {
    key: 'productType',
    label: 'Product structure',
    type: 'select' as const,
    group: 'Catalog',
    options: [
      { value: '', label: 'All products' },
      { value: 'simple', label: 'Simple products' },
      { value: 'with-options', label: 'Products with options' },
    ],
  },
  {
    key: 'wholesale',
    label: 'Wholesale',
    type: 'select' as const,
    group: 'Catalog',
    options: [
      { value: '', label: 'All products' },
      { value: 'enabled', label: 'Wholesale enabled' },
      { value: 'not-configured', label: 'Not configured' },
    ],
  },
]

const parsePriceRange = (value: string): Pick<AdminProductsQuery, 'minPrice' | 'maxPrice'> => {
  if (!value) return { minPrice: undefined, maxPrice: undefined }
  if (value.endsWith('+')) return { minPrice: value.slice(0, -1), maxPrice: undefined }
  const [minPrice, maxPrice] = value.split('-')
  return { minPrice, maxPrice }
}

const priceRangeFor = (query: AdminProductsQuery): string => {
  if (query.minPrice === '0' && query.maxPrice === '5000') return '0-5000'
  if (query.minPrice === '5000' && query.maxPrice === '20000') return '5000-20000'
  if (query.minPrice === '20000' && query.maxPrice === '50000') return '20000-50000'
  if (query.minPrice === '50000' && !query.maxPrice) return '50000+'
  return ''
}

export function ProductsFilterPanel({
  categories,
  query,
  searchInput,
  onSearchInputChange,
  onSearch,
  onApply,
  onReset,
  onSortChange,
}: ProductsFilterPanelProps) {
  const { isOpen: isSortOpen, close: closeSort, toggle: toggleSort, rootRef: sortRootRef } = useDropdown()
  const filterFields = fields(categories)
  const committed: FilterValues = {
    categoryIds: query.categoryIds?.join(',') ?? query.categoryId ?? '',
    availability: query.availability ?? '',
    stockStatus: query.stockStatus ?? '',
    featured: query.featured ?? '',
    discount: query.discount ?? '',
    priceRange: priceRangeFor(query),
    productType: query.productType ?? '',
    wholesale: query.wholesale ?? '',
  }

  const applyFilters = (next: FilterValues) => {
    const priceRange = parsePriceRange(next.priceRange ?? '')
    onApply({
      categoryIds: next.categoryIds ? next.categoryIds.split(',').filter(Boolean) : undefined,
      categoryId: undefined,
      availability: (next.availability || undefined) as AdminProductsQuery['availability'],
      stockStatus: (next.stockStatus || undefined) as AdminProductsQuery['stockStatus'],
      featured: next.featured ? next.featured as 'true' | 'false' : undefined,
      discount: (next.discount || undefined) as AdminProductsQuery['discount'],
      productType: (next.productType || undefined) as AdminProductsQuery['productType'],
      wholesale: (next.wholesale || undefined) as AdminProductsQuery['wholesale'],
      ...priceRange,
    })
  }

  return (
    <div className="products-filter-panel">
      <FilterBar
        className="products-filter-bar"
        fields={filterFields}
        quickFields={filterFields.filter((field) => field.quick)}
        committed={committed}
        onApply={applyFilters}
        onReset={onReset}
        search={{
          label: 'Search products',
          value: searchInput,
          onChange: onSearchInputChange,
          onSearch,
          placeholder: 'Name or description',
        }}
      />
      <div className="products-sort-control" ref={sortRootRef}>
        <button
          className="products-sort-trigger"
          type="button"
          aria-haspopup="menu"
          aria-expanded={isSortOpen}
          onClick={toggleSort}
        >
          <span className="products-sort-icon" aria-hidden="true">↕</span>
          <span>Sort</span>
          <ChevronDownIcon className={`products-sort-chevron ${isSortOpen ? 'rotate-180' : ''}`} size={14} aria-hidden="true" />
        </button>
        <Popover
          isOpen={isSortOpen}
          onClose={closeSort}
          className="products-sort-menu"
          role="menu"
          ariaLabel="Sort products"
        >
          {(close) => (
            <div className="products-sort-options">
              {sortOptions.map((option) => {
                const isSelected = option.value === (query.sort ?? 'newest')
                return (
                  <button
                    className={`products-sort-option${isSelected ? ' is-selected' : ''}`}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value)
                      close()
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
        </Popover>
      </div>
    </div>
  )
}