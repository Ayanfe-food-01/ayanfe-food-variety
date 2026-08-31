import type { ProductOptionDraft, WholesaleTierDraft } from '../../services/adminService'

export interface OptionTierRowErrors {
  minQuantity?: string
  maxQuantity?: string
  price?: string
}

export interface OptionRowErrors {
  label?: string
  price?: string
  stockQuantity?: string
  wholesaleMoq?: string
  wholesalePrices?: string
  wholesaleTierErrors?: Record<number, OptionTierRowErrors>
}

interface OptionInputFieldProps {
  options: ProductOptionDraft[]
  errors?: OptionRowErrors[]
  onChange: (options: ProductOptionDraft[]) => void
  maxOptions?: number
}

const MAX_OPTIONS = 50
const MAX_WHOLESALE_TIERS = 30

const inputClassName = 'mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green'

const emptyTier = (): WholesaleTierDraft => ({ minQuantity: '', maxQuantity: '', price: '' })

const isFilledTier = (tier: WholesaleTierDraft): boolean =>
  tier.minQuantity.trim() !== '' || tier.maxQuantity.trim() !== '' || tier.price.trim() !== ''

export function OptionInputField({ options, errors = [], onChange, maxOptions = MAX_OPTIONS }: OptionInputFieldProps) {
  const updateOption = (index: number, field: keyof ProductOptionDraft, value: string) => {
    onChange(options.map((option, currentIndex) => currentIndex === index ? { ...option, [field]: value } : option))
  }

  const updateTier = (optionIndex: number, tierIndex: number, field: keyof WholesaleTierDraft, value: string) => {
    onChange(options.map((option, currentIndex) => {
      if (currentIndex !== optionIndex) return option
      const tiers = option.wholesalePrices ?? []
      const nextTiers = [...tiers]
      nextTiers[tierIndex] = { ...(nextTiers[tierIndex] ?? emptyTier()), [field]: value }
      return { ...option, wholesalePrices: nextTiers }
    }))
  }

  const removeTier = (optionIndex: number, tierIndex: number) => {
    onChange(options.map((option, currentIndex) =>
      currentIndex === optionIndex
        ? { ...option, wholesalePrices: (option.wholesalePrices ?? []).filter((_, index) => index !== tierIndex) }
        : option,
    ))
  }

  const addTier = (optionIndex: number) => {
    onChange(options.map((option, currentIndex) => {
      if (currentIndex !== optionIndex) return option
      const tiers = (option.wholesalePrices ?? []).filter(isFilledTier)
      if (tiers.length >= MAX_WHOLESALE_TIERS) return option
      return { ...option, wholesalePrices: [...tiers, emptyTier()] }
    }))
  }

  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-bold text-green-dark">Quantity / size options (optional)</p>
          <p className="mt-1 text-xs font-normal text-muted">Add sizes or quantities with their own price and stock. The product price becomes the lowest option price and total stock is the sum of all options. Stock left blank defaults to 0.</p>
        </div>
        <button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={options.length >= maxOptions} onClick={() => onChange([...options, { label: '', price: '', stockQuantity: '' }])}>Add option</button>
      </div>
      {options.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-green/25 bg-sage/25 px-4 py-6 text-center text-xs font-normal text-muted">No options yet. Use this when a product is sold in different sizes or quantities.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {options.map((option, index) => (
            <li className="rounded-xl border border-line bg-white p-4" key={`option-${index}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-muted">Option {index + 1}</p>
                <button className="text-xs font-bold text-orange hover:text-green-dark" type="button" aria-label={`Remove option ${index + 1}`} onClick={() => onChange(options.filter((_, currentIndex) => currentIndex !== index))}>Remove</button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-bold text-green-dark">Label<input className={inputClassName} aria-invalid={Boolean(errors[index]?.label)} aria-describedby={errors[index]?.label ? `option-${index}-label-error` : undefined} value={option.label} maxLength={80} onChange={(event) => updateOption(index, 'label', event.target.value)} placeholder="5 kg bag" />{errors[index]?.label && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-label-error`}>{errors[index].label}</span>}</label>
                <label className="text-sm font-bold text-green-dark">Retail price (NGN)<input className={inputClassName} aria-invalid={Boolean(errors[index]?.price)} aria-describedby={errors[index]?.price ? `option-${index}-price-error` : undefined} type="text" inputMode="decimal" value={option.price} onChange={(event) => updateOption(index, 'price', event.target.value)} placeholder="0.00" />{errors[index]?.price && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-price-error`}>{errors[index].price}</span>}</label>
                <label className="text-sm font-bold text-green-dark">Stock<input className={inputClassName} aria-invalid={Boolean(errors[index]?.stockQuantity)} aria-describedby={errors[index]?.stockQuantity ? `option-${index}-stock-error` : undefined} type="number" min="0" step="1" value={option.stockQuantity} onChange={(event) => updateOption(index, 'stockQuantity', event.target.value)} placeholder="0" />{errors[index]?.stockQuantity && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-stock-error`}>{errors[index].stockQuantity}</span>}</label>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-green/25 bg-sage/25 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold text-green-dark">Minimum wholesale order (MOQ){option.wholesaleMoq ? '' : ' (optional)'}<input className={inputClassName} aria-invalid={Boolean(errors[index]?.wholesaleMoq)} aria-describedby={errors[index]?.wholesaleMoq ? `option-${index}-moq-error` : undefined} type="text" inputMode="numeric" value={option.wholesaleMoq ?? ''} onChange={(event) => updateOption(index, 'wholesaleMoq', event.target.value)} placeholder="e.g. 10" />{errors[index]?.wholesaleMoq ? <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-moq-error`}>{errors[index].wholesaleMoq}</span> : <span className="mt-1 block text-xs font-normal text-muted">Leave blank to keep wholesale unavailable for this size.</span>}</label>
                  <div>
                    <p className="text-sm font-bold text-green-dark">Wholesale pricing (optional)</p>
                    <button className="mt-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={(option.wholesalePrices ?? []).filter(isFilledTier).length >= MAX_WHOLESALE_TIERS} onClick={() => addTier(index)}>Add tier</button>
                  </div>
                </div>
                <p className="mt-3 text-xs font-normal text-muted">Set quantity-based wholesale prices for this size, for example 1–9 → ₦4,500, 10–49 → ₦4,200, 50+ → ₦3,900. Leave the last tier&apos;s <span className="font-bold text-green-dark">max qty</span> blank for an unlimited top range such as 50+.</p>
                {(option.wholesalePrices ?? []).length > 0 && (
                  <div className="mt-3">
                    <div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-3 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:grid">
                      <span>Min qty</span><span>Max qty (blank = unlimited)</span><span>Wholesale price (NGN)</span><span />
                    </div>
                    <ul className="mt-1 space-y-2">
                      {(option.wholesalePrices ?? []).map((tier, tierIndex) => {
                        const tierErrors = errors[index]?.wholesaleTierErrors?.[tierIndex]
                        return (
                          <li className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:gap-3" key={tier.id ?? `tier-${index}-${tierIndex}`}>
                            <label className="block text-sm font-bold text-green-dark"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:hidden">Min qty</span><input className={inputClassName} aria-label={`Tier ${tierIndex + 1} minimum quantity`} aria-invalid={Boolean(tierErrors?.minQuantity)} type="text" inputMode="numeric" value={tier.minQuantity} onChange={(event) => updateTier(index, tierIndex, 'minQuantity', event.target.value)} placeholder="1" />{tierErrors?.minQuantity && <span className="mt-1 block text-xs font-normal text-orange">{tierErrors.minQuantity}</span>}</label>
                            <label className="block text-sm font-bold text-green-dark"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:hidden">Max qty (blank = unlimited)</span><input className={inputClassName} aria-label={`Tier ${tierIndex + 1} maximum quantity`} aria-invalid={Boolean(tierErrors?.maxQuantity)} type="text" inputMode="numeric" value={tier.maxQuantity} onChange={(event) => updateTier(index, tierIndex, 'maxQuantity', event.target.value)} placeholder="9" />{tierErrors?.maxQuantity && <span className="mt-1 block text-xs font-normal text-orange">{tierErrors.maxQuantity}</span>}</label>
                            <label className="block text-sm font-bold text-green-dark"><span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted sm:hidden">Wholesale price (NGN)</span><input className={inputClassName} aria-label={`Tier ${tierIndex + 1} wholesale price`} aria-invalid={Boolean(tierErrors?.price)} type="text" inputMode="decimal" value={tier.price} onChange={(event) => updateTier(index, tierIndex, 'price', event.target.value)} placeholder="0.00" />{tierErrors?.price && <span className="mt-1 block text-xs font-normal text-orange">{tierErrors.price}</span>}</label>
                            <button className="justify-self-start rounded-xl border border-line bg-white px-4 py-3 text-xs font-bold text-orange hover:text-green-dark disabled:cursor-not-allowed disabled:opacity-40 sm:justify-self-end" type="button" aria-label={`Remove tier ${tierIndex + 1}`} disabled={(option.wholesalePrices ?? []).filter(isFilledTier).length === 1} onClick={() => removeTier(index, tierIndex)}>Remove</button>
                          </li>
                        )
                      })}
                    </ul>
                    {errors[index]?.wholesalePrices && <p className="mt-2 block text-xs font-normal text-orange">{errors[index].wholesalePrices}</p>}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {options.length >= maxOptions && <p className="mt-3 text-xs font-normal text-orange">You can add at most {maxOptions} options.</p>}
    </div>
  )
}