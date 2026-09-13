import type { CustomerAccountAddress, CustomerAddressSaveInput } from '../../services/customerAccountService'
import type { DeliveryLocationState } from '../../services/orderService'
import type { CheckoutFormData } from './types'

// Maps a saved account address back onto the checkout form. The checkout keeps
// the state as an identifier while the saved address stores the state name, so
// the state id is resolved from the delivery-location data by matching the
// city first (id, then name). The fields the form already carries (e.g. a
// delivery instruction) are preserved unless the address overrides them.
export const savedAddressToCheckoutFields = (
  address: CustomerAccountAddress,
  locations: DeliveryLocationState[],
): Partial<CheckoutFormData> => {
  let stateId = ''
  for (const state of locations) {
    const matched = address.cityId
      ? state.cities.some((city) => city.id === address.cityId)
      : address.city
        ? state.cities.some((city) => city.name.toLowerCase() === address.city.toLowerCase())
        : false
    if (matched) {
      stateId = state.id
      break
    }
  }

  return {
    fullName: address.recipientName,
    phone: address.phone,
    state: stateId || undefined,
    cityId: address.cityId ?? '',
    city: address.city,
    areaId: address.areaId ?? '',
    area: address.areaName ?? '',
    address: address.address,
    deliveryInstructions: address.instructions ?? '',
  }
}

// Converts the checkout form into a new saved address. Only called when the
// customer opts in — the store never overwrites an existing saved address
// behind the scenes. The state name is resolved from the delivery locations so
// the saved address displays correctly in the account.
export const checkoutFormToAddressSaveInput = (
  form: CheckoutFormData,
  locations: DeliveryLocationState[],
  label = 'Checkout address',
): CustomerAddressSaveInput => {
  const stateName = locations.find((state) => state.id === form.state)?.name ?? null
  const input: CustomerAddressSaveInput = {
    label,
    recipientName: form.fullName.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    cityId: form.cityId || null,
    state: stateName,
    areaName: form.area.trim() || null,
    areaId: form.areaId || null,
    instructions: form.deliveryInstructions.trim() || null,
  }
  return input
}