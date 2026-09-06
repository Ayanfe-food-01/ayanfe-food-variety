export const formatPrice = (price: number | string) => {
  const numeric = Number(price)
  if (!Number.isFinite(numeric)) return String(price)
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(numeric)
}