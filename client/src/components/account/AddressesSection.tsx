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
import { Modal } from '../ui/Modal'
import { MapPinIcon, HomeIcon } from '../../assets/icons'
import { AccountCard } from './AccountCard'
import { AddressCard } from './addresses/AddressCard'
import { AddressForm } from './addresses/AddressForm'

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
  const [isDeleting, setIsDeleting] = useState(false)

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
    if (!deleting || isDeleting) return
    setIsDeleting(true)
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
    } finally {
      setIsDeleting(false)
    }
  }

  const addNewLink = !formOpen ? (
    <button
      className="text-sm font-bold text-green transition-colors hover:text-green-dark hover:underline"
      type="button"
      onClick={openCreate}
    >
      + Add new
    </button>
  ) : undefined

  const header = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage/60 text-green">
          <MapPinIcon size={18} />
        </span>
        <h2 className="text-xl font-bold text-green-dark">Saved Addresses</h2>
      </div>
      {addNewLink}
    </div>
  )

  return (
    <AccountCard id="addresses" header={header}>
      {isLoading ? (
        <div className="space-y-4" role="status" aria-label="Loading your addresses">
          {[0, 1].map((row) => (
            <div className="h-40 rounded-2xl bg-sage/60 animate-pulse" key={row} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-orange/25 bg-orange/5 p-5 text-sm text-orange" role="alert">
          <p>{error}</p>
          <button
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-orange/30 bg-white px-3 py-2 text-xs font-bold text-green-dark hover:bg-cream"
            type="button"
            onClick={retryLoad}
          >
            Retry loading addresses
          </button>
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-cream text-green">
            <HomeIcon size={28} />
          </span>
          <p className="mt-4 text-lg font-bold text-green-dark">No saved addresses yet.</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Save your delivery address to make checkout faster.
          </p>
          <button
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
            type="button"
            onClick={openCreate}
          >
            + Add address
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <AddressCard
              address={address}
              key={address.id}
              variant="manage"
              onEdit={() => openEdit(address)}
              onSetDefault={() => handleSetDefault(address)}
              onDelete={() => setDeleting(address)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <Modal
          eyebrow="Saved addresses"
          title={editing ? 'Edit address' : 'Add a new address'}
          blocking={isSaving}
          onClose={cancelForm}
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={isSaving}
                onClick={cancelForm}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                form="address-modal-form"
                disabled={isSaving}
              >
                {isSaving ? (editing ? 'Saving…' : 'Adding…') : editing ? 'Save address' : 'Add address'}
              </button>
            </div>
          }
        >
          <AddressForm
            embedded
            editing={editing}
            isSaving={isSaving}
            submitError={submitError}
            onCancel={cancelForm}
            onSubmit={handleSave}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.label}” address?`}
          description="This saved address will be removed from your account. Orders already placed are not affected."
          confirmLabel="Delete address"
          isBusy={isDeleting}
          busyLabel="Deleting…"
          error={submitError}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </AccountCard>
  )
}