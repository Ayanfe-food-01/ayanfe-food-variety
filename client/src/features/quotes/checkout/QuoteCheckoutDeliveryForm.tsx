import type { ResolvedDeliveryZone } from '../../../services/orderService'
import { formatPrice } from '../../../utils/formatPrice'
import { whatsAppChatUrl } from '../../../utils/whatsApp'
import { useStoreSettings } from '../../../hooks/useStoreSettings'
import { CheckoutFieldError } from '../../../components/checkout/CheckoutFormSections'
import { DeliveryLocationFields } from '../../../components/checkout/DeliveryLocationFields'
import { DeliveryZoneInfo } from '../../../components/checkout/DeliveryZoneInfo'
import {
  checkoutFieldsetClassName,
  checkoutInputClassName,
  checkoutDescriptionClassName,
  checkoutLegendClassName,
  checkoutSectionClassName,
} from '../../../components/checkout/checkoutStyles'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from '../../../components/checkout/types'

interface QuoteCheckoutDeliveryFormProps {
  form: CheckoutFormData
  errors: CheckoutFormErrors
  onChange: (field: CheckoutField, value: string) => void
  zone: ResolvedDeliveryZone | null
  isZoneResolving: boolean
  zoneError: string | null
  deliveryFee: number | null
  hasOverride: boolean
}

export function QuoteCheckoutDeliveryForm({
  form,
  errors,
  onChange,
  zone,
  isZoneResolving,
  zoneError,
  deliveryFee,
  hasOverride,
}: QuoteCheckoutDeliveryFormProps) {
  const { settings } = useStoreSettings()
  const whatsappNumber = settings?.whatsappNumber?.trim()
  const whatsappUrl = whatsappNumber ? whatsAppChatUrl(whatsappNumber) : null

  return (
    <section className={checkoutSectionClassName}>
      <fieldset className={checkoutFieldsetClassName}>
        <legend className={checkoutLegendClassName}>Delivery details</legend>
        <p className={checkoutDescriptionClassName}>
          {hasOverride
            ? 'Tell us where to deliver. The delivery fee was fixed by the store and is already included in your quotation.'
            : 'Tell us where to deliver. The delivery fee is calculated from your delivery zone and added to your total.'}
        </p>
        <div className="mt-6 grid gap-6">
          <div>
            <label className="text-sm font-bold text-green-dark" htmlFor="quote-delivery-address">
              Delivery address <span className="text-orange" aria-hidden="true">*</span>
            </label>
            <textarea
              className={`${checkoutInputClassName(Boolean(errors.address))} min-h-28 resize-y`}
              id="quote-delivery-address"
              placeholder="House number, street name, landmark"
              value={form.address}
              onChange={(event) => onChange('address', event.target.value)}
            />
            <CheckoutFieldError id="address" message={errors.address} />
          </div>

          <DeliveryLocationFields form={form} errors={errors} onChange={onChange} />

          {hasOverride ? (
            <div className="rounded-2xl border border-green/25 bg-sage/30 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Delivery fee</p>
              <p className="mt-2 text-sm font-bold text-green-dark">
                {deliveryFee === 0 ? 'Free delivery' : formatPrice(deliveryFee ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted">Fixed by the store and included in your accepted quotation.</p>
            </div>
          ) : form.city.trim() ? (
            <DeliveryZoneInfo
              zone={zone}
              isResolving={isZoneResolving}
              error={zoneError}
              deliveryFee={deliveryFee}
              whatsappUrl={whatsappUrl}
            />
          ) : null}

          <div>
            <label className="text-sm font-bold text-green-dark" htmlFor="quote-delivery-instructions">
              Delivery instructions <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              className={`${checkoutInputClassName(false)} min-h-24 resize-y`}
              id="quote-delivery-instructions"
              placeholder="Landmark, preferred delivery time, or other helpful details"
              value={form.deliveryInstructions}
              onChange={(event) => onChange('deliveryInstructions', event.target.value)}
            />
          </div>
        </div>
      </fieldset>
    </section>
  )
}
