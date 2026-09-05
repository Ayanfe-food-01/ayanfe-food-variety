import { Link } from 'react-router-dom'
import type { FulfillmentMethod, ResolvedDeliveryZone } from '../../services/orderService'
import type { CartItem } from '../../context/cartContext'
import { cartItemLineKey } from '../../context/cartContext'
import type { ShoppingMode } from '../../services/authService'
import { ProductPrice } from '../products/ProductPrice'
import { formatNaira } from './checkoutFormat'

interface OrderSummaryProps {
  items: CartItem[]
  mode: ShoppingMode
  subtotal: number
  totalQuantity: number
  getItemSubtotal: (item: CartItem) => number
  fulfillmentMethod: FulfillmentMethod | ''
  deliveryFee: number | null
  isZoneResolving: boolean
  resolvedZone: ResolvedDeliveryZone | null
}

export function OrderSummary({
  items,
  mode,
  subtotal,
  totalQuantity,
  getItemSubtotal,
  fulfillmentMethod,
  deliveryFee,
  isZoneResolving,
  resolvedZone,
}: OrderSummaryProps) {
  return (
    <aside className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8 lg:sticky lg:top-28" aria-labelledby="checkout-summary-heading">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
        <span className={mode === 'WHOLESALE' ? 'inline-block size-2 rounded-full bg-orange' : 'inline-block size-2 rounded-full bg-green'} />
        <span className={mode === 'WHOLESALE' ? 'text-orange' : 'text-green-dark'}>
          {mode === 'WHOLESALE' ? 'Wholesale Order' : 'Retail Order'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <h2 id="checkout-summary-heading" className="m-0 text-2xl font-bold tracking-[-0.03em] text-green-dark">Your order</h2>
        <Link className="text-xs font-bold text-green transition-colors hover:text-orange" to="/cart">Edit cart</Link>
      </div>
      <div className="mt-6 space-y-5">
        {items.map((item) => (
          <div className="flex gap-3" key={cartItemLineKey(item.id, item.productOptionId)}>
            <div className="relative shrink-0">
              {item.image ? (
                <img className="size-16 rounded-xl object-cover" src={item.image} alt={item.name} />
              ) : (
                <div className="grid size-16 place-items-center rounded-xl bg-sage text-center text-[10px] text-muted">No image</div>
              )}
              <span className="absolute -right-2 -top-2 grid min-w-5 place-items-center rounded-full bg-orange px-1.5 py-0.5 text-[10px] font-bold text-cream">{item.quantity}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-bold text-green-dark">{item.name}</p>
              {item.productOptionLabel && (
                <p className="mt-0.5 text-xs font-semibold text-orange">{item.productOptionLabel}</p>
              )}
              <p className="mt-1 text-xs text-muted">
                {item.unit} · <ProductPrice
                  originalPrice={item.originalPrice}
                  discountedPrice={item.price}
                  discountedClassName="font-bold text-green-dark"
                  originalClassName="ml-1 text-muted"
                /> each
              </p>
            </div>
            <strong className="text-sm text-green-dark">{formatNaira(getItemSubtotal(item))}</strong>
          </div>
        ))}
      </div>
      <div className="my-6 space-y-3 border-y border-line py-5 text-sm">
        <div className="flex justify-between gap-4 text-muted"><span>Items</span><span>{totalQuantity}</span></div>
        <div className="flex justify-between gap-4 text-muted"><span>Subtotal</span><span className="font-bold text-green-dark">{formatNaira(subtotal)}</span></div>
        <div className="flex justify-between gap-4 text-muted"><span>{fulfillmentMethod === 'PICKUP' ? 'Pickup fee' : 'Delivery fee'}</span><span className="font-bold text-green-dark">{deliveryFee === null ? '—' : deliveryFee === 0 ? 'FREE' : formatNaira(deliveryFee)}</span></div>
      </div>
      <div className="mb-5 rounded-xl bg-sage/35 p-3 text-xs leading-5 text-muted">
        <strong className="text-green-dark">
          {fulfillmentMethod === 'PICKUP' ? 'Pickup selected.' : fulfillmentMethod === 'DELIVERY' ? 'Delivery selected.' : 'Choose pickup or delivery.'}
        </strong>{' '}
        {fulfillmentMethod === 'PICKUP'
          ? 'Your order total has no delivery fee. We will contact you using your phone number when it is ready for collection.'
          : fulfillmentMethod === 'DELIVERY'
            ? (isZoneResolving
              ? 'Checking your delivery zone…'
              : resolvedZone
                ? `Your delivery fee is based on the ${resolvedZone.label} zone.`
                : 'Delivery is unavailable for your selected city.')
            : 'The final total will appear after you select a fulfillment option.'}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="font-bold text-green-dark">Total</span>
        <strong className="text-2xl text-green-dark">{formatNaira(subtotal + (deliveryFee ?? 0))}</strong>
      </div>
    </aside>
  )
}