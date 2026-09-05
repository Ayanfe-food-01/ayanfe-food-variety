import type { CheckoutStep } from './types'

export interface CheckoutStepMeta {
  key: CheckoutStep
  label: string
}

export const CHECKOUT_STEPS: CheckoutStepMeta[] = [
  { key: 'contact', label: 'Contact' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
]

export const STEP_ORDER: CheckoutStep[] = ['contact', 'delivery', 'payment', 'review']

export function nextCheckoutStep(step: CheckoutStep): CheckoutStep | null {
  const index = STEP_ORDER.indexOf(step)
  return index >= 0 && index < STEP_ORDER.length - 1 ? STEP_ORDER[index + 1] : null
}

export function previousCheckoutStep(step: CheckoutStep): CheckoutStep | null {
  const index = STEP_ORDER.indexOf(step)
  return index > 0 ? STEP_ORDER[index - 1] : null
}