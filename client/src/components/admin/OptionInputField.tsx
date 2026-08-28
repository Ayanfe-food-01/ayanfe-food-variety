import type { ProductOptionDraft } from '../../services/adminService'

export interface OptionRowErrors {
  label?: string
  price?: string
  stockQuantity?: string
}

interface OptionInputFieldProps {
  options: ProductOptionDraft[]
  errors?: OptionRowErrors[]
  onChange: (options: ProductOptionDraft[]) => void
  maxOptions?: number
}

const MAX_OPTIONS = 50

const inputClassName = 'mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green'

export function OptionInputField({ options, errors = [], onChange, maxOptions = MAX_OPTIONS }: OptionInputFieldProps) {
  const updateOption = (index: number, field: keyof ProductOptionDraft, value: string) => {
    onChange(options.map((option, currentIndex) => currentIndex === index ? { ...option, [field]: value } : option))
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, currentIndex) => currentIndex !== index))
  }

  const addOption = () => {
    if (options.length >= maxOptions) return
    onChange([...options, { label: '', price: '', stockQuantity: '' }])
  }

  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-bold text-green-dark">Quantity / size options (optional)</p>
          <p className="mt-1 text-xs font-normal text-muted">Add sizes or quantities with their own price and stock. The product price becomes the lowest option price and total stock is the sum of all options. Stock left blank defaults to 0.</p>
        </div>
        <button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={options.length >= maxOptions} onClick={addOption}>Add option</button>
      </div>
      {options.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-green/25 bg-sage/25 px-4 py-6 text-center text-xs font-normal text-muted">No options yet. Use this when a product is sold in different sizes or quantities.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {options.map((option, index) => (
            <li className="rounded-xl border border-line bg-white p-4" key={`option-${index}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-muted">Option {index + 1}</p>
                <button className="text-xs font-bold text-orange hover:text-green-dark" type="button" aria-label={`Remove option ${index + 1}`} onClick={() => removeOption(index)}>Remove</button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-bold text-green-dark">Label<input className={inputClassName} aria-invalid={Boolean(errors[index]?.label)} aria-describedby={errors[index]?.label ? `option-${index}-label-error` : undefined} value={option.label} maxLength={80} onChange={(event) => updateOption(index, 'label', event.target.value)} placeholder="5 kg bag" />{errors[index]?.label && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-label-error`}>{errors[index].label}</span>}</label>
                <label className="text-sm font-bold text-green-dark">Price (NGN)<input className={inputClassName} aria-invalid={Boolean(errors[index]?.price)} aria-describedby={errors[index]?.price ? `option-${index}-price-error` : undefined} type="text" inputMode="decimal" value={option.price} onChange={(event) => updateOption(index, 'price', event.target.value)} placeholder="0.00" />{errors[index]?.price && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-price-error`}>{errors[index].price}</span>}</label>
                <label className="text-sm font-bold text-green-dark">Stock<input className={inputClassName} aria-invalid={Boolean(errors[index]?.stockQuantity)} aria-describedby={errors[index]?.stockQuantity ? `option-${index}-stock-error` : undefined} type="number" min="0" step="1" value={option.stockQuantity} onChange={(event) => updateOption(index, 'stockQuantity', event.target.value)} placeholder="0" />{errors[index]?.stockQuantity && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-stock-error`}>{errors[index].stockQuantity}</span>}</label>
              </div>
            </li>
          ))}
        </ul>
      )}
      {options.length >= maxOptions && <p className="mt-3 text-xs font-normal text-orange">You can add at most {maxOptions} options.</p>}
    </div>
  )
}