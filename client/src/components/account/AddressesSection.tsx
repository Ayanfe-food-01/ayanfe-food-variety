import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import {
  createCustomerAccountAddressService,
  deleteCustomerAccountAddressService,
  listCustomerAccountAddressesService,
  updateCustomerAccountAddressService,
  type CustomerAccountAddress,
  type CustomerAddressSaveInput,
} from '../../services/customerAccountService'
import { useToast } from '../ui/Toast'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { AddressForm } from './AddressForm'
import {
  accountCardClassName,
  accountSectionDescriptionClassName,
  accountSectionHeadingClassName,
} from './accountStyles'

function AddressCard({
  address,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  address: CustomerAccountAddress
  onEdit: (address: CustomerAccountAddress) => void
  onSetDefault: (address: CustomerAccountAddress) => void
  onDelete: (address: CustomerAccountAddress) => void
}) {
  const locationLine = [address.areaName, address.city, address.state].filter(Boolean).join(', ')
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-bold text-green-dark">{address.label}</p>
          {address.isDefault && (
            <span className="rounded-full bg-green px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cream">
              Default
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-green-dark transition-colors hover:bg-sage/40"
            type="button"
            onClick={() => onEdit(address)}
          >
            Edit
          </button>
          {!address.isDefault && (
            <button
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-green-dark transition-colors hover:bg-sage/40"
              type="button"
              onClick={() => onSetDefault(address)}
            >
              Set as default
            </button>
          )}
          <button
            className="rounded-lg border border-orange/30 px-3 py-1.5 text-xs font-bold text-orange transition-colors hover:bg-orange hover:text-white"
            type="button"
            onClick={() => onDelete(address)}
            aria-label={`Delete ${address.label} address`}
          >
            Delete
          </button>
        </div>
      </div>

      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="min-w-0 font-bold text-green-dark">{address.recipientName}</dt>
        </div>
        <div className="text-muted">{address.phone}</div>
        <div className="leading-5 text-muted">{address.address}</div>
        {locationLine && <div className="text-muted">{locationLine}</div>}
        {address.instructions && (
          <div className="pt-1 text-xs italic text-muted">“{address.instructions}”</div>
        )}
      </dl>
    </div>
  )
}

export function AddressesSection() {
  const { showToast } = useToast()
  const [addresses, setAddresses] = useState<CustomerAccountAddress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerAccountAddress | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CustomerAccountAddress | null>(null)

  useEffect(() => {
    let active = true
    listCustomerAccountAddressesService()
      .then((result) => {
        if (active) setAddresses(result)
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof ApiError ? caught.message : 'Your addresses could not be loaded.')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => { active = false }
  }, [reloadNonce])

  const retryLoad = () => {
    setIsLoading(true)
    setError(null)
    setReloadNonce((current) => current + 1)
  }

  const openCreate = () => {
    setEditing(null)
    setSubmitError(null)
    setFormOpen(true)
  }

  const openEdit = (address: CustomerAccountAddress) => {
    setEditing(address)
    setSubmitError(null)
    setFormOpen(true)
  }

  const cancelForm = () => {
    setFormOpen(false)
    setEditing(null)
    setSubmitError(null)
  }

  const handleSave = async (input: CustomerAddressSaveInput) => {
    setIsSaving(true)
    setSubmitError(null)
    try {
      const updated = editing
        ? await updateCustomerAccountAddressService(editing.id, input)
        : await createCustomerAccountAddressService(input)
      setAddresses(updated)
      setFormOpen(false)
      setEditing(null)
      showToast(editing ? 'Your address has been updated.' : 'Your address has been added.', 'success')
    } catch (caught) {
      setSubmitError(caught instanceof ApiError ? caught.message : 'Your address could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetDefault = async (address: CustomerAccountAddress) => {
    try {
      const updated = await updateCustomerAccountAddressService(address.id, {
        label: address.label,
        recipientName: address.recipientName,
        phone: address.phone,
        address: address.address,
        city: address.city,
        cityId: address.cityId,
        state: address.state,
        areaName: address.areaName,
        areaId: address.areaId,
        instructions: address.instructions,
        isDefault: true,
      })
      setAddresses(updated)
      showToast(`“${address.label}” is now your default address.`, 'success')
    } catch (caught) {
      showToast(
        caught instanceof ApiError ? caught.message : 'This address could not be set as default.',
        'error',
      )
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      const updated = await deleteCustomerAccountAddressService(deleting.id)
      setAddresses(updated)
      setDeleting(null)
      showToast('Your address has been deleted.', 'success')
    } catch (caught) {
      showToast(
        caught instanceof ApiError ? caught.message : 'This address could not be deleted.',
        'error',
      )
    }
  }

  return (
    <section className={accountCardClassName}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={accountSectionHeadingClassName}>Saved addresses</h2>
          <p className={accountSectionDescriptionClassName}>
            Reuse your delivery details at checkout. Only you can see these addresses.
          </p>
        </div>
        {!formOpen && (
          <button
            className="inline-flex items-center gap-1.5 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
            type="button"
            onClick={openCreate}
          >
            + Add new address
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4" role="status" aria-label="Loading your addresses">
          {[0, 1].map((row) => (
            <div className="h-40 rounded-2xl bg-sage/60 animate-pulse" key={row} />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">
          <p>{error}</p>
          <button
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-orange/30 bg-white px-3 py-2 text-xs font-bold text-green-dark hover:bg-cream"
            type="button"
            onClick={retryLoad}
          >
            Retry loading addresses
          </button>
        </div>
      ) : formOpen ? (
        <div className="mt-6">
          <AddressForm
            editing={editing}
            isSaving={isSaving}
            submitError={submitError}
            onCancel={cancelForm}
            onSubmit={handleSave}
          />
        </div>
      ) : addresses.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-cream p-8 text-center">
          <p className="font-bold text-green-dark">No saved addresses yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Save your delivery address to make checkout faster.
          </p>
          <button
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-green px-5 py-2.5 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
            type="button"
            onClick={openCreate}
          >
            + Add address
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              address={address}
              key={address.id}
              onEdit={openEdit}
              onSetDefault={handleSetDefault}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.label}” address?`}
          description="This saved address will be removed from your account. Orders already placed are not affected."
          confirmLabel="Delete address"
          error={submitError}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </section>
  )
}