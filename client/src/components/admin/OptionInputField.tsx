import { useEffect, useState } from 'react'
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../../assets/icons'
import type { ProductOptionDraft, WholesaleTierDraft } from '../../services/adminService'
import { formatPrice } from '../../utils/formatPrice'

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

const inputClassName = 'w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green'
const tierInputClassName = 'w-full rounded-lg border border-line px-3 py-2 text-sm font-normal outline-none focus:border-green'
const tierHeaderClassName = 'border-b border-line px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted'

const emptyTier = (): WholesaleTierDraft => ({ minQuantity: '', maxQuantity: '', price: '' })

const isFilledTier = (tier: WholesaleTierDraft): boolean =>
  tier.minQuantity.trim() !== '' || tier.maxQuantity.trim() !== '' || tier.price.trim() !== ''

const rowHasErrors = (rowErrors: OptionRowErrors | undefined): boolean => Object.keys(rowErrors ?? {}).length > 0

const hasWholesale = (option: ProductOptionDraft): boolean =>
  Boolean(option.wholesaleMoq?.trim()) || (option.wholesalePrices ?? []).length > 0

export function OptionInputField({ options, errors = [], onChange, maxOptions = MAX_OPTIONS }: OptionInputFieldProps) {
  const [openOptionIndex, setOpenOptionIndex] = useState<number | null>(null)
  const openIndex = openOptionIndex !== null && openOptionIndex < options.length ? openOptionIndex : null
  const [wholesaleOptionIndex, setWholesaleOptionIndex] = useState<number | null>(null)
  const modalIndex = wholesaleOptionIndex !== null && wholesaleOptionIndex < options.length ? wholesaleOptionIndex : null
  const modalOption = modalIndex === null ? undefined : options[modalIndex]

  useEffect(() => {
    if (modalIndex === null) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWholesaleOptionIndex(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [modalIndex])

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

  const toggleWholesale = (optionIndex: number) => {
    onChange(options.map((option, currentIndex) => {
      if (currentIndex !== optionIndex) return option
      if (hasWholesale(option)) return { ...option, wholesaleMoq: undefined, wholesalePrices: [] }
      return { ...option, wholesaleMoq: '', wholesalePrices: [emptyTier()] }
    }))
  }

  const filledTierCount = (option: ProductOptionDraft): number => (option.wholesalePrices ?? []).filter(isFilledTier).length

  const optionSummary = (option: ProductOptionDraft, index: number): { title: string; detail: string } => {
    const label = option.label.trim()
    const parsedPrice = Number(option.price)
    const price = Number.isFinite(parsedPrice) && parsedPrice > 0 ? formatPrice(parsedPrice) : 'Price not set'
    const stock = option.stockQuantity.trim() === '' ? '0' : option.stockQuantity.trim()
    return {
      title: label || `Option ${index + 1}`,
      detail: `${price} · ${stock} in stock${hasWholesale(option) ? ' · Wholesale' : ''}`,
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-bold text-green-dark">Quantity / size options (optional)</p>
          <p className="mt-1 text-xs font-normal text-muted">Add sizes or quantities with their own price and stock. The product price becomes the lowest option price and total stock is the sum of all options. Stock left blank defaults to 0.</p>
        </div>
        <button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={options.length >= maxOptions} onClick={() => { onChange([...options, { label: '', price: '', stockQuantity: '' }]); setOpenOptionIndex(options.length) }}>Add option</button>
      </div>
      {options.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-green/25 bg-sage/25 px-4 py-6 text-center text-xs font-normal text-muted">No options yet. Use this when a product is sold in different sizes or quantities.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {options.map((option, index) => {
            const isOpen = openIndex === index
            const rowErrors = errors[index]
            const tierCount = filledTierCount(option)
            const summary = optionSummary(option, index)
            return (
              <li className="overflow-hidden rounded-xl border border-line bg-white" key={option.id ?? `option-${index}`}>
                <div className="flex flex-wrap items-center gap-2 px-4 py-3.5">
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" type="button" aria-expanded={isOpen} onClick={() => setOpenOptionIndex(isOpen ? null : index)}>
                    <ChevronDownIcon size={16} className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-green-dark">{summary.title}</span>
                      <span className="mt-0.5 block truncate text-xs font-normal text-muted">{summary.detail}</span>
                    </span>
                  </button>
                  {(rowHasErrors(rowErrors) || tierCount > 0) && (
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${rowHasErrors(rowErrors) ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'}`}>
                      {rowHasErrors(rowErrors) ? 'Fix required' : hasWholesale(option) ? `Wholesale · ${tierCount} tier${tierCount === 1 ? '' : 's'}` : ''}
                    </span>
                  )}
                  <button className="grid size-8 shrink-0 place-items-center rounded-full text-orange transition-colors hover:bg-orange/10 hover:text-green-dark" type="button" aria-label={`Remove option ${index + 1}`} onClick={() => onChange(options.filter((_, currentIndex) => currentIndex !== index))}><CloseIcon size={15} /></button>
                </div>
                {isOpen && (
                  <div className="border-t border-line p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-sm font-bold text-green-dark">Label<input className={inputClassName} aria-invalid={Boolean(rowErrors?.label)} aria-describedby={rowErrors?.label ? `option-${index}-label-error` : undefined} value={option.label} maxLength={80} onChange={(event) => updateOption(index, 'label', event.target.value)} placeholder="5 kg bag" />{rowErrors?.label && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-label-error`}>{rowErrors.label}</span>}</label>
                      <label className="text-sm font-bold text-green-dark">Retail price (NGN)<input className={inputClassName} aria-invalid={Boolean(rowErrors?.price)} aria-describedby={rowErrors?.price ? `option-${index}-price-error` : undefined} type="text" inputMode="decimal" value={option.price} onChange={(event) => updateOption(index, 'price', event.target.value)} placeholder="0.00" />{rowErrors?.price && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-price-error`}>{rowErrors.price}</span>}</label>
                      <label className="text-sm font-bold text-green-dark">Stock<input className={inputClassName} aria-invalid={Boolean(rowErrors?.stockQuantity)} aria-describedby={rowErrors?.stockQuantity ? `option-${index}-stock-error` : undefined} type="number" min="0" step="1" value={option.stockQuantity} onChange={(event) => updateOption(index, 'stockQuantity', event.target.value)} placeholder="0" />{rowErrors?.stockQuantity && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-stock-error`}>{rowErrors.stockQuantity}</span>}</label>
                    </div>

                    <div className="mt-4 rounded-xl border border-dashed border-green/25 bg-sage/25 p-3">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input className="mt-0.5 size-4 shrink-0 accent-green" type="checkbox" checked={hasWholesale(option)} onChange={() => {
                          const enabling = !hasWholesale(option)
                          toggleWholesale(index)
                          if (enabling) setWholesaleOptionIndex(index)
                          else setWholesaleOptionIndex(null)
                        }} />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-green-dark">Enable wholesale pricing for this size</span>
                          <span className="mt-0.5 block text-xs font-normal leading-5 text-muted">Quantity-based prices for wholesale buyers, plus an optional minimum order.</span>
                        </span>
                      </label>
                      {hasWholesale(option) && (
                        <button className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-green-dark transition-colors hover:border-green" type="button" onClick={() => setWholesaleOptionIndex(index)}>
                          Manage wholesale pricing
                          <span className="text-muted">({tierCount} tier{tierCount === 1 ? '' : 's'})</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {options.length >= maxOptions && <p className="mt-3 text-xs font-normal text-orange">You can add at most {maxOptions} options.</p>}

      {modalOption && modalIndex !== null && (
        <div className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-green-dark/45" role="presentation" onClick={() => setWholesaleOptionIndex(null)}>
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl shadow-green-dark/20"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wholesale-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Wholesale pricing</p>
                <h2 id="wholesale-modal-title" className="mt-1 truncate text-lg font-bold tracking-[-0.02em] text-green-dark">{modalOption.label.trim() || `Option ${modalIndex + 1}`}</h2>
              </div>
              <button className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-cream hover:text-green-dark" type="button" aria-label="Close wholesale pricing" onClick={() => setWholesaleOptionIndex(null)}><CloseIcon size={18} /></button>
            </header>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                <label className="text-sm font-bold text-green-dark">Minimum wholesale order (MOQ){modalOption.wholesaleMoq ? '' : ' (optional)'}
                  <input className={`${inputClassName} mt-2`} aria-invalid={Boolean(errors[modalIndex]?.wholesaleMoq)} aria-describedby={errors[modalIndex]?.wholesaleMoq ? `wholesale-moq-error` : undefined} type="text" inputMode="numeric" value={modalOption.wholesaleMoq ?? ''} onChange={(event) => updateOption(modalIndex, 'wholesaleMoq', event.target.value)} placeholder="e.g. 10" />
                  {errors[modalIndex]?.wholesaleMoq ? <span className="mt-1 block text-xs font-normal text-orange" id="wholesale-moq-error">{errors[modalIndex].wholesaleMoq}</span> : <span className="mt-1 block text-xs font-normal text-muted">Leave blank to keep wholesale unavailable below any tier price.</span>}
                </label>
                <div className="flex flex-wrap items-end justify-between gap-2 sm:justify-end">
                  <button className="rounded-xl bg-green px-4 py-3 text-xs font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={filledTierCount(modalOption) >= MAX_WHOLESALE_TIERS} onClick={() => addTier(modalIndex)}>Add tier</button>
                </div>
              </div>

              <p className="mt-4 text-xs font-normal leading-5 text-muted">Set quantity-based wholesale prices for this size, for example 1–9 → ₦4,500, 10–49 → ₦4,200, 50+ → ₦3,900. Leave the last tier&apos;s <span className="font-bold text-green-dark">max qty</span> blank for an unlimited top range such as 50+.</p>

              {(modalOption.wholesalePrices ?? []).length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="text-muted">
                        <th className={tierHeaderClassName}>Min qty</th>
                        <th className={tierHeaderClassName}>Max qty (blank = unlimited)</th>
                        <th className={tierHeaderClassName}>Wholesale price (NGN)</th>
                        <th className={`${tierHeaderClassName} text-right`}><span className="sr-only">Remove tier</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(modalOption.wholesalePrices ?? []).map((tier, tierIndex) => {
                        const tierErrors = errors[modalIndex]?.wholesaleTierErrors?.[tierIndex]
                        return (
                          <tr className="border-b border-line last:border-b-0" key={tier.id ?? `tier-${modalIndex}-${tierIndex}`}>
                            <td className="px-3 py-2 align-top">
                              <input className={tierInputClassName} aria-label={`Tier ${tierIndex + 1} minimum quantity`} aria-invalid={Boolean(tierErrors?.minQuantity)} type="text" inputMode="numeric" value={tier.minQuantity} onChange={(event) => updateTier(modalIndex, tierIndex, 'minQuantity', event.target.value)} placeholder="1" />
                              {tierErrors?.minQuantity && <span className="mt-1 block text-xs font-normal text-orange">{tierErrors.minQuantity}</span>}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input className={tierInputClassName} aria-label={`Tier ${tierIndex + 1} maximum quantity`} aria-invalid={Boolean(tierErrors?.maxQuantity)} type="text" inputMode="numeric" value={tier.maxQuantity} onChange={(event) => updateTier(modalIndex, tierIndex, 'maxQuantity', event.target.value)} placeholder="9" />
                              {tierErrors?.maxQuantity && <span className="mt-1 block text-xs font-normal text-orange">{tierErrors.maxQuantity}</span>}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input className={tierInputClassName} aria-label={`Tier ${tierIndex + 1} wholesale price`} aria-invalid={Boolean(tierErrors?.price)} type="text" inputMode="decimal" value={tier.price} onChange={(event) => updateTier(modalIndex, tierIndex, 'price', event.target.value)} placeholder="0.00" />
                              {tierErrors?.price && <span className="mt-1 block text-xs font-normal text-orange">{tierErrors.price}</span>}
                            </td>
                            <td className="px-3 py-2 text-right align-top">
                              <button className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-white text-orange transition-colors hover:text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" aria-label={`Remove tier ${tierIndex + 1}`} disabled={filledTierCount(modalOption) === 1} onClick={() => removeTier(modalIndex, tierIndex)}><CloseIcon size={14} /></button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-green/25 bg-sage/25 px-4 py-4 text-center text-xs font-normal text-muted">No tiers yet. Add at least one quantity range and price, or set only a minimum order above.</p>
              )}
              {errors[modalIndex]?.wholesalePrices && <p className="mt-2 block text-xs font-normal text-orange" role="alert">{errors[modalIndex].wholesalePrices}</p>}
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">
              <button className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark transition-colors hover:bg-cream" type="button" onClick={() => setWholesaleOptionIndex(null)}>Cancel</button>
              <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark" type="button" onClick={() => setWholesaleOptionIndex(null)}>
                <span className="mr-2 inline-grid size-4 place-items-center rounded-full text-cream"><CheckIcon size={12} /></span>
                Done
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}