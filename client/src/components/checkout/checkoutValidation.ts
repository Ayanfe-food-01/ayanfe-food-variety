import type { CheckoutFormData, CheckoutFormErrors } from './types'

export const initialCheckoutForm: CheckoutFormData = {
  fullName: '',
  phone: '',
  email: '',
  fulfillmentMethod: '',
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
  } else if (form.phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'Please enter a valid phone number.'
  }
  if (!form.fulfillmentMethod) errors.fulfillmentMethod = 'Please choose pickup or delivery.'
  if (form.fulfillmentMethod === 'DELIVERY') {
    if (!form.address.trim()) errors.address = 'Please enter your delivery address.'
    if (!form.city.trim()) errors.city = 'Please enter your city or location.'
  }

  return errors
}