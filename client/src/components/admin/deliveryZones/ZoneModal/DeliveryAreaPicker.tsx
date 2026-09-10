import { useEffect, useState } from 'react'
import { SelectField } from '../../../ui/SelectField'
import { ApiError } from '../../../../services/api'
import {
  getAdminDeliveryLocationStates,
  getAdminDeliveryZone,
  type AdminDeliveryLocationState,
} from '../../../../services/adminService'

export interface CityTag {
  id: string
  name: string
}

export interface AreaTag {
  id: string
  name: string
  cityName: string
}

interface DeliveryAreaPickerProps {
  mode: 'create' | 'edit'
  zoneId?: string
  isBusy: boolean
  onLoadingChange: (isLoading: boolean) => void
  onCoverageChange: (coverage: { cities: CityTag[]; areas: AreaTag[] }) => void
  onError: (message: string | null) => void
}

export function DeliveryAreaPicker({ mode, zoneId, isBusy, onLoadingChange, onCoverageChange, onError }: DeliveryAreaPickerProps) {
  const [states, setStates] = useState<AdminDeliveryLocationState[] | null>(null)
  const [cities, setCities] = useState<CityTag[]>([])
  const [areas, setAreas] = useState<AreaTag[]>([])
  const [selectedStateId, setSelectedStateId] = useState('')
  const [selectedCityId, setSelectedCityId] = useState('')
  const [coverageMode, setCoverageMode] = useState<'whole' | 'areas'>('whole')
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([])

  useEffect(() => {
    onLoadingChange(true)
    let current = true
    const load = async () => {
      try {
        const loadedStates = await getAdminDeliveryLocationStates()
        if (!current) return
        setStates(loadedStates)
        if (mode === 'edit' && zoneId) {
          const detail = await getAdminDeliveryZone(zoneId)
          if (current) {
            setCities(detail.cities.map((city) => ({ id: city.id, name: city.name })))
            setAreas(detail.areas.map((area) => ({ id: area.id, name: area.name, cityName: area.cityName })))
          }
        }
      } catch (caught: unknown) {
        if (current) onError(caught instanceof ApiError ? caught.message : 'Delivery locations could not be loaded.')
      } finally {
        if (current) onLoadingChange(false)
      }
    }
    void load()
    return () => { current = false }
  }, [mode, zoneId, onLoadingChange, onError])

  useEffect(() => {
    onCoverageChange({ cities, areas })
  }, [cities, areas, onCoverageChange])

  const selectedState = states?.find((state) => state.id === selectedStateId)
  const selectedCity = (selectedState?.cities ?? []).find((city) => city.id === selectedCityId)
  const coveredCityIds = new Set(cities.map((city) => city.id))
  const coveredAreaIds = new Set(areas.map((area) => area.id))
  const cityOptions = (selectedState?.cities ?? [])
    .filter((city) => !coveredCityIds.has(city.id))
    .map((city) => ({
      value: city.id,
      label: city.assignedZoneLabel
        ? `${city.name} (assigned to ${city.assignedZoneLabel})`
        : city.name,
      hasOwner: Boolean(city.assignedZoneLabel),
    }))

  const cityAreas = selectedCity?.adminAreas ?? []
  const areaOptions = cityAreas
    .filter((area) => !coveredAreaIds.has(area.id))
    .map((area) => {
      const reasons: string[] = []
      if (!area.isActive) reasons.push('inactive')
      if (area.assignedZoneId) reasons.push(`assigned to ${area.assignedZoneLabel}`)
      return {
        value: area.id,
        name: area.name,
        label: reasons.length > 0 ? `${area.name} (${reasons.join(', ')})` : area.name,
        disabled: Boolean(area.assignedZoneId) || !area.isActive,
      }
    })

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((current) => (current.includes(areaId) ? current.filter((id) => id !== areaId) : [...current, areaId]))
  }

  const addCity = () => {
    if (!selectedCityId) return
    const city = cityOptions.find((c) => c.value === selectedCityId)
    if (!city) return
    if (city.hasOwner) {
      onError(city.label)
      return
    }
    const cityName = selectedState?.cities.find((c) => c.id === city.value)?.name
    setCities((current) => [...current, { id: city.value, name: cityName ?? city.label }])
  }

  const addAreas = () => {
    if (!selectedCity) return
    if (selectedAreaIds.length === 0) {
      onError(`Select at least one area in ${selectedCity.name}, or add the whole LGA instead.`)
      return
    }
    const invalid = selectedAreaIds.find((areaId) => {
      const area = areaOptions.find((option) => option.value === areaId)
      return !area || area.disabled
    })
    if (invalid) {
      onError('One or more selected areas are no longer available. Re-check the list and try again.')
      return
    }
    setAreas((current) => [
      ...current,
      ...selectedAreaIds.map((areaId) => {
        const name = areaOptions.find((option) => option.value === areaId)?.name ?? ''
        return { id: areaId, name, cityName: selectedCity.name }
      }),
    ])
  }

  const addPlace = () => {
    onError(null)
    if (coverageMode === 'areas') addAreas()
    else addCity()
    setSelectedAreaIds([])
    setSelectedCityId('')
    setCoverageMode('whole')
  }

  const removeCity = (cityId: string) => {
    setCities((current) => current.filter((city) => city.id !== cityId))
  }

  const removeArea = (areaId: string) => {
    setAreas((current) => current.filter((area) => area.id !== areaId))
  }

  return (
    <section aria-label="Delivery area">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Delivery area — places this zone covers ({cities.length + areas.length})</h3>
      {(cities.length > 0 || areas.length > 0) && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {cities.map((city) => (
            <li className="inline-flex items-center gap-2 rounded-full border border-line bg-sage/30 py-1.5 pl-3 pr-1.5" key={city.id}>
              <span className="text-sm font-bold text-green-dark">{city.name}</span>
              <button
                aria-label={`Remove ${city.name}`}
                className="grid size-6 place-items-center rounded-full bg-white text-muted transition hover:bg-orange hover:text-white"
                type="button"
                onClick={() => removeCity(city.id)}
              >
                ✕
              </button>
            </li>
          ))}
          {areas.map((area) => (
            <li className="inline-flex items-center gap-2 rounded-full border border-orange/25 bg-orange/5 py-1.5 pl-3 pr-1.5" key={area.id}>
              <span className="text-sm font-bold text-green-dark">{area.name}, <span className="font-medium text-muted">{area.cityName}</span></span>
              <button
                aria-label={`Remove ${area.name} in ${area.cityName}`}
                className="grid size-6 place-items-center rounded-full bg-white text-muted transition hover:bg-orange hover:text-white"
                type="button"
                onClick={() => removeArea(area.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {cities.length + areas.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-orange/30 bg-orange/5 px-4 py-3 text-xs leading-5 text-muted">
          No places added yet. Add a whole LGA or specific areas above to define this zone's coverage.
        </p>
      )}

      <div className="mt-4 rounded-2xl border border-line bg-cream/45 p-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Add places</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-green-dark">
            State
            <SelectField
              className="mt-2 w-full"
              options={[
                { value: '', label: 'Select a state' },
                ...(states ?? []).map((state) => ({ value: state.id, label: state.name })),
              ]}
              onChange={(value) => { setSelectedStateId(value); setSelectedCityId(''); setSelectedAreaIds([]); setCoverageMode('whole') }}
              value={selectedStateId}
            />
          </label>
          <label className="block text-xs font-bold text-green-dark">
            City / LGA
            <SelectField
              className="mt-2 w-full"
              options={cityOptions}
              onChange={(value) => { setSelectedCityId(value); setSelectedAreaIds([]); setCoverageMode('whole') }}
              value={selectedCityId}
              searchable
              placeholder="Type to search or select a city"
            />
          </label>
        </div>
        {selectedStateId && !selectedCityId && cityOptions.length === 0 && (
          <p className="mt-3 text-sm text-muted">No cities found in this state.</p>
        )}
        {selectedCity && (
          <fieldset className="mt-4">
            <legend className="text-xs font-bold text-green-dark">
              Coverage in {selectedCity.name}
            </legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2.5 text-sm font-semibold text-green-dark">
                <input
                  type="radio"
                  name="coverage-mode"
                  className="size-4 rounded border-line"
                  checked={coverageMode === 'whole'}
                  onChange={() => setCoverageMode('whole')}
                />
                Entire {selectedCity.name} LGA
              </label>
              <label className="flex items-center gap-2.5 text-sm font-semibold text-green-dark">
                <input
                  type="radio"
                  name="coverage-mode"
                  className="size-4 rounded border-line"
                  checked={coverageMode === 'areas'}
                  onChange={() => { setCoverageMode('areas'); setSelectedAreaIds([]) }}
                />
                Specific areas
              </label>
            </div>
            {coverageMode === 'areas' && (
              cityAreas.length > 0 ? (
                <>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {areaOptions.map((area) => (
                      <li key={area.value}>
                        <label className={`inline-flex items-start gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${area.disabled ? 'cursor-not-allowed border-line text-muted' : 'cursor-pointer border-line bg-white text-green-dark hover:border-green'}`}>
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 rounded border-line"
                            checked={selectedAreaIds.includes(area.value)}
                            disabled={area.disabled}
                            onChange={() => toggleArea(area.value)}
                          />
                          {area.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Checking one or more areas adds them as this zone's coverage — the rest of {selectedCity.name} is served by the LGA's own zone. Unavailable areas are greyed out.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted">No areas are defined for {selectedCity.name}, so this place can only be added in full.</p>
              )
            )}
          </fieldset>
        )}
        <div className="mt-4 flex justify-end">
          <button
            className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={!selectedCityId || isBusy}
            onClick={addPlace}
          >
            {coverageMode === 'areas'
              ? (selectedAreaIds.length === 1 ? 'Add 1 area' : `Add ${selectedAreaIds.length} areas`)
              : selectedCity ? `Add ${selectedCity.name}` : 'Add city'}
          </button>
        </div>
      </div>
    </section>
  )
}