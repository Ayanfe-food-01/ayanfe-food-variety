import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getDeliveryLocationStates, type DeliveryLocationState } from '../../services/orderService'
import { SelectField } from '../ui/SelectField'
import { CheckoutFieldError } from './CheckoutFormSections'
import type { CheckoutField, CheckoutFormData, CheckoutFormErrors } from './types'

// State, City / LGA, and Area pickers backed by the public delivery-location
// endpoint. Locations where delivery is unavailable (a state or city with no
// covering delivery zone) are shown greyed out and cannot be selected.
interface DeliveryLocationFieldsProps {
  form: CheckoutFormData
  errors: CheckoutFormErrors
  onChange: (field: CheckoutField, value: string) => void
}

export function DeliveryLocationFields({ form, errors, onChange }: DeliveryLocationFieldsProps) {
  const [locations, setLocations] = useState<DeliveryLocationState[] | null>(null)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [locationsLoading, setLocationsLoading] = useState(false)

  const loadLocations = () => {
    setLocationsLoading(true)
    setLocationsError(null)
    getDeliveryLocationStates()
      .then((loaded) => setLocations(loaded))
      .catch((caught: unknown) => {
        setLocationsError(caught instanceof ApiError ? caught.message : 'Locations could not be loaded.')
      })
      .finally(() => setLocationsLoading(false))
  }

  useEffect(() => {
    if (locations === null && !locationsError && !locationsLoading) {
      // Boot the location picker once per delivery session; setState is
      // intentional here because the picker must lazy-load from the API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadLocations()
    }
  }, [locations, locationsError, locationsLoading])

  const selectedState = locations?.find((state) => state.id === form.state)
  const selectedCityId = form.cityId || selectedState?.cities.find((city) => city.name === form.city)?.id || ''
  const selectedCity = selectedState?.cities.find((city) => city.id === selectedCityId) ?? null
  const cityAreas = selectedCity?.areas ?? []
  const inservableStateIds = (locations ?? []).filter((state) => !state.servable).map((state) => state.id)
  const inservableCityIds = (selectedState?.cities ?? []).filter((city) => !city.servable).map((city) => city.id)

  const resetChildLocation = () => {
    onChange('city', '')
    onChange('cityId', '')
    onChange('area', '')
    onChange('areaId', '')
  }

  if (locationsLoading && locations === null) {
    return <p className="text-sm text-muted">Loading delivery locations…</p>
  }

  if (locationsError) {
    return (
      <div className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">
        <p>{locationsError}</p>
        <button
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-orange/30 bg-white px-3 py-2 text-xs font-bold text-green-dark hover:bg-cream disabled:cursor-wait disabled:opacity-50"
          type="button"
          onClick={loadLocations}
          disabled={locationsLoading}
        >
          {locationsLoading ? 'Loading…' : 'Retry loading locations'}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold text-green-dark">
          State <span className="text-orange" aria-hidden="true">*</span>
          <SelectField
            className="mt-2 w-full"
            options={[
              { value: '', label: 'Select your state' },
              ...(locations ?? []).map((state) => ({ value: state.id, label: state.name })),
            ]}
            disabledOptions={inservableStateIds}
            onChange={(value) => {
              onChange('state', value)
              if (value) resetChildLocation()
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
              ...(selectedState?.cities ?? []).map((city) => ({
                value: city.id,
                label: city.servable ? city.name : `${city.name} — delivery unavailable`,
              })),
            ]}
            disabledOptions={inservableCityIds}
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
      {cityAreas.length > 0 && (
        <div className="mt-3 sm:mt-0">
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
        </div>
      )}
      {locationsError ? null : (
        <div className="mt-0">
          <CheckoutFieldError id="state" message={errors.state} />
          <CheckoutFieldError id="city" message={errors.city} />
        </div>
      )}
    </>
  )
}