export const formatPrice = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value))

export const statusClass = (status: string) => {
  if (status === 'PAID' || status === 'DELIVERED') return 'bg-green/10 text-green'
  if (status === 'CANCELLED' || status === 'FAILED') return 'bg-orange/10 text-orange'
  return 'bg-sage text-green-dark'
}

export const fulfillmentClass = (fulfillmentMethod: string) =>
  fulfillmentMethod === 'PICKUP' ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'

export const shoppingModeClass = (shoppingMode: string) =>
  shoppingMode === 'WHOLESALE' ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'