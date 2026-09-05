import type { DeliveryLocationState, FulfillmentMethod, ResolvedDeliveryZone } from '../../services/orderService'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from './types'
import {
  checkoutDescriptionClassName,
  checkoutFieldsetClassName,
  checkoutInputClassName,
  checkoutLegendClassName,
  checkoutSectionClassName,
} from './checkoutStyles'
import { CheckoutFieldError } from './CheckoutFieldError'
import { SelectField } from '../ui/SelectField'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { whatsAppChatUrl } from '../../utils/whatsApp'
import { DeliveryZoneInfo } from './DeliveryZoneInfo'

interface DeliveryStepProps {
  form: CheckoutFormData
  errors: CheckoutFormErrors
  fulfillmentMethod: FulfillmentMethod | ''
  zone: ResolvedDeliveryZone | null
  isZoneResolving: boolean
  zoneError: string | null
  deliveryFee: number | null
  locations: DeliveryLocationState[] | null
  locationsLoading: boolean
  locationsError: string | null
  onReloadLocations: () => void
  onChange: (field: CheckoutField, value: string) => void
}

const deliveryOptions = [
  ['PICKUP', 'Pickup', 'Collect your order from the store. No delivery fee.'],
  ['DELIVERY', 'Delivery', 'Have your order brought to your delivery address.'],
] as const

export function DeliveryStep({
  form,
  errors,
  fulfillmentMethod,
  zone,
  isZoneResolving,
  zoneError,
  deliveryFee,
  locations,
  locationsLoading,
  locationsError,
  onReloadLocations,
  onChange,
}: DeliveryStepProps) {
  const isDelivery = fulfillmentMethod === 'DELIVERY'
  const { settings } = useStoreSettings()
  const whatsappNumber = settings?.whatsappNumber?.trim()
  const whatsappUrl = whatsappNumber ? whatsAppChatUrl(whatsappNumber) : null

  const selectedState = locations?.find((state) => state.id === form.state)
  const selectedCityId = form.cityId || selectedState?.cities.find((city) => city.name === form.city)?.id || ''
  const selectedCity = selectedState?.cities.find((city) => city.id === selectedCityId) ?? null
  const cityAreas = selectedCity?.areas ?? []

  return (
    <section className={checkoutSectionClassName}>
      <fieldset className={checkoutFieldsetClassName}>
        <legend className={checkoutLegendClassName}>Delivery method</legend>
        <p className={checkoutDescriptionClassName}>
          Choose pickup or delivery. This selection is saved with your order and cannot change after it is placed.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {deliveryOptions.map(([value, label, description]) => (
            <label
              className={`block cursor-pointer rounded-2xl border p-5 transition-colors ${
                fulfillmentMethod === value
                  ? 'border-green bg-sage/30'
                  : 'border-line bg-white hover:border-green/40'
              }`}
              key={value}
            >
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 size-4 accent-green"
                  type="radio"
                  name="fulfillmentMethod"
                  value={value}
                  checked={fulfillmentMethod === value}
                  onChange={() => onChange('fulfillmentMethod', value)}
                  aria-describedby="fulfillmentMethod-error"
                />
                <span>
                  <span className="block text-sm font-bold text-green-dark">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        <CheckoutFieldError id="fulfillmentMethod" message={errors.fulfillmentMethod} />

        {isDelivery && (
          <div className="mt-8 grid gap-6">
            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="address">
                Delivery address <span className="text-orange" aria-hidden="true">*</span>
              </label>
              <textarea
                className={`${checkoutInputClassName(Boolean(errors.address))} min-h-28 resize-y`}
                id="address"
                name="address"
                autoComplete="street-address"
                placeholder="House number, street name, landmark"
                value={form.address}
                onChange={(event) => onChange('address', event.target.value)}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? 'address-error' : undefined}
                required
              />
              <CheckoutFieldError id="address" message={errors.address} />
            </div>

            <div>
              {locationsLoading && locations === null ? (
                <p className="text-sm text-muted">Loading delivery locations…</p>
              ) : locationsError ? (
                <div className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">
                  <p>{locationsError}</p>
                  <button
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-orange/30 bg-white px-3 py-2 text-xs font-bold text-green-dark hover:bg-cream disabled:cursor-wait disabled:opacity-50"
                    type="button"
                    onClick={onReloadLocations}
                    disabled={locationsLoading}
                  >
                    {locationsLoading ? 'Loading…' : 'Retry loading locations'}
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-green-dark">
                    State <span className="text-orange" aria-hidden="true">*</span>
                    <SelectField
                      className="mt-2 w-full"
                      options={[
                        { value: '', label: 'Select your state' },
                        ...(locations ?? []).map((state) => ({ value: state.id, label: state.name })),
                      ]}
                      onChange={(value) => {
                        onChange('state', value)
                        if (value) {
                          onChange('city', '')
                          onChange('cityId', '')
                          onChange('area', '')
                          onChange('areaId', '')
                        }
                      }}
                      value={form.state}
                      aria-invalid={Boolean(errors.state)}
                      aria-describedby={errors.state ? 'state-error' : undefined}
                    />
                  </label>
                  <label className="block text-sm font-bold text-green-dark">
                    City / LGA <span className="text-orange" aria-hidden="true">*</span>
                    <SelectField
                      className="mt-2 w-full"
                      options={[
                        { value: '', label: 'Select your city' },
                        ...(selectedState?.cities ?? []).map((city) => ({ value: city.id, label: city.name })),
                      ]}
                      onChange={(value) => {
                        const city = selectedState?.cities.find((item) => item.id === value)
                        onChange('city', city?.name ?? '')
                        onChange('cityId', value)
                        onChange('area', '')
                        onChange('areaId', '')
                      }}
                      value={selectedCityId}
                      disabled={!form.state}
                      aria-invalid={Boolean(errors.city)}
                      aria-describedby={errors.city ? 'city-error' : undefined}
                    />
                  </label>
                </div>
              )}
              {!locationsError && (
                <div className="mt-3">
                  {cityAreas.length > 0 && (
                    <>
                      <label className="block text-sm font-bold text-green-dark">
                        Area <span className="font-normal text-muted">(optional)</span>
                        <SelectField
                          className="mt-2 w-full"
                          options={[
                            { value: '', label: 'Select your area (optional)' },
                            ...cityAreas.map((area) => ({
                              value: area.id,
                              label: area.servable ? area.name : `${area.name} (delivery unavailable)`,
                            })),
                          ]}
                          disabledOptions={cityAreas.filter((area) => !area.servable).map((area) => area.id)}
                          onChange={(value) => {
                            const area = cityAreas.find((item) => item.id === value)
                            onChange('area', area?.name ?? '')
                            onChange('areaId', area ? value : '')
                          }}
                          value={form.areaId}
                          aria-invalid={Boolean(errors.areaId)}
                          aria-describedby={errors.areaId ? 'areaId-error' : undefined}
                        />
                      </label>
                      <p className="mt-1 text-xs text-muted">
                        Optional — narrows the delivery zone if your street is managed as an area.
                      </p>
                      <CheckoutFieldError id="areaId" message={errors.areaId} />
                    </>
                  )}
                  <CheckoutFieldError id="state" message={errors.state} />
                  <CheckoutFieldError id="city" message={errors.city} />
                </div>
              )}
            </div>

            {form.city.trim() ? (
              <DeliveryZoneInfo
                zone={zone}
                isResolving={isZoneResolving}
                error={zoneError}
                deliveryFee={deliveryFee}
                whatsappUrl={whatsappUrl}
              />
            ) : null}

            <div>
              <label className="text-sm font-bold text-green-dark" htmlFor="deliveryInstructions">
                Delivery instructions <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                className={`${checkoutInputClassName(false)} min-h-24 resize-y`}
                id="deliveryInstructions"
                name="deliveryInstructions"
                placeholder="Landmark, preferred delivery time, or other helpful details"
                value={form.deliveryInstructions}
                onChange={(event) => onChange('deliveryInstructions', event.target.value)}
              />
            </div>
          </div>
        )}
      </fieldset>
    </section>
  )
}