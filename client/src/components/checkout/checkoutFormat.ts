export function formatNaira(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  const numeric = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(numeric)) return String(amount)
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(numeric)
}