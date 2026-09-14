import { SelectField } from '../../../../components/ui/SelectField'
import { OptionInputField, type OptionRowErrors } from '../../../../components/admin/OptionInputField'
import { formatPrice } from '../../../../utils/formatPrice'
import { Field, adminControlClass } from './Field'
import { SectionHeading } from './SectionHeading'
import { MAX_PRODUCT_OPTIONS } from '../constants'
import type { FormErrors } from '../types'
import type { ProductFormInput, ProductOptionDraft } from '../../../../services/adminService'

interface PricingSectionProps {
  hidden: boolean
  form: ProductFormInput
  productId: string | undefined
  hasFilledOptions: boolean
  derivedPrice: string
  derivedStock: number
  errors: FormErrors
  optionErrors: OptionRowErrors[]
  archivedOptions: ProductOptionDraft[]
  fieldProps: (field: keyof FormErrors) => { 'aria-invalid': boolean; 'aria-describedby': string | undefined }
  onUpdate: <Key extends keyof ProductFormInput>(field: Key, value: ProductFormInput[Key]) => void
  onUpdateDiscountType: (value: string) => void
  onOptionsChange: (options: ProductOptionDraft[]) => void
  onRestoreArchived: (index: number) => void
}

export function PricingSection({
  hidden,
  form,
  productId,
  hasFilledOptions,
  derivedPrice,
  derivedStock,
  errors,
  optionErrors,
  archivedOptions,
  fieldProps,
  onUpdate,
  onUpdateDiscountType,
  onOptionsChange,
  onRestoreArchived,
}: PricingSectionProps) {
  return (
    <section aria-labelledby="product-pricing-heading" className={hidden ? 'hidden md:block' : ''}>
      <SectionHeading id="product-pricing-heading" title="Pricing and sizes" hint="Set the price, discount, stock and optional size options." />
      <div className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={`Price (NGN)${hasFilledOptions ? ' — from options' : ''}`}
            htmlFor="product-price-input"
            error={hasFilledOptions ? undefined : errors.price}
            errorId="price-error"
            hint={hasFilledOptions ? 'Set to the lowest option price.' : undefined}
          >
            <input
              id="product-price-input"
              className={`${adminControlClass} disabled:cursor-not-allowed disabled:bg-cream`}
              {...fieldProps('price')}
              type="text"
              inputMode="decimal"
              value={hasFilledOptions ? derivedPrice : form.price}
              disabled={hasFilledOptions}
              onChange={(event) => onUpdate('price', event.target.value)}
              placeholder="0.00"
              required={!hasFilledOptions}
            />
          </Field>
          <Field
            label={`Stock quantity${hasFilledOptions ? ' — from options' : ''}`}
            htmlFor="product-stock-input"
            error={hasFilledOptions ? undefined : errors.stockQuantity}
            errorId="stockQuantity-error"
            hint={hasFilledOptions ? 'Total stock is the sum of all option stock.' : undefined}
          >
            <input
              id="product-stock-input"
              className={`${adminControlClass} disabled:cursor-not-allowed disabled:bg-cream`}
              {...fieldProps('stockQuantity')}
              type="number"
              min="0"
              step="1"
              value={hasFilledOptions ? String(derivedStock) : form.stockQuantity}
              disabled={hasFilledOptions}
              onChange={(event) => onUpdate('stockQuantity', event.target.value)}
              required={!hasFilledOptions}
            />
          </Field>
          {hasFilledOptions ? (
            <div>
              <p className="rounded-xl border border-dashed border-green/25 bg-sage/25 px-4 py-3 text-xs font-normal text-muted">
                Discounts are not available for products with quantity/size options.
              </p>
            </div>
          ) : (
            <div>
              <Field label="Discount type (optional)" htmlFor="product-discount-type" error={errors.discountType} errorId="discountType-error">
                <SelectField
                  id="product-discount-type"
                  className="mt-2 w-full"
                  {...fieldProps('discountType')}
                  onChange={onUpdateDiscountType}
                  options={[
                    { value: '', label: 'No discount' },
                    { value: 'PERCENTAGE', label: 'Percentage discount' },
                    { value: 'FIXED', label: 'Fixed amount discount' },
                  ]}
                  value={form.discountType}
                />
              </Field>
              {form.discountType && (
                <Field
                  className="mt-3 block"
                  label={`Discount value${form.discountType === 'PERCENTAGE' ? ' (%)' : ' (NGN)'}`}
                  htmlFor="product-discount-value"
                  error={errors.discountValue}
                  errorId="discountValue-error"
                >
                  <input
                    id="product-discount-value"
                    className={adminControlClass}
                    {...fieldProps('discountValue')}
                    type="text"
                    inputMode="decimal"
                    value={form.discountValue}
                    onChange={(event) => onUpdate('discountValue', event.target.value)}
                    placeholder={form.discountType === 'PERCENTAGE' ? '10' : '1000'}
                  />
                </Field>
              )}
              <p className="mt-2 text-xs font-normal text-muted">Discounts apply to the product price only.</p>
            </div>
          )}
        </div>
        <div className="max-h-[26rem] overflow-y-auto rounded-2xl border border-line p-1 sm:p-2">
          <OptionInputField
            options={form.options}
            errors={optionErrors}
            maxOptions={MAX_PRODUCT_OPTIONS}
            productId={productId}
            onChange={onOptionsChange}
          />
        </div>
        {archivedOptions.length > 0 && (
          <div className="rounded-2xl border border-line bg-cream/40 p-4">
            <p className="m-0 text-sm font-bold text-green-dark">Previously removed sizes</p>
            <p className="mt-1 text-xs font-normal text-muted">
              These sizes are still linked to past orders and customer carts, so they were kept rather than deleted. Restore one to sell it again — its details are filled from the last saved values.
            </p>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
              {archivedOptions.map((option, index) => (
                <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={option.id ?? `archived-${index}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-green-dark">{option.label}</p>
                    <p className="mt-0.5 text-xs font-normal text-muted">{formatPrice(Number(option.price))} · {option.stockQuantity} in stock</p>
                  </div>
                  <button
                    className="shrink-0 rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    aria-label={`Restore option ${option.label}`}
                    disabled={form.options.length >= MAX_PRODUCT_OPTIONS}
                    onClick={() => onRestoreArchived(index)}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}