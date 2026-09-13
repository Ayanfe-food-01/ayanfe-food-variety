import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../services/api'
import {
  listCustomerAccountAddressesService,
  type CustomerAccountAddress,
} from '../../services/customerAccountService'
import { getDeliveryLocationStates, type DeliveryLocationState } from '../../services/orderService'
import { AddressCard } from '../account/addresses/AddressCard'
import { savedAddressToCheckoutFields } from './savedAddressHelpers'
import type { CheckoutFormData } from './types'

// Saved-address picker for signed-in customers. The most recently updated
// default address (falling back to the first one) is auto-applied to the form
// once, before the customer types anything. Selecting another saved address
// fills the checkout fields from it; "Use a different address" lets the manual
// fields below be edited freely.
interface SavedAddressSectionProps {
  form: CheckoutFormData
  selectedAddressId: string | null
  onSelect: (addressId: string | null) => void
  onApply: (fields: Partial<CheckoutFormData>) => void
}

export function SavedAddressSection({ form, selectedAddressId, onSelect, onApply }: SavedAddressSectionProps) {
  const [addresses, setAddresses] = useState<CustomerAccountAddress[] | null>(null)
  const [locations, setLocations] = useState<DeliveryLocationState[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const didAutoApplyRef = useRef(false)

  useEffect(() => {
    let active = true
    Promise.all([listCustomerAccountAddressesService(), getDeliveryLocationStates()])
      .then(([savedAddresses, states]) => {
        if (!active) return
        setAddresses(savedAddresses)
        setLocations(states)
        setError(null)
        // Auto-apply the default address only when the form is untouched, so an
        // in-progress form is never clobbered. Runs from the async callback so
        // a slow location request cannot leave the checkout pre-filled wrongly.
        if (!didAutoApplyRef.current && !form.city.trim() && !form.address.trim()) {
          const preferred = savedAddresses.find((address) => address.isDefault) ?? savedAddresses[0]
          if (preferred) {
            didAutoApplyRef.current = true
            onApply(savedAddressToCheckoutFields(preferred, states))
          }
        }
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof ApiError ? caught.message : 'Your saved addresses could not be loaded.')
        setAddresses([])
      })
    return () => { active = false }
  }, [form.address, form.city, onApply, reloadNonce])

  const retryLoad = () => {
    setAddresses(null)
    setError(null)
    setReloadNonce((current) => current + 1)
  }

  const selectAddress = (address: CustomerAccountAddress) => {
    onSelect(address.id)
    if (locations) onApply(savedAddressToCheckoutFields(address, locations))
  }

  return (
    <div className="rounded-2xl border border-line bg-cream/50 p-4 sm:p-5">
      <p className="text-sm font-bold text-green-dark">Saved address</p>
      <p className="mt-0.5 text-xs text-muted">Choose a saved address to fill in the delivery details below.</p>

      {addresses === null ? (
        <p className="mt-3 text-sm text-muted" role="status">Loading saved addresses…</p>
      ) : error ? (
        <div className="mt-3 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">
          <p>{error}</p>
          <button
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-orange/30 bg-white px-3 py-1.5 text-xs font-bold text-green-dark hover:bg-cream"
            type="button"
            onClick={retryLoad}
          >
            Retry loading addresses
          </button>
        </div>
      ) : addresses.length === 0 ? (
        <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm text-muted">
          No saved addresses yet — save this delivery address below and we’ll reuse it next time.
        </p>
      ) : (
        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Choose a saved address">
          {addresses.map((address) => (
            <AddressCard
              address={address}
              key={address.id}
              variant="select"
              name="savedAddress"
              selected={selectedAddressId === address.id}
              onSelect={() => selectAddress(address)}
            />
          ))}
          <label
            className={`block cursor-pointer rounded-xl border p-3 transition-colors ${
              selectedAddressId === null ? 'border-green bg-sage/30' : 'border-line bg-white hover:border-green/40'
            }`}
          >
            <span className="flex items-start gap-3">
              <input
                className="mt-0.5 size-4 accent-green"
                type="radio"
                name="savedAddress"
                value=""
                checked={selectedAddressId === null}
                onChange={() => onSelect(null)}
              />
              <span className="text-sm font-bold text-green-dark">Use a different address</span>
            </span>
          </label>
        </div>
      )}
    </div>
  )
}