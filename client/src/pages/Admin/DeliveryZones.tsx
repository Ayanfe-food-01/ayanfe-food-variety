import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActionMenu, ActionMenuButton } from '../../components/admin/ActionMenu'
import { useToast } from '../../components/ui/Toast'
import { SelectField } from '../../components/ui/SelectField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import {
  assignCityToDeliveryZone,
  createAdminDeliveryZone,
  deleteAdminDeliveryZone,
  getAdminDeliveryLocationStates,
  getAdminDeliveryZone,
  getAdminDeliveryZones,
  reorderAdminDeliveryZones,
  type AdminDeliveryLocationState,
  type AdminDeliveryZone,
  type AdminDeliveryZoneAssignedCity,
  type AdminDeliveryZonesPage,
  type AdminDeliveryZonesQuery,
  type DeliveryZoneInput,
  unassignCityFromDeliveryZone,
  updateAdminDeliveryZone,
  updateAdminDeliveryZoneStatus,
} from '../../services/adminService'
import { ResponsiveDataTable } from '../../components/ui/ResponsiveDataTable'

const pageSize = 10

const formatCurrency = (value?: string | null) => {
  if (!value) return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(numeric)
}

interface ZoneActionsProps {
  zone: AdminDeliveryZone
  isBusy: boolean
  onAssignCities: () => void
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}

function ZoneActions({ zone, isBusy, onAssignCities, onEdit, onToggleStatus, onDelete }: ZoneActionsProps) {
  return (
    <ActionMenu ariaLabel={`Actions for ${zone.name}`} isBusy={isBusy} fixedPosition>
      {(close) => (
        <>
          <ActionMenuButton onClick={() => { close(); onAssignCities() }}>Assign cities</ActionMenuButton>
          <ActionMenuButton onClick={() => { close(); onEdit() }}>Edit</ActionMenuButton>
          <ActionMenuButton tone="accent" onClick={() => { close(); onToggleStatus() }}>{zone.isActive ? 'Deactivate' : 'Activate'}</ActionMenuButton>
          <ActionMenuButton tone="danger" onClick={() => { close(); onDelete() }}>Delete</ActionMenuButton>
        </>
      )}
    </ActionMenu>
  )
}

interface ZoneFormModalProps {
  mode: 'create' | 'edit'
  zone: AdminDeliveryZone | null
  isBusy: boolean
  error: string | null
  onCancel: () => void
  onSave: (input: DeliveryZoneInput) => void
}

function ZoneFormModal({ mode, zone, isBusy, error, onCancel, onSave }: ZoneFormModalProps) {
  const [name, setName] = useState(zone?.name ?? '')
  const [fee, setFee] = useState(zone ? zone.fee : '')
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(zone?.freeDeliveryThreshold ?? '')
  const [isActive, setIsActive] = useState(zone?.isActive ?? true)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isBusy, onCancel])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const amount = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return null
      const numeric = Number(trimmed)
      if (!Number.isFinite(numeric)) return null
      return Math.round(numeric * 100) / 100
    }
    const feeAmount = amount(fee)
    if (feeAmount === null || feeAmount <= 0) {
      setFormError('Delivery fee must be greater than zero.')
      return
    }
    const thresholdAmount = amount(freeDeliveryThreshold)
    if (thresholdAmount !== null && thresholdAmount > 0 && thresholdAmount <= feeAmount) {
      setFormError('The free delivery threshold must be greater than the delivery fee.')
      return
    }
    onSave({
      name: name.trim(),
      fee: feeAmount,
      freeDeliveryThreshold: thresholdAmount && thresholdAmount > 0 ? thresholdAmount : null,
      isActive,
    })
  }

  return (
    <div className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-green-dark/45 p-4" role="presentation">
      <div className="w-full max-w-lg rounded-3xl border border-line bg-white p-7 shadow-2xl shadow-green-dark/20 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="delivery-zone-form-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{mode === 'create' ? 'New delivery zone' : 'Edit delivery zone'}</p>
        <h2 id="delivery-zone-form-title" className="mt-2 text-2xl font-bold tracking-[-0.04em] text-green-dark">{mode === 'create' ? 'Add a delivery zone' : 'Update delivery zone'}</h2>
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <label className="block text-xs font-bold text-green-dark">
            Zone name
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Lagos Island" required maxLength={120} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-xs font-bold text-green-dark">
              Delivery fee
              <span className="ml-1 font-normal text-muted">(₦)</span>
              <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="0.00" required />
            </label>
            <label className="block text-xs font-bold text-green-dark">
              Free delivery threshold
              <span className="ml-1 font-normal text-muted">(₦, optional)</span>
              <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" inputMode="decimal" value={freeDeliveryThreshold} onChange={(event) => setFreeDeliveryThreshold(event.target.value)} placeholder="Leave empty for none" />
              <span className="mt-1.5 block text-xs font-normal leading-5 text-muted">Orders at or above this amount get free delivery. Leave empty to always charge the delivery fee.</span>
            </label>
          </div>
          <label className="flex items-center gap-3 text-xs font-bold text-green-dark">
            <input type="checkbox" className="size-4 rounded border-line" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Active (visible to customers during checkout)
          </label>
          {(formError || error) && <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{formError ?? error}</p>}
          <div className="mt-7 flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={isBusy} onClick={onCancel}>Cancel</button>
            <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-wait disabled:opacity-50" type="submit" disabled={isBusy}>{isBusy ? 'Saving…' : mode === 'create' ? 'Add delivery zone' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CityAssignmentModalProps {
  zone: AdminDeliveryZone
  isBusy: boolean
  error: string | null
  onClose: () => void
  onAssigned: () => void
}

function CityAssignmentModal({ zone, isBusy, error, onClose, onAssigned }: CityAssignmentModalProps) {
  const { showToast } = useToast()
  const [states, setStates] = useState<AdminDeliveryLocationState[] | null>(null)
  const [assigned, setAssigned] = useState<AdminDeliveryZoneAssignedCity[]>([])
  const [selectedStateId, setSelectedStateId] = useState('')
  const [selectedCityId, setSelectedCityId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const [busyCityId, setBusyCityId] = useState<string | null>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy && !busyCityId) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isBusy, busyCityId, onClose])

  useEffect(() => {
    let current = true
    Promise.all([getAdminDeliveryLocationStates(), getAdminDeliveryZone(zone.id)])
      .then(([loadedStates, detail]) => {
        if (!current) return
        setStates(loadedStates)
        setAssigned(detail.cities)
      })
      .catch((caught: unknown) => {
        if (current) setLocalError(caught instanceof ApiError ? caught.message : 'Cities could not be loaded.')
      })
      .finally(() => { if (current) setIsLoading(false) })
    return () => { current = false }
  }, [zone.id])

  const selectedState = states?.find((state) => state.id === selectedStateId)
  const assignedIds = new Set(assigned.map((city) => city.id))
  const cityOptions = (selectedState?.cities ?? []).map((city) => ({
    value: city.id,
    label: city.name,
  }))
  const disabledCityIds = Array.from(assignedIds)

  const addCity = async () => {
    if (!selectedCityId) return
    const cityId = selectedCityId
    setBusyCityId(cityId)
    setLocalError(null)
    try {
      const detail = await assignCityToDeliveryZone(zone.id, cityId)
      setAssigned(detail.cities)
      setSelectedCityId('')
      onAssigned()
      showToast('City added to delivery zone.', 'success')
    } catch (caught: unknown) {
      setLocalError(caught instanceof ApiError ? caught.message : 'City could not be added.')
    } finally {
      setBusyCityId(null)
    }
  }

  const removeCity = async (cityId: string) => {
    setBusyCityId(cityId)
    setLocalError(null)
    try {
      const detail = await unassignCityFromDeliveryZone(zone.id, cityId)
      setAssigned(detail.cities)
      onAssigned()
      showToast('City removed from delivery zone.', 'success')
    } catch (caught: unknown) {
      setLocalError(caught instanceof ApiError ? caught.message : 'City could not be removed.')
    } finally {
      setBusyCityId(null)
    }
  }

  return (
    <div className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-green-dark/45 p-4" role="presentation">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl shadow-green-dark/20" role="dialog" aria-modal="true" aria-labelledby="assign-cities-title">
        <div className="shrink-0 border-b border-line p-7 pb-5 sm:p-8 sm:pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Assign cities</p>
              <h2 id="assign-cities-title" className="mt-2 text-2xl font-bold tracking-[-0.04em] text-green-dark">“{zone.name}” delivery area</h2>
              <p className="mt-2 text-sm text-muted">Choose the cities and LGAs that this delivery zone covers. Customers matching these cities are auto-assigned this zone during checkout.</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-7 sm:p-8">
          {isLoading ? (
            <p className="text-sm text-muted">Loading cities…</p>
          ) : (
            <div className="space-y-6">
              <section aria-label="Currently covered areas">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Currently covered ({assigned.length})</h3>
                {assigned.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">No cities assigned yet. Until a city is assigned, customers there will use the manual delivery option.</p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {assigned.map((city) => (
                      <li className="inline-flex items-center gap-2 rounded-full border border-line bg-sage/30 py-1.5 pl-3 pr-1.5" key={city.id}>
                        <span className="text-sm font-bold text-green-dark">{city.name}</span>
                        <span className="text-xs text-muted">{city.state.name}</span>
                        <button
                          aria-label={`Remove ${city.name}`}
                          className="grid size-6 place-items-center rounded-full bg-white text-muted transition hover:bg-orange hover:text-white disabled:cursor-wait disabled:opacity-50"
                          type="button"
                          disabled={isBusy || busyCityId === city.id}
                          onClick={() => void removeCity(city.id)}
                        >
                          {busyCityId === city.id ? '…' : '✕'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-label="Add a city">
                <div className="rounded-2xl border border-line bg-cream/45 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Add a city</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-green-dark">
                      State
                      <SelectField
                        className="mt-2 w-full"
                        options={[
                          { value: '', label: 'Select a state' },
                          ...(states ?? []).map((state) => ({ value: state.id, label: state.name })),
                        ]}
                        onChange={(value) => { setSelectedStateId(value); setSelectedCityId('') }}
                        value={selectedStateId}
                      />
                    </label>
                    <label className="block text-xs font-bold text-green-dark">
                      City / LGA
                      <SelectField
                        className="mt-2 w-full"
                        options={[{ value: '', label: 'Select a city' }, ...cityOptions]}
                        onChange={setSelectedCityId}
                        value={selectedCityId}
                        disabledOptions={disabledCityIds}
                      />
                    </label>
                  </div>
                  {selectedStateId && !selectedCityId && cityOptions.length === 0 && (
                    <p className="mt-3 text-sm text-muted">No cities found in this state.</p>
                  )}
                  {(localError || error) && <p className="mt-3 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{localError ?? error}</p>}
                  <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream" type="button" onClick={onClose} disabled={isBusy}>Close</button>
                    <button
                      className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      disabled={!selectedCityId || isBusy || busyCityId !== null || disabledCityIds.includes(selectedCityId)}
                      onClick={() => void addCity()}
                    >
                      Add city
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function DeliveryZones() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [result, setResult] = useState<AdminDeliveryZonesPage | null>(null)
  const [query, setQuery] = useState<AdminDeliveryZonesQuery>({
    page: Number(searchParams.get('page') ?? 1),
    pageSize,
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') as AdminDeliveryZonesQuery['status']) || undefined,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; zone: AdminDeliveryZone | null } | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalBusy, setModalBusy] = useState(false)
  const [assignmentZone, setAssignmentZone] = useState<AdminDeliveryZone | null>(null)
  const [zoneToStatus, setZoneToStatus] = useState<AdminDeliveryZone | null>(null)
  const [zoneToDelete, setZoneToDelete] = useState<AdminDeliveryZone | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)

  const refreshZones = () => setQuery((current) => ({ ...current }))

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)
      getAdminDeliveryZones(query)
        .then((loaded) => { if (current) setResult(loaded) })
        .catch((caught: unknown) => {
          if (current) setError(caught instanceof ApiError ? caught.message : 'Delivery zones could not be loaded.')
        })
        .finally(() => { if (current) setIsLoading(false) })
    }, 0)
    const nextParams = new URLSearchParams()
    if (query.page > 1) nextParams.set('page', String(query.page))
    if (query.search) nextParams.set('search', query.search)
    if (query.status) nextParams.set('status', query.status)
    setSearchParams(nextParams, { replace: true })
    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [query, setSearchParams])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const input = form.elements.namedItem('search') as HTMLInputElement | null
    setQuery((current) => ({ ...current, search: input?.value.trim() || undefined, page: 1 }))
  }

  const openCreate = () => {
    setModalError(null)
    setModal({ mode: 'create', zone: null })
  }

  const openEdit = (zone: AdminDeliveryZone) => {
    setModalError(null)
    setModal({ mode: 'edit', zone })
  }

  const openAssignCities = (zone: AdminDeliveryZone) => setAssignmentZone(zone)

  const saveZone = async (input: DeliveryZoneInput) => {
    if (!modal) return
    setModalBusy(true)
    setModalError(null)
    try {
      if (modal.mode === 'create') {
        await createAdminDeliveryZone(input)
        showToast('Delivery zone created.', 'success')
      } else if (modal.zone) {
        await updateAdminDeliveryZone(modal.zone.id, input)
        showToast('Delivery zone updated.', 'success')
      }
      setModal(null)
      refreshZones()
    } catch (caught: unknown) {
      setModalError(caught instanceof ApiError ? caught.message : 'Delivery zone could not be saved.')
    } finally {
      setModalBusy(false)
    }
  }

  const requestStatusChange = (zone: AdminDeliveryZone) => setZoneToStatus(zone)

  const confirmStatusChange = async () => {
    if (!zoneToStatus) return
    const zone = zoneToStatus
    setBusyId(zone.id)
    setError(null)
    try {
      const updated = await updateAdminDeliveryZoneStatus(zone.id, !zone.isActive)
      setZoneToStatus(null)
      showToast(`Delivery zone ${updated.isActive ? 'activated' : 'deactivated'}.`, 'success')
      refreshZones()
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Delivery zone status could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const requestDelete = (zone: AdminDeliveryZone) => {
    setDeleteError(null)
    setZoneToDelete(zone)
  }

  const confirmDelete = async () => {
    if (!zoneToDelete) return
    const zone = zoneToDelete
    setDeletingId(zone.id)
    setDeleteError(null)
    try {
      await deleteAdminDeliveryZone(zone.id)
      showToast('Delivery zone deleted.', 'success')
      setZoneToDelete(null)
      refreshZones()
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Delivery zone could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  const moveZone = async (zone: AdminDeliveryZone, direction: -1 | 1) => {
    if (!result) return
    const ordered = [...result.zones]
    const index = ordered.findIndex((item) => item.id === zone.id)
    if (index < 0) return
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const swapped = [...ordered]
    ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
    setResult((current) => (current ? { ...current, zones: swapped } : current))
    setBusyId(zone.id)
    try {
      await reorderAdminDeliveryZones(swapped.map((item) => item.id))
      showToast('Delivery zone order updated.', 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Delivery zone order could not be updated.', 'error')
      refreshZones()
    } finally {
      setBusyId(null)
    }
  }

  const zones = result?.zones ?? []
  const currentPage = result?.pagination.page ?? query.page
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Delivery</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Delivery zones & fees</h1>
          <p className="mt-3 max-w-xl text-sm text-muted">Configure delivery zones and their fees. Customers pick a zone at checkout and the matching fee is applied to their order.</p>
        </div>
        <button className="inline-flex w-fit items-center gap-2 rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={openCreate}>Add delivery zone</button>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Delivery zone filters">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submitSearch}>
          <label className="flex-1 text-xs font-bold text-green-dark">
            Search zones
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" name="search" defaultValue={query.search ?? ''} placeholder="Zone name" />
          </label>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="submit">Search</button>
          <label className="text-xs font-bold text-green-dark">
            Status
            <SelectField
              className="mt-2 w-full sm:w-40"
              options={[
                { value: '', label: 'All zones' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              onChange={(value) => setQuery((current) => ({ ...current, status: (value || undefined) as AdminDeliveryZonesQuery['status'], page: 1 }))}
              value={query.status ?? ''}
            />
          </label>
        </form>
      </section>

      <p className="mt-5 flex items-center gap-2 text-xs text-muted">
        <span className="inline-flex rounded-full bg-sage/60 px-2.5 py-1 font-bold text-green">Drag reorder</span>
        Use the up/down arrows to set the display order. Zones shown here apply at checkout.
      </p>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading delivery zones…</div>
      ) : zones.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-green-dark">No delivery zones yet</h2>
          <p className="mt-2 text-sm text-muted">Add your first delivery zone to start charging a delivery fee at checkout.</p>
          <button className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={openCreate}>Add delivery zone</button>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-white shadow-sm">
          <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
            <span>{result?.pagination.total ?? 0} {result?.pagination.total === 1 ? 'zone' : 'zones'}</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <div className="space-y-3 px-4 pb-4 lg:hidden">
            {zones.map((zone, index) => (
              <div className="rounded-2xl border border-line bg-cream/45 p-4" key={zone.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-green-dark">{zone.name}</p>
                    <p className="mt-1 text-xs text-muted">Fee {formatCurrency(zone.fee)}{zone.freeDeliveryThreshold ? <> · Free over {formatCurrency(zone.freeDeliveryThreshold)}</> : null}</p>
                  </div>
                  <ZoneActions
                    zone={zone}
                    isBusy={busyId === zone.id || deletingId === zone.id}
                    onAssignCities={() => openAssignCities(zone)}
                    onEdit={() => openEdit(zone)}
                    onToggleStatus={() => requestStatusChange(zone)}
                    onDelete={() => requestDelete(zone)}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={index === 0} onClick={() => moveZone(zone, -1)}>↑</button>
                    <button className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={index === zones.length - 1} onClick={() => moveZone(zone, 1)}>↓</button>
                    <span className="text-xs text-muted">#{index + 1}</span>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${zone.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{zone.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <ResponsiveDataTable label="Delivery zones table horizontal scroll">
              <table className="w-full min-w-[980px] whitespace-nowrap text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-5 py-4 font-bold">Order</th>
                    <th className="px-5 py-4 font-bold">Zone</th>
                    <th className="px-5 py-4 font-bold">Delivery fee</th>
                    <th className="px-5 py-4 font-bold">Free delivery threshold</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {zones.map((zone, index) => (
                    <tr key={zone.id} className="group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={index === 0} onClick={() => moveZone(zone, -1)}>↑</button>
                          <button className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={index === zones.length - 1} onClick={() => moveZone(zone, 1)}>↓</button>
                          <span className="ml-1 text-xs font-bold text-muted">{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="font-bold text-green-dark">{zone.name}</span></td>
                      <td className="px-5 py-4 text-muted">{formatCurrency(zone.fee)}</td>
                      <td className="px-5 py-4 text-muted">{zone.freeDeliveryThreshold ? formatCurrency(zone.freeDeliveryThreshold) : '—'}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${zone.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{zone.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-5 py-4"><ZoneActions zone={zone} isBusy={busyId === zone.id || deletingId === zone.id} onAssignCities={() => openAssignCities(zone)} onEdit={() => openEdit(zone)} onToggleStatus={() => requestStatusChange(zone)} onDelete={() => requestDelete(zone)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveDataTable>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4"><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage <= 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button><span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button></div>}
        </div>
      )}

      {modal && (
        <ZoneFormModal
          mode={modal.mode}
          zone={modal.zone}
          isBusy={modalBusy}
          error={modalError}
          onCancel={() => setModal(null)}
          onSave={(input) => void saveZone(input)}
        />
      )}

      {zoneToStatus && (
        <ConfirmDialog
          eyebrow="Change delivery zone status"
          title={`${zoneToStatus.isActive ? 'Deactivate' : 'Activate'} “${zoneToStatus.name}”?`}
          description={zoneToStatus.isActive
            ? 'Inactive zones are hidden from customers during checkout but existing orders keep their historical fee.'
            : 'Active zones become selectable by customers during checkout.'}
          isBusy={busyId === zoneToStatus.id}
          confirmLabel={zoneToStatus.isActive ? 'Deactivate zone' : 'Activate zone'}
          busyLabel="Updating…"
          onCancel={() => setZoneToStatus(null)}
          onConfirm={() => void confirmStatusChange()}
        />
      )}

      {zoneToDelete && (
        <ConfirmDialog
          eyebrow="Delete delivery zone"
          title={`Delete “${zoneToDelete.name}”?`}
          description="This is only allowed when no orders reference this zone. Zones in use should be deactivated instead."
          error={deleteError}
          isBusy={deletingId === zoneToDelete.id}
          confirmLabel="Delete zone"
          busyLabel="Deleting…"
          onCancel={() => setZoneToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {assignmentZone && (
        <CityAssignmentModal
          zone={assignmentZone}
          isBusy={modalBusy}
          error={null}
          onClose={() => setAssignmentZone(null)}
          onAssigned={() => refreshZones()}
        />
      )}
    </>
  )
}