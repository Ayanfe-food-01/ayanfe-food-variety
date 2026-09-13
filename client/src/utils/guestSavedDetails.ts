import type { CheckoutFormData } from '../components/checkout/types'

// Device-local storage for guest checkout details. Letting a guest opt in to
// remembering their contact and delivery details makes repeat orders faster
// without creating an account. Nothing sensitive is stored, and the data never
// leaves this device — it is only ever read back into a checkout form.
export const GUEST_SAVED_DETAILS_STORAGE_KEY = 'ayanfe-guest-saved-details'

interface GuestSavedDetailsJson {
  fullName?: string
  phone?: string
  email?: string
  fulfillmentMethod?: CheckoutFormData['fulfillmentMethod']
  state?: string
  cityId?: string
  city?: string
  areaId?: string
  area?: string
  address?: string
  deliveryInstructions?: string
  paymentMethod?: CheckoutFormData['paymentMethod']
}

const DETAILS_KEYS: (keyof GuestSavedDetailsJson)[] = [
  'fullName',
  'phone',
  'email',
  'fulfillmentMethod',
  'state',
  'cityId',
  'city',
  'areaId',
  'area',
  'address',
  'deliveryInstructions',
  'paymentMethod',
]

export const readGuestSavedDetails = (): Partial<CheckoutFormData> | null => {
  try {
    const raw = window.localStorage.getItem(GUEST_SAVED_DETAILS_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const cleaned: Record<string, string> = {}
    for (const key of DETAILS_KEYS) {
      const value = (parsed as GuestSavedDetailsJson)[key]
      if (typeof value === 'string') cleaned[key] = value
    }
    // Only return a usable result when the guest actually saved substantive
    // details (at least a name) so we never poison a fresh form.
    return cleaned.fullName ? (cleaned as Partial<CheckoutFormData>) : null
  } catch {
    return null
  }
}

export const writeGuestSavedDetails = (details: Partial<CheckoutFormData>): void => {
  try {
    const payload: Record<string, string> = {}
    for (const key of DETAILS_KEYS) {
      const value = details[key as keyof CheckoutFormData]
      if (typeof value === 'string' && value.trim()) payload[key] = value
    }
    window.localStorage.setItem(GUEST_SAVED_DETAILS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Guest checkout remains fully usable when local storage is unavailable.
  }
}