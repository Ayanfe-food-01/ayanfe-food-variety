import { useEffect, useState, type FormEvent } from 'react'
import { lockBodyScroll } from '../../../../utils/browserCompatibility'
import type { AdminDeliveryZone, DeliveryZoneInput } from '../../../../services/adminService'
import { DeliveryAreaPicker, type AreaTag, type CityTag } from './DeliveryAreaPicker'
import { ZoneFeeFields } from './ZoneFeeFields'

interface ZoneModalProps {
  mode: 'create' | 'edit'
  zone: AdminDeliveryZone | null
  isBusy: boolean
  error: string | null
  onCancel: () => void
  onSave: (input: DeliveryZoneInput) => void
}

const parseAmount = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  if (!Number.isFinite(numeric)) return null
  return Math.round(numeric * 100) / 100
}

const parseDay = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  if (!Number.isInteger(numeric) || numeric < 1) return null
  return numeric
}

export function ZoneModal({ mode, zone, isBusy, error, onCancel, onSave }: ZoneModalProps) {
  const [fee, setFee] = useState(zone ? zone.fee : '')
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(zone?.freeDeliveryThreshold ?? '')
  const [minDeliveryDays, setMinDeliveryDays] = useState(zone?.minDeliveryDays?.toString() ?? '')
  const [maxDeliveryDays, setMaxDeliveryDays] = useState(zone?.maxDeliveryDays?.toString() ?? '')
  const [isActive, setIsActive] = useState(zone?.isActive ?? true)
  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [coverage, setCoverage] = useState<{ cities: CityTag[]; areas: AreaTag[] }>({ cities: [], areas: [] })

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isBusy, onCancel])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const feeAmount = parseAmount(fee)
    if (feeAmount === null || feeAmount <= 0) {
      setFormError('Delivery fee must be greater than zero.')
      return
    }
    const thresholdAmount = parseAmount(freeDeliveryThreshold)
    if (thresholdAmount !== null && thresholdAmount > 0 && thresholdAmount <= feeAmount) {
      setFormError('The free delivery threshold must be greater than the delivery fee.')
      return
    }
    const minDays = parseDay(minDeliveryDays)
    const maxDays = parseDay(maxDeliveryDays)
    if (minDeliveryDays.trim() && minDays === null) {
      setFormError('Minimum delivery days must be a whole number of at least 1.')
      return
    }
    if (maxDeliveryDays.trim() && maxDays === null) {
      setFormError('Maximum delivery days must be a whole number of at least 1.')
      return
    }
    if (minDays !== null && maxDays !== null && minDays > maxDays) {
      setFormError('Minimum delivery days must not be greater than maximum delivery days.')
      return
    }
    if (coverage.cities.length === 0 && coverage.areas.length === 0) {
      setFormError('Add at least one city or area to this delivery zone.')
      return
    }
    onSave({
      fee: feeAmount,
      freeDeliveryThreshold: thresholdAmount && thresholdAmount > 0 ? thresholdAmount : null,
      minDeliveryDays: minDays,
      maxDeliveryDays: maxDays,
      isActive,
      cityIds: coverage.cities.map((city) => city.id),
      areaIds: coverage.areas.map((area) => area.id),
    })
  }

  return (
    <div className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-green-dark/45 p-4" role="presentation">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl shadow-green-dark/20" role="dialog" aria-modal="true" aria-labelledby="delivery-zone-form-title">
        <div className="shrink-0 border-b border-line px-7 pt-5 pb-4 sm:px-8 sm:pt-6 sm:pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">{mode === 'create' ? 'New delivery zone' : 'Edit delivery zone'}</p>
          <h2 id="delivery-zone-form-title" className="mt-1.5 text-xl font-bold tracking-[-0.04em] text-green-dark">{mode === 'create' ? 'Add a delivery zone' : 'Update delivery zone'}</h2>
          <p className="mt-1.5 text-xs leading-5 text-muted">Cover whole LGAs and/or specific areas within them (per LGA it's either the whole LGA or its areas, never both); the fee and estimated delivery time apply to deliveries to every place in this zone.</p>
        </div>
        <div className="y-scrollbar min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={submit}>
          <div className="p-7 sm:p-8">
            {isLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : (
              <div className="space-y-6">
                <DeliveryAreaPicker
                  mode={mode}
                  zoneId={zone?.id}
                  isBusy={isBusy}
                  onLoadingChange={setIsLoading}
                  onCoverageChange={setCoverage}
                  onError={setFormError}
                />
                <ZoneFeeFields
                  fee={fee}
                  freeDeliveryThreshold={freeDeliveryThreshold}
                  minDeliveryDays={minDeliveryDays}
                  maxDeliveryDays={maxDeliveryDays}
                  isActive={isActive}
                  onChangeFee={setFee}
                  onChangeFreeDeliveryThreshold={setFreeDeliveryThreshold}
                  onChangeMinDeliveryDays={setMinDeliveryDays}
                  onChangeMaxDeliveryDays={setMaxDeliveryDays}
                  onChangeIsActive={setIsActive}
                />
              </div>
            )}
            {(formError || error) && <p className="mt-4 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{formError ?? error}</p>}
          </div>

          {!isLoading && (
            <div className="border-t border-line p-7 pt-5 sm:p-8 sm:pt-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={isBusy} onClick={onCancel}>Cancel</button>
                <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-wait disabled:opacity-50" type="submit" disabled={isBusy}>{isBusy ? 'Saving…' : mode === 'create' ? 'Add delivery zone' : 'Save changes'}</button>
              </div>
            </div>
          )}
        </form>
        </div>
      </div>
    </div>
  )
}