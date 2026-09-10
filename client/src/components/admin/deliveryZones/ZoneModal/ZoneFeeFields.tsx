const fieldInputClass = 'mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10'

interface ZoneFeeFieldsProps {
  fee: string
  freeDeliveryThreshold: string
  minDeliveryDays: string
  maxDeliveryDays: string
  isActive: boolean
  onChangeFee: (value: string) => void
  onChangeFreeDeliveryThreshold: (value: string) => void
  onChangeMinDeliveryDays: (value: string) => void
  onChangeMaxDeliveryDays: (value: string) => void
  onChangeIsActive: (value: boolean) => void
}

export function ZoneFeeFields({
  fee,
  freeDeliveryThreshold,
  minDeliveryDays,
  maxDeliveryDays,
  isActive,
  onChangeFee,
  onChangeFreeDeliveryThreshold,
  onChangeMinDeliveryDays,
  onChangeMaxDeliveryDays,
  onChangeIsActive,
}: ZoneFeeFieldsProps) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-xs font-bold text-green-dark">
          Delivery fee
          <span className="ml-1 font-normal text-muted">(₦)</span>
          <input className={fieldInputClass} inputMode="decimal" value={fee} onChange={(event) => onChangeFee(event.target.value)} placeholder="0.00" required />
        </label>
        <label className="block text-xs font-bold text-green-dark">
          Free delivery threshold
          <span className="ml-1 font-normal text-muted">(₦, optional)</span>
          <input className={fieldInputClass} inputMode="decimal" value={freeDeliveryThreshold} onChange={(event) => onChangeFreeDeliveryThreshold(event.target.value)} placeholder="Leave empty for none" />
          <span className="mt-1.5 block text-xs font-normal leading-5 text-muted">Orders at or above this amount get free delivery. Leave empty to always charge the delivery fee.</span>
        </label>
        <label className="block text-xs font-bold text-green-dark">
          Min delivery days
          <span className="ml-1 font-normal text-muted">(optional)</span>
          <input className={fieldInputClass} inputMode="numeric" value={minDeliveryDays} onChange={(event) => onChangeMinDeliveryDays(event.target.value)} placeholder="e.g. 1" />
          <span className="mt-1.5 block text-xs font-normal leading-5 text-muted">Fastest estimated delivery time in business days.</span>
        </label>
        <label className="block text-xs font-bold text-green-dark">
          Max delivery days
          <span className="ml-1 font-normal text-muted">(optional)</span>
          <input className={fieldInputClass} inputMode="numeric" value={maxDeliveryDays} onChange={(event) => onChangeMaxDeliveryDays(event.target.value)} placeholder="e.g. 3" />
          <span className="mt-1.5 block text-xs font-normal leading-5 text-muted">Slowest estimated delivery time in business days. Must be ≥ min delivery days.</span>
        </label>
      </div>
      <label className="flex items-center gap-3 text-xs font-bold text-green-dark">
        <input type="checkbox" className="size-4 rounded border-line" checked={isActive} onChange={(event) => onChangeIsActive(event.target.checked)} />
        Active (visible to customers during checkout)
      </label>
    </>
  )
}