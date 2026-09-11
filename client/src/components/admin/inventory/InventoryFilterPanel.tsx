import { FilterBar } from '../../filters/FilterBar'
import type { Category } from '../../../types/category'
import type { InventoryQuery } from '../../../services/inventoryService'

interface InventoryFilterPanelProps {
  categories: Category[]
  query: InventoryQuery
  searchInput: string
  onSearchInputChange: (value: string) => void
  onApply: (query: Partial<InventoryQuery>) => void
}

const fields = (categories: Category[]) => [
  {
    key: 'categoryId',
    label: 'Category',
    type: 'select' as const,
    quick: true,
    options: [
      { value: '', label: 'All categories' },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
  },
]

export function InventoryFilterPanel({
  categories,
  query,
  searchInput,
  onSearchInputChange,
  onApply,
}: InventoryFilterPanelProps) {
  const filterFields = fields(categories)

  const committed: Record<string, string> = {
    categoryId: query.categoryId ?? '',
  }

  const applyFilters = (next: Record<string, string>) => {
    onApply({
      categoryId: next.categoryId || undefined,
    })
  }

  return (
    <FilterBar
      fields={filterFields}
      quickFields={filterFields}
      committed={committed}
      onApply={applyFilters}
      search={{
        label: 'Search inventory',
        value: searchInput,
        onChange: onSearchInputChange,
        onSearch: (value) => onApply({ search: value.trim() || undefined }),
        placeholder: 'Product or option',
      }}
    />
  )
}