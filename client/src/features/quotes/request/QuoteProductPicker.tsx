import { SearchIcon } from '../../../assets/icons'
import type { Product } from '../../../types/product'
import { formatPrice } from '../../../utils/formatPrice'

interface ProductSearchState {
  suggestions: Product[]
  isLoading: boolean
  hasError: boolean
}

interface QuoteProductPickerProps {
  search: string
  error: string | null
  picker: ProductSearchState
  disabled: boolean
  onSearchChange: (value: string) => void
  alreadyAdded: (product: Product) => boolean
  onAdd: (product: Product) => void
}

export function QuoteProductPicker({
  search,
  error,
  picker,
  disabled,
  onSearchChange,
  alreadyAdded,
  onAdd,
}: QuoteProductPickerProps) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-green/25 bg-sage/20 p-4 sm:p-5">
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="quote-product-search">
        Add a product
      </label>
      <div className="relative mt-3">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          className="w-full rounded-xl border border-line bg-white py-3 pl-12 pr-4 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
          id="quote-product-search"
          type="search"
          autoComplete="off"
          placeholder="Search for a product to add…"
          disabled={disabled}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      {error && (
        <p className="mt-3 rounded-xl border border-orange/25 bg-orange/5 p-3 text-sm font-semibold text-orange" role="alert">
          {error}
        </p>
      )}
      {search.trim().length >= 2 && (
        <div className="mt-3">
          {picker.isLoading ? (
            <p className="text-sm text-muted">Searching…</p>
          ) : picker.hasError ? (
            <p className="text-sm text-muted">Products could not be searched right now.</p>
          ) : picker.suggestions.length === 0 ? (
            <p className="text-sm text-muted">No products match your search.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white" role="listbox" aria-label="Product search results">
              {picker.suggestions.map((product) => {
                const isAdded = alreadyAdded(product)
                return (
                  <li key={product.id}>
                    <button
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-sage/30 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      role="option"
                      aria-selected="false"
                      disabled={isAdded}
                      onClick={() => onAdd(product)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-green-dark">{product.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted">{product.category}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-muted">
                        {isAdded ? 'Added' : formatPrice(product.discountedPrice)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}