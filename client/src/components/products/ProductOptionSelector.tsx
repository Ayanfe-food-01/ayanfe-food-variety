import { SelectField } from '../ui/SelectField'
import { formatPrice } from '../../utils/formatPrice'
import type { ProductOption } from '../../types/product'

interface ProductOptionSelectorProps {
  options: readonly ProductOption[]
  selectedOptionId: string | null
  onSelect: (optionId: string) => void
  disabled?: boolean
}

export function ProductOptionSelector({
  options,
  selectedOptionId,
  onSelect,
  disabled = false,
}: ProductOptionSelectorProps) {
  if (options.length === 0) return null

  if (options.length === 1) {
    const option = options[0]
    const isUnavailable = option.stockQuantity <= 0
    return (
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-green-dark">Choose quantity/size</p>
        <div className={`flex h-12 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 ${isUnavailable ? 'opacity-70' : ''}`}>
          <span className="truncate text-sm font-bold text-green-dark">{option.label}</span>
          <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-muted">
            {formatPrice(option.price)}
            {isUnavailable && <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-orange">Out of stock</span>}
          </span>
        </div>
      </div>
    )
  }

  const selectOptions = options.map((option) => ({
    value: option.id,
    label: option.stockQuantity <= 0
      ? `${option.label} — ${formatPrice(option.price)} (Out of stock)`
      : `${option.label} — ${formatPrice(option.price)}`,
  }))
  const unavailableValues = options
    .filter((option) => option.stockQuantity <= 0)
    .map((option) => option.id)

  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor="product-option-select">
        Choose quantity/size
      </label>
      <SelectField
        ariaLabel="Choose a quantity or size option"
        className="product-option-select"
        disabled={disabled}
        disabledOptions={unavailableValues}
        id="product-option-select"
        onChange={onSelect}
        options={selectOptions}
        value={selectedOptionId ?? ''}
      />
    </div>
  )
}