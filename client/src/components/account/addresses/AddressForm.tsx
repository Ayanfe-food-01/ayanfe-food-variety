import { useState, type FormEvent } from 'react'
import type { CustomerAccountAddress, CustomerAddressSaveInput } from '../../../services/customerAccountService'
import { isValidE164PhoneNumber } from '../../../utils/phone'
import { PhoneInputField } from '../../ui/PhoneInput'
import { SelectField } from '../../ui/SelectField'
import {
  AddressLocationFields,
} from './AddressLocationFields'
import { emptyAddressLocation, type AddressLocationValue } from './addressLocation'
import {
  accountFieldErrorClassName,
  accountFieldLabelClassName,
  accountInputClassName,
} from '../accountStyles'

interface AddressFormProps {
  embedded?: boolean
  editing: CustomerAccountAddress | null
  isSaving: boolean
  submitError: string | null
  onCancel: () => void
  onSubmit: (input: CustomerAddressSaveInput) => void
}

interface AddressFormErrors {
  label?: string
  recipientName?: string
  phone?: string
  state?: string
  city?: string
  address?: string
}

const labelSuggestions = ['Home', 'Office', 'Other']

const toLocationValue = (address: CustomerAccountAddress | null): AddressLocationValue =>
  address
    ? {
        stateId: '',
        stateName: address.state ?? '',
        cityId: address.cityId ?? '',
        cityName: address.city,
        areaId: address.areaId ?? '',
        areaName: address.areaName ?? '',
      }
    : emptyAddressLocation

export function AddressForm({ embedded = false, editing, isSaving, submitError, onCancel, onSubmit }: AddressFormProps) {
  const [label, setLabel] = useState(editing?.label ?? '')
  const [recipientName, setRecipientName] = useState(editing?.recipientName ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [location, setLocation] = useState<AddressLocationValue>(toLocationValue(editing))
  const [address, setAddress] = useState(editing?.address ?? '')
  const [instructions, setInstructions] = useState(editing?.instructions ?? '')
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false)
  const [errors, setErrors] = useState<AddressFormErrors>({})

  // Without a recipient, a saved address defaults to the account holder's name
  // and phone elsewhere on the page; a blank recipient makes the card confusing.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: AddressFormErrors = {}
    if (!label.trim()) next.label = 'Please give this address a label.'
    if (!recipientName.trim()) next.recipientName = 'Please enter the recipient’s name.'
    if (!phone.trim()) next.phone = 'Please enter a phone number.'
    else if (!isValidE164PhoneNumber(phone)) next.phone = 'Please enter a valid phone number.'
    if (!location.stateId) next.state = 'Please select your state.'
    if (!location.cityId) next.city = 'Please select your LGA or city.'
    if (!address.trim()) next.address = 'Please enter your street address.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    onSubmit({
      label: label.trim(),
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      city: location.cityName,
      cityId: location.cityId,
      state: location.stateName,
      areaName: location.areaName || null,
      areaId: location.areaId || null,
      address: address.trim(),
      instructions: instructions.trim() || null,
      ...(isDefault ? { isDefault: true } : {}),
    })
  }

  return (
    <form
      id={embedded ? 'address-modal-form' : undefined}
      className={embedded ? '' : 'rounded-3xl border border-green/20 bg-sage/20 p-6 sm:p-8'}
      onSubmit={handleSubmit}
      noValidate
      aria-label={editing ? 'Edit saved address' : 'Add a saved address'}
    >
      {!embedded && (
        <h3 className="text-xl font-bold tracking-[-0.03em] text-green-dark">
          {editing ? 'Edit address' : 'Add a new address'}
        </h3>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label className={accountFieldLabelClassName} htmlFor="address-label">
            Address label <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <div className="mt-2">
            <SelectField
              id="address-label"
              name="label"
              ariaLabel="Address label"
              placeholder="Select a label"
              value={label}
              options={
                labelSuggestions.some((suggestion) => suggestion === label)
                  ? labelSuggestions.map((suggestion) => ({ value: suggestion, label: suggestion }))
                  : [{ value: label, label }, ...labelSuggestions.map((suggestion) => ({ value: suggestion, label: suggestion }))]
              }
              aria-invalid={Boolean(errors.label)}
              aria-describedby={errors.label ? 'address-label-error' : undefined}
              required
              onChange={setLabel}
            />
          </div>
          {errors.label && (
            <p className={accountFieldErrorClassName} id="address-label-error" role="alert">{errors.label}</p>
          )}
        </div>

        <div>
          <label className={accountFieldLabelClassName} htmlFor="address-recipient-name">
            Recipient name <span className="text-orange" aria-hidden="true">*</span>
          </label>
          <input
            className={accountInputClassName(Boolean(errors.recipientName))}
            id="address-recipient-name"
            name="recipientName"
            type="text"
            autoComplete="name"
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            aria-invalid={Boolean(errors.recipientName)}
            aria-describedby={errors.recipientName ? 'address-recipient-error' : undefined}
            required
          />
          {errors.recipientName && (
            <p className={accountFieldErrorClassName} id="address-recipient-error" role="alert">{errors.recipientName}</p>
          )}
        </div>
      </div>

      <div className="mt-6 max-w-sm">
        <label className={accountFieldLabelClassName} htmlFor="address-phone">
          Phone number <span className="text-orange" aria-hidden="true">*</span>
        </label>
        <div className="mt-2">
          <PhoneInputField
            id="address-phone"
            name="phone"
            value={phone}
            hasError={Boolean(errors.phone)}
            onChange={setPhone}
            aria-describedby={errors.phone ? 'address-phone-error' : undefined}
          />
        </div>
        {errors.phone && (
          <p className={accountFieldErrorClassName} id="address-phone-error" role="alert">{errors.phone}</p>
        )}
      </div>

      <div className="mt-8">
        <p className="text-sm font-bold text-green-dark">Delivery location</p>
        <p className="mt-1 text-xs text-muted">
          The delivery fee for your order is worked out from this location at checkout.
        </p>
        <div className="mt-4">
          <AddressLocationFields value={location} errors={errors} onChange={setLocation} />
        </div>
      </div>

      <div className="mt-6">
        <label className={accountFieldLabelClassName} htmlFor="address-street">
          Street / full address <span className="text-orange" aria-hidden="true">*</span>
        </label>
        <textarea
          className={`${accountInputClassName(Boolean(errors.address))} min-h-24 resize-y`}
          id="address-street"
          name="streetAddress"
          autoComplete="street-address"
          placeholder="House number, street name, landmark"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          aria-invalid={Boolean(errors.address)}
          aria-describedby={errors.address ? 'address-street-error' : undefined}
          required
        />
        {errors.address && (
          <p className={accountFieldErrorClassName} id="address-street-error" role="alert">{errors.address}</p>
        )}
      </div>

      <div className="mt-6">
        <label className={accountFieldLabelClassName} htmlFor="address-instructions">
          Delivery instructions <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          className={`${accountInputClassName(false)} min-h-20 resize-y`}
          id="address-instructions"
          name="instructions"
          placeholder="Landmark, preferred delivery time, or other helpful details"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm font-semibold text-green-dark">
        <input
          className="mt-0.5 size-4 accent-green"
          type="checkbox"
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
        />
        <span>
          Set as default delivery address
          <span className="mt-0.5 block text-xs leading-5 font-normal text-muted">
            Your default address is pre-selected at checkout.
          </span>
        </span>
      </label>

      {submitError && (
        <p className="mt-4 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm text-orange" role="alert">
          {submitError}
        </p>
      )}

      {!embedded && (
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button
            className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50 sm:order-first"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? (editing ? 'Saving…' : 'Adding…') : editing ? 'Save address' : 'Add address'}
          </button>
        </div>
      )}
    </form>
  )
}