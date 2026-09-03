import type { CheckoutFormData, CheckoutFormErrors } from './types'
import { isValidE164PhoneNumber } from '../../utils/phone'

export const initialCheckoutForm: CheckoutFormData = {
  fullName: '',
  phone: '',
  email: '',
  fulfillmentMethod: '',
  state: '',
  address: '',
  city: '',
  deliveryInstructions: '',
  paymentMethod: 'BANK_TRANSFER',
}

export function validateCheckoutForm(form: CheckoutFormData): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {}

  if (!form.fullName.trim()) errors.fullName = 'Please enter your full name.'
  if (!form.phone.trim()) {
    errors.phone = 'Please enter your phone number.'
  } else if (!isValidE164PhoneNumber(form.phone)) {
    errors.phone = 'Please enter a valid phone number.'
  }
  if (!form.email.trim()) {
    errors.email = 'Please enter your email address.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }
  if (!form.fulfillmentMethod) errors.fulfillmentMethod = 'Please choose pickup or delivery.'
  if (form.fulfillmentMethod === 'DELIVERY') {
    if (!form.address.trim()) errors.address = 'Please enter your delivery address.'
    if (!form.state.trim()) errors.state = 'Please select your state.'
    if (!form.city.trim()) errors.city = 'Please select your city or location.'
  }

  return errors
}