import { CloseIcon } from '../../../assets/icons'
import { SelectField } from '../../../components/ui/SelectField'
import { formatPrice } from '../../../utils/formatPrice'
import { MAX_QUANTITY, sortedOptions, type FieldErrors, type QuoteLine } from './lib'

interface QuoteLineCardProps {
  line: QuoteLine
  errors: FieldErrors
  onUpdate: (uid: string, updates: Partial<QuoteLine>) => void
  onRemove: (uid: string) => void
}

export function QuoteLineCard({ line, errors, onUpdate, onRemove }: QuoteLineCardProps) {
  const id = `line-${line.uid}`
  const options = line.product ? sortedOptions(line.product) : []
  const selectOptions = options.map((option) => ({
    value: option.id,
    label: option.stockQuantity <= 0
      ? `${option.label} (Out of stock)`
      : `${option.label} — ${formatPrice(option.price)}`,
  }))
  const unavailableValues = options.filter((option) => option.stockQuantity <= 0).map((option) => option.id)

  return (
    <li key={line.uid} className="rounded-2xl border border-line bg-cream/45 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="break-words font-bold text-green-dark">{line.product?.name}</p>
          {line.product && (
            <p className="mt-0.5 break-words text-xs text-muted">
              {formatPrice(line.product.options?.length ? line.product.price : line.product.discountedPrice)} · {line.product.category}
            </p>
          )}
        </div>
        <button
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:border-orange hover:text-orange"
          type="button"
          aria-label={`Remove ${line.product?.name ?? 'product'} from request`}
          onClick={() => onRemove(line.uid)}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className={`mt-4 grid gap-4 ${line.product?.options?.length ? 'sm:grid-cols-2' : ''}`}>
        {line.product?.options?.length ? (
          <div className="sm:col-span-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor={`${id}-option`}>
                Option / size
              </label>
              <SelectField
                id={`${id}-option`}
                className="w-full"
                disabledOptions={unavailableValues}
                options={selectOptions}
                value={line.optionId ?? ''}
                onChange={(value) => onUpdate(line.uid, { optionId: value })}
                aria-invalid={Boolean(errors[`line-${line.uid}-option`])}
                aria-describedby={errors[`line-${line.uid}-option`] ? `${id}-option-error` : undefined}
              />
              {errors[`line-${line.uid}-option`] && (
                <p className="mt-2 text-xs font-semibold text-orange" id={`${id}-option-error`}>{errors[`line-${line.uid}-option`]}</p>
              )}
            </div>
          </div>
        ) : null}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor={`${id}-quantity`}>
            Quantity required
          </label>
          <input
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${errors[`line-${line.uid}-quantity`] ? 'border-orange/40' : 'border-line'}`}
            id={`${id}-quantity`}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QUANTITY}
            step={1}
            value={line.quantity}
            onChange={(event) => onUpdate(line.uid, { quantity: event.target.value })}
            aria-invalid={Boolean(errors[`line-${line.uid}-quantity`])}
            aria-describedby={errors[`line-${line.uid}-quantity`] ? `${id}-quantity-error` : undefined}
          />
          {errors[`line-${line.uid}-quantity`] && (
            <p className="mt-2 text-xs font-semibold text-orange" id={`${id}-quantity-error`}>{errors[`line-${line.uid}-quantity`]}</p>
          )}
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-green-dark" htmlFor={`${id}-note`}>
            Item note <span className="font-normal normal-case tracking-normal text-muted">(optional)</span>
          </label>
          <input
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 ${errors[`line-${line.uid}-note`] ? 'border-orange/40' : 'border-line'}`}
            id={`${id}-note`}
            placeholder="e.g. separate packaging"
            maxLength={500}
            value={line.note}
            onChange={(event) => onUpdate(line.uid, { note: event.target.value })}
            aria-invalid={Boolean(errors[`line-${line.uid}-note`])}
          />
          {errors[`line-${line.uid}-note`] && (
            <p className="mt-2 text-xs font-semibold text-orange" id={`${id}-note-error`}>{errors[`line-${line.uid}-note`]}</p>
          )}
        </div>
      </div>
    </li>
  )
}