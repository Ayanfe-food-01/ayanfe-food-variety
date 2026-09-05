import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useToast } from '../ui/Toast'
import { SelectField } from '../ui/SelectField'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import { ActionMenu, ActionMenuButton } from './ActionMenu'
import { ApiError } from '../../services/api'
import {
  createAdminDeliveryArea,
  deleteAdminDeliveryArea,
  getAdminCityDeliveryAreas,
  getAdminDeliveryLocationStates,
  type AdminDeliveryArea,
  type AdminDeliveryLocationState,
  updateAdminDeliveryArea,
  updateAdminDeliveryAreaStatus,
} from '../../services/adminService'

interface DeliveryAreaManagerProps {
  onClose: () => void
}

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

export function DeliveryAreaManager({ onClose }: DeliveryAreaManagerProps) {
  const { showToast } = useToast()
  const [states, setStates] = useState<AdminDeliveryLocationState[] | null>(null)
  const [isLoadingStates, setIsLoadingStates] = useState(true)
  const [selectedStateId, setSelectedStateId] = useState('')
  const [selectedCityId, setSelectedCityId] = useState('')
  const [cityLabel, setCityLabel] = useState<{ state: string; city: string } | null>(null)
  const [areas, setAreas] = useState<AdminDeliveryArea[] | null>(null)
  const [isLoadingAreas, setIsLoadingAreas] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [statusId, setStatusId] = useState<string | null>(null)
  const [areaToDelete, setAreaToDelete] = useState<AdminDeliveryArea | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingId && !creating && !deleting && !statusId) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, savingId, creating, deleting, statusId])

  useEffect(() => {
    let current = true
    getAdminDeliveryLocationStates()
      .then((loaded) => { if (current) setStates(loaded) })
      .catch((caught: unknown) => { if (current) setLoadError(caught instanceof ApiError ? caught.message : 'Delivery locations could not be loaded.') })
      .finally(() => { if (current) setIsLoadingStates(false) })
    return () => { current = false }
  }, [])

  const selectedState = useMemo(
    () => states?.find((state) => state.id === selectedStateId) ?? null,
    [states, selectedStateId],
  )
  const cities = selectedState?.cities ?? []

  useEffect(() => {
    if (!selectedCityId) return
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsLoadingAreas(true)
      setLoadError(null)
      setActionError(null)
      getAdminCityDeliveryAreas(selectedCityId)
        .then((loaded) => {
          if (!current) return
          setCityLabel({ state: loaded.city.state.name, city: loaded.city.name })
          setAreas(loaded.areas)
        })
        .catch((caught: unknown) => {
          if (current) setLoadError(caught instanceof ApiError ? caught.message : 'Areas could not be loaded.')
        })
        .finally(() => { if (current) setIsLoadingAreas(false) })
    }, 0)
    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [selectedCityId, refreshKey])

  const reloadAreas = () => setRefreshKey((current) => current + 1)

  const addArea = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newName.trim()
    if (!selectedCityId || !name) return
    setCreating(true)
    setActionError(null)
    try {
      await createAdminDeliveryArea({ cityId: selectedCityId, name, isActive: true })
      showToast('Area added.', 'success')
      setNewName('')
      reloadAreas()
    } catch (caught: unknown) {
      setActionError(caught instanceof ApiError ? caught.message : 'Area could not be added.')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (area: AdminDeliveryArea) => {
    setActionError(null)
    setEditingId(area.id)
    setEditName(area.name)
  }

  const editingArea = areas?.find((area) => area.id === editingId) ?? null

  const saveEdit = async () => {
    const name = editName.trim()
    if (!editingArea || !name) return
    setSavingId(editingArea.id)
    setActionError(null)
    try {
      await updateAdminDeliveryArea(editingArea.id, { name, isActive: editingArea.isActive })
      showToast('Area updated.', 'success')
      setEditingId(null)
      reloadAreas()
    } catch (caught: unknown) {
      setActionError(caught instanceof ApiError ? caught.message : 'Area could not be updated.')
    } finally {
      setSavingId(null)
    }
  }

  const toggleStatus = async (area: AdminDeliveryArea) => {
    setStatusId(area.id)
    setActionError(null)
    try {
      const updated = await updateAdminDeliveryAreaStatus(area.id, !area.isActive)
      showToast(`Area “${updated.name}” ${updated.isActive ? 'activated' : 'deactivated'}.`, 'success')
      reloadAreas()
    } catch (caught: unknown) {
      setActionError(caught instanceof ApiError ? caught.message : 'Area status could not be updated.')
    } finally {
      setStatusId(null)
    }
  }

  const requestDelete = (area: AdminDeliveryArea) => {
    setDeleteError(null)
    setAreaToDelete(area)
  }

  const confirmDelete = async () => {
    if (!areaToDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAdminDeliveryArea(areaToDelete.id)
      showToast('Area deleted.', 'success')
      setAreaToDelete(null)
      reloadAreas()
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Area could not be deleted.')
    } finally {
      setDeleting(false)
    }
  }

  const isBusy = Boolean(savingId || creating || deleting || statusId)

  const filteredAreas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return areas ?? []
    return (areas ?? []).filter((area) =>
      area.name.toLowerCase().includes(query)
      || (area.coveredBy?.zoneLabel.toLowerCase().includes(query) ?? false),
    )
  }, [areas, searchQuery])

  return (
    <div className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-green-dark/45 p-4" role="presentation">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl shadow-green-dark/20" role="dialog" aria-modal="true" aria-labelledby="delivery-area-manager-title">
        <div className="shrink-0 border-b border-line px-7 pt-5 pb-4 sm:px-8 sm:pt-6 sm:pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Delivery areas</p>
          <h2 id="delivery-area-manager-title" className="mt-1.5 text-xl font-bold tracking-[-0.04em] text-green-dark">Manage areas within LGAs</h2>
          <p className="mt-1.5 text-xs leading-5 text-muted">Areas refine a delivery location at checkout. An area with its own delivery zone uses that zone and its fee; otherwise it inherits its LGA's whole-zone. This screen is optional — most stores can start without any areas.</p>
        </div>
        <div className="y-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="p-7 sm:p-8">
            {isLoadingStates ? (
              <p className="text-sm text-muted">Loading delivery locations…</p>
            ) : loadError && !states ? (
              <p className="rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{loadError}</p>
            ) : (
              <div className="space-y-6">
                <fieldset className="grid gap-4 sm:grid-cols-2" aria-label="Select state and LGA">
                  <label className="text-xs font-bold text-green-dark">
                    State
                    <SelectField
                      className="mt-2 w-full"
                      options={[
                        { value: '', label: 'Select a state' },
                        ...(states ?? []).map((state) => ({ value: state.id, label: state.name })),
                      ]}
                      value={selectedStateId}
                      onChange={(value) => { setSelectedStateId(value); setSelectedCityId('') }}
                    />
                  </label>
                  <label className="text-xs font-bold text-green-dark">
                    LGA / City
                    <SelectField
                      className="mt-2 w-full"
                      options={[
                        { value: '', label: selectedState ? 'Select an LGA' : 'Select a state first' },
                        ...cities.map((city) => ({ value: city.id, label: city.name })),
                      ]}
                      value={selectedCityId}
                      disabled={!selectedState}
                      onChange={(value) => setSelectedCityId(value)}
                    />
                  </label>
                </fieldset>

                {selectedCityId && (
                  <section aria-label={cityLabel ? `Areas in ${cityLabel.city}` : 'Areas in the selected LGA'}>
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Areas in {cityLabel?.city ?? 'this LGA'}{cityLabel ? ` (${cityLabel.state})` : ''}</h3>
                        <p className="mt-1 text-xs text-muted">Optional. Leave empty to offer delivery across the whole {cityLabel?.city ?? 'LGA'}.</p>
                      </div>
                      <form className="flex w-full items-start gap-2 sm:w-auto" onSubmit={addArea}>
                        <input
                          className="w-full flex-1 rounded-xl border border-line bg-cream px-4 py-2.5 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10 sm:w-56"
                          placeholder="New area name"
                          value={newName}
                          disabled={isBusy}
                          onChange={(event) => setNewName(event.target.value)}
                        />
                        <button className="rounded-xl bg-green px-4 py-2.5 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-wait disabled:opacity-50" type="submit" disabled={isBusy || !newName.trim()}>{creating ? 'Adding…' : 'Add'}</button>
                      </form>
                    </div>

                    <label className="mt-4 block text-xs font-bold text-green-dark">
                      Search areas
                      <input
                        className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                        placeholder="Search by area or covering zone label"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                      />
                    </label>

                    {(actionError || loadError) && <p className="mt-3 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">{actionError ?? loadError}</p>}

                    <div className="mt-4">
                      {isLoadingAreas ? (
                        <p className="rounded-2xl border border-line bg-cream/45 px-5 py-10 text-center text-sm text-muted">Loading areas…</p>
                      ) : !areas || areas.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-5 py-10 text-center text-sm text-muted">No areas yet for this LGA. Add one using the field above.</p>
                      ) : filteredAreas.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-green/25 bg-sage/25 px-5 py-10 text-center text-sm text-muted">No areas match “{searchQuery.trim()}”.</p>
                      ) : (
                        <ul className="space-y-2">
                          {filteredAreas.map((area) => {
                            const isEditing = editingId === area.id
                            const isSaving = savingId === area.id
                            return (
                              <li className="flex flex-col gap-3 rounded-2xl border border-line bg-cream/45 p-3.5 sm:flex-row sm:items-start sm:justify-between" key={area.id}>
                                <div className="min-w-0">
                                  {isEditing ? (
                                    <input
                                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-green-dark outline-none focus:border-green focus:ring-2 focus:ring-green/10"
                                      value={editName}
                                      disabled={isSaving}
                                      autoFocus
                                      onChange={(event) => setEditName(event.target.value)}
                                      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void saveEdit() } if (event.key === 'Escape') setEditingId(null) }}
                                    />
                                  ) : (
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="truncate font-bold text-green-dark">{area.name}</p>
                                        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${area.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{area.isActive ? 'Active' : 'Inactive'}</span>
                                      </div>
                                      {area.coveredBy ? (
                                        <p className="mt-1.5 text-xs leading-5 text-muted">
                                          Covered by <span className="font-bold text-green-dark">“{area.coveredBy.zoneLabel}”</span> · {formatCurrency(area.coveredBy.zoneFee)} · <span className="text-muted">{area.coveredBy.via === 'area' ? 'area zone' : 'whole LGA zone'}</span>
                                        </p>
                                      ) : (
                                        <p className="mt-1.5 text-xs leading-5 text-muted">Not covered by any zone yet — customers here see “delivery unavailable”.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <button className="rounded-lg bg-green px-3.5 py-2 text-sm font-bold text-cream hover:bg-green-dark disabled:cursor-wait disabled:opacity-50" type="button" onClick={() => void saveEdit()} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</button>
                                      <button className="rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={() => setEditingId(null)} disabled={isSaving}>Cancel</button>
                                    </>
                                  ) : (
                                    <ActionMenu ariaLabel={`Actions for ${area.name}`} isBusy={isBusy} fixedPosition>
                                      {(close) => (
                                        <>
                                          <ActionMenuButton tone="accent" onClick={() => { close(); void toggleStatus(area) }}>{area.isActive ? 'Deactivate' : 'Activate'}</ActionMenuButton>
                                          <ActionMenuButton onClick={() => { close(); startEdit(area) }}>Rename</ActionMenuButton>
                                          <ActionMenuButton tone="danger" onClick={() => { close(); requestDelete(area) }}>Delete</ActionMenuButton>
                                        </>
                                      )}
                                    </ActionMenu>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

          {!isLoadingStates && (
            <div className="border-t border-line p-7 pt-5 sm:p-8 sm:pt-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream" type="button" onClick={onClose}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {areaToDelete && (
        <ConfirmDialog
          eyebrow="Delete delivery area"
          title={`Delete “${areaToDelete.name}”?`}
          description="Past orders keep their area name snapshot, so deleting an area only stops it being offered at checkout in future."
          error={deleteError}
          isBusy={deleting}
          confirmLabel="Delete area"
          busyLabel="Deleting…"
          onCancel={() => setAreaToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  )
}