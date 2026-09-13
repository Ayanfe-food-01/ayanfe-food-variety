import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getDeliveryLocationStates, type DeliveryLocationState } from '../../services/orderService'
import { SelectField } from '../ui/SelectField'
import { emptyAddressLocation, type AddressLocationValue } from './addressLocation'

// State, LGA / City, and Area pickers for the address book, backed by the same
// public delivery-location data used at checkout. Areas only appear once their
// LGA is selected, and locations without a servable delivery option are shown
// but marked unavailable so they cannot be picked as a delivery address.

interface AddressLocationFieldsProps {
  value: AddressLocationValue
  errors?: { state?: string; city?: string; areaId?: string }
  onChange: (next: AddressLocationValue) => void
}

export function AddressLocationFields({ value, errors = {}, onChange }: AddressLocationFieldsProps) {
  const [locations, setLocations] = useState<DeliveryLocationState[] | null>(null)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [locationsLoading, setLocationsLoading] = useState(false)

  const loadLocations = () => {
    setLocationsLoading(true)
    setLocationsError(null)
    getDeliveryLocationStates()
      .then(setLocations)
      .catch((caught: unknown) => {
        setLocationsError(caught instanceof ApiError ? caught.message : 'Locations could not be loaded.')
      })
      .finally(() => setLocationsLoading(false))
  }

  useEffect(() => {
    if (locations === null && !locationsError && !locationsLoading) {
      // Boot the location picker lazily from the API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadLocations()
    }
  }, [locations, locationsError, locationsLoading])

  // When editing a saved address only a city (name or id) may be available, so
  // once the location data loads we resolve the missing state and area against
  // the selected city. Guarded so it only fires when the state is actually
  // missing, which prevents loops and preserves intentional user changes.
  useEffect(() => {
    if (!locations || value.stateId) return
    const cityId = value.cityId
    const cityName = value.cityName.trim().toLowerCase()
    if (!cityId && !cityName) return
    for (const state of locations) {
      for (const city of state.cities) {
        const matchesId = Boolean(cityId) && city.id === cityId
        const matchesName = !cityId && cityName && city.name.toLowerCase() === cityName
        if (!matchesId && !matchesName) continue
        onChange({
          ...value,
          stateId: state.id,
          stateName: state.name,
          cityId: city.id,
          cityName: city.name,
        })
        return
      }
    }
  }, [locations, onChange, value])

  const selectedState = locations?.find((state) => state.id === value.stateId)
  const injectedCity = selectedState?.cities.find((city) => city.id === value.cityId)
  const effectiveCityId = value.cityId || injectedCity?.id || ''
  const selectedCity = selectedState?.cities.find((city) => city.id === effectiveCityId) ?? null
  const cityAreas = selectedCity?.areas ?? []
  const inservableStateIds = (locations ?? []).filter((state) => !state.servable).map((state) => state.id)
  const inservableCityIds = (selectedState?.cities ?? []).filter((city) => !city.servable).map((city) => city.id)

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
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="text-sm font-bold text-green-dark" htmlFor="address-state">
            State <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <div className="mt-2">
            <SelectField
              id="address-state"
              ariaLabel="State"
              placeholder="Select your state"
              options={[
                { value: '', label: 'Select your state' },
                ...(locations ?? []).map((state) => ({ value: state.id, label: state.name })),
              ]}
              disabledOptions={inservableStateIds}
              value={value.stateId}
              aria-invalid={Boolean(errors.state)}
              aria-describedby={errors.state ? 'address-state-error' : undefined}
              required
              onChange={(nextId) => {
                const state = (locations ?? []).find((item) => item.id === nextId)
                onChange({ ...emptyAddressLocation, stateId: nextId, stateName: state?.name ?? '' })
              }}
            />
          </div>
          {errors.state && (
            <p className="mt-1.5 text-xs font-medium text-orange" id="address-state-error" role="alert">{errors.state}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-bold text-green-dark" htmlFor="address-city">
            LGA / City <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <div className="mt-2">
            <SelectField
              id="address-city"
              ariaLabel="LGA or city"
              placeholder="Select your city"
              options={[
                { value: '', label: 'Select your city' },
                ...(selectedState?.cities ?? []).map((city) => ({
                  value: city.id,
                  label: city.servable ? city.name : `${city.name} — delivery unavailable`,
                })),
              ]}
              disabledOptions={inservableCityIds}
              disabled={!value.stateId}
              value={effectiveCityId}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? 'address-city-error' : undefined}
              required
              onChange={(nextId) => {
                const city = selectedState?.cities.find((item) => item.id === nextId)
                onChange({
                  ...value,
                  cityId: nextId,
                  cityName: city?.name ?? '',
                  areaId: '',
                  areaName: '',
                })
              }}
            />
          </div>
          {errors.city && (
            <p className="mt-1.5 text-xs font-medium text-orange" id="address-city-error" role="alert">{errors.city}</p>
          )}
        </div>
      </div>

      {cityAreas.length > 0 && (
        <div className="max-w-sm">
          <label className="text-sm font-bold text-green-dark" htmlFor="address-area">
            Area <span className="font-normal text-muted">(optional)</span>
          </label>
          <div className="mt-2">
            <SelectField
              id="address-area"
              ariaLabel="Area"
              placeholder="Select your area (optional)"
              options={[
                { value: '', label: 'Select your area (optional)' },
                ...cityAreas.map((area) => ({
                  value: area.id,
                  label: area.servable ? area.name : `${area.name} (delivery unavailable)`,
                })),
              ]}
              disabledOptions={cityAreas.filter((area) => !area.servable).map((area) => area.id)}
              value={value.areaId}
              aria-invalid={Boolean(errors.areaId)}
              aria-describedby={errors.areaId ? 'address-area-error' : undefined}
              onChange={(nextId) => {
                const area = cityAreas.find((item) => item.id === nextId)
                onChange({ ...value, areaId: area ? nextId : '', areaName: area?.name ?? '' })
              }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            Optional — narrows the delivery zone if your street is managed as an area.
          </p>
          {errors.areaId && (
            <p className="mt-1.5 text-xs font-medium text-orange" id="address-area-error" role="alert">{errors.areaId}</p>
          )}
        </div>
      )}
    </div>
  )
}