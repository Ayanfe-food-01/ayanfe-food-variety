interface CartDrawerSummaryProps {
  totalQuantity: number
  subtotalFormatted: string
}

export function CartDrawerSummary({ totalQuantity, subtotalFormatted }: CartDrawerSummaryProps) {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span>Items</span>
        <span>{totalQuantity}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span>Subtotal</span>
        <span className="font-bold text-green-dark">{subtotalFormatted}</span>
      </div>
      <p className="mt-1 text-[12px] leading-normal text-muted">Delivery is calculated at checkout based on your delivery zone.</p>
    </div>
  )
}
