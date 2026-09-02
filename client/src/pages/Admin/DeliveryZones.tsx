import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActionMenu, ActionMenuButton } from '../../components/admin/ActionMenu'
import { useToast } from '../../components/ui/Toast'
import { SelectField } from '../../components/ui/SelectField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import {
  createAdminDeliveryZone,
  deleteAdminDeliveryZone,
  getAdminDeliveryZones,
  reorderAdminDeliveryZones,
  type AdminDeliveryZone,
  type AdminDeliveryZonesPage,
  type AdminDeliveryZonesQuery,
  type DeliveryZoneInput,
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
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}

function ZoneActions({ zone, isBusy, onEdit, onToggleStatus, onDelete }: ZoneActionsProps) {
  return (
    <ActionMenu ariaLabel={`Actions for ${zone.name}`} isBusy={isBusy} fixedPosition>
      {(close) => (
        <>
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
                      <td className="px-5 py-4"><ZoneActions zone={zone} isBusy={busyId === zone.id || deletingId === zone.id} onEdit={() => openEdit(zone)} onToggleStatus={() => requestStatusChange(zone)} onDelete={() => requestDelete(zone)} /></td>
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
    </>
  )
}