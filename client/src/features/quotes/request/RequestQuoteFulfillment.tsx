import { DeliveryLocationFields } from '../../../components/checkout/DeliveryLocationFields'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from '../../../components/checkout/types'
import type { DeliveryDraft, FieldErrors, QuoteFulfillmentMethod } from './lib'

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p className="mt-1.5 text-xs font-medium text-orange" id={`${id}-error`} role="alert">
      {message}
    </p>
  ) : null
}

interface RequestQuoteFulfillmentProps {
  method: QuoteFulfillmentMethod
  delivery: DeliveryDraft
  errors: FieldErrors
  onMethodChange: (method: QuoteFulfillmentMethod) => void
  onDeliveryChange: (patch: Partial<DeliveryDraft>) => void
  clearError: (field: string) => void
}

const METHOD_OPTIONS: Array<{ value: QuoteFulfillmentMethod; label: string; hint: string }> = [
  { value: 'PICKUP', label: 'Pickup', hint: 'Collect from our store — no delivery fee.' },
  { value: 'DELIVERY', label: 'Delivery', hint: 'We deliver to your address; the fee is confirmed with your quote.' },
]

// Adapts the shared checkout location picker to the quote request draft. The
// picker reads the state id from `state`, so the draft's stateId is mapped in.
const toLocationForm = (delivery: DeliveryDraft): CheckoutFormData => ({
  fullName: '',
  phone: '',
  email: '',
  fulfillmentMethod: 'DELIVERY',
  state: delivery.stateId,
  cityId: delivery.cityId,
  city: delivery.city,
  areaId: delivery.areaId,
  area: delivery.area,
  address: '',
  deliveryInstructions: '',
  paymentMethod: 'BANK_TRANSFER',
})

const toLocationErrors = (errors: FieldErrors): CheckoutFormErrors => ({
  state: errors.state,
  city: errors.city,
  areaId: errors.areaId,
})

export function RequestQuoteFulfillment({
  method,
  delivery,
  errors,
  onMethodChange,
  onDeliveryChange,
  clearError,
}: RequestQuoteFulfillmentProps) {
  const handleLocationChange = (field: CheckoutField, value: string) => {
    switch (field) {
      case 'state':
        onDeliveryChange({ stateId: value })
        clearError('state')
        break
      case 'cityId':
        onDeliveryChange({ cityId: value })
        clearError('city')
        break
      case 'city':
        onDeliveryChange({ city: value })
        break
      case 'areaId':
        onDeliveryChange({ areaId: value })
        clearError('areaId')
        break
      case 'area':
        onDeliveryChange({ area: value })
        break
      default:
        break
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8" aria-labelledby="fulfillment-heading">
      <h2 id="fulfillment-heading" className="text-xl font-bold text-green-dark">Pickup or delivery</h2>
      <p className="mt-1 text-sm text-muted">Tell us how you would like to receive your order.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {METHOD_OPTIONS.map((option) => {
          const selected = method === option.value
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                selected ? 'border-green bg-sage/35' : 'border-line bg-white hover:bg-sage/20'
              }`}
            >
              <input
                className="mt-1"
                type="radio"
                name="fulfillmentMethod"
                value={option.value}
                checked={selected}
                onChange={() => onMethodChange(option.value)}
              />
              <span>
                <span className="block text-sm font-bold text-green-dark">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{option.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <FieldError id="fulfillmentMethod" message={errors.fulfillmentMethod} />

      {method === 'PICKUP' && (
        <p className="mt-4 rounded-xl bg-sage/35 p-4 text-sm text-muted" role="status">
          We will confirm the pickup location and opening hours with your quotation.
        </p>
      )}

      {method === 'DELIVERY' && (
        <div className="mt-5 rounded-2xl border border-line bg-cream/40 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-green-dark">Delivery location</h3>
          <div className="mt-3">
            <DeliveryLocationFields
              form={toLocationForm(delivery)}
              errors={toLocationErrors(errors)}
              onChange={handleLocationChange}
            />
          </div>
          <label className="mt-4 block text-sm font-bold text-green-dark">
            Delivery address <span className="text-orange" aria-hidden="true">*</span>
            <textarea
              className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-green-dark outline-none transition-colors focus:border-green"
              rows={3}
              value={delivery.address}
              maxLength={500}
              placeholder="Street, building, landmark"
              onChange={(event) => {
                onDeliveryChange({ address: event.target.value })
                clearError('deliveryAddress')
              }}
              aria-invalid={Boolean(errors.deliveryAddress)}
              aria-describedby={errors.deliveryAddress ? 'deliveryAddress-error' : undefined}
            />
          </label>
          <FieldError id="deliveryAddress" message={errors.deliveryAddress} />
        </div>
      )}
    </section>
  )
}
