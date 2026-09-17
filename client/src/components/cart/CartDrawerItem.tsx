import { useState } from 'react'
import { CloseIcon } from '../../assets/icons'
import type { CartItem } from '../../context/cartContext'
import { ProductPrice } from '../products/ProductPrice'

function DrawerImage({ item }: { item: CartItem }) {
  const [imageError, setImageError] = useState(false)

  if (!item.image || imageError) {
    return (
      <div
        className="grid size-16 shrink-0 place-items-center rounded-xl bg-sage px-2 text-center text-[10px] font-semibold text-muted"
        role="img"
        aria-label={`${item.name} image unavailable`}
      >
        Image unavailable
      </div>
    )
  }

  return (
    <img
      className="size-16 shrink-0 rounded-xl object-cover"
      src={item.image}
      alt={item.name}
      loading="lazy"
      onError={() => setImageError(true)}
    />
  )
}

interface DrawerQuantityProps {
  item: CartItem
  disabled: boolean
  onDecrease: () => void
  onIncrease: () => void
}

function DrawerQuantity({ item, disabled, onDecrease, onIncrease }: DrawerQuantityProps) {
  return (
    <div className="flex h-8 w-fit items-center rounded-lg border border-line bg-cream" aria-label={`Quantity for ${item.name}`}>
      <button
        className="grid size-8 place-items-center text-base text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        aria-label={`Decrease ${item.name} quantity`}
        disabled={disabled || item.quantity <= (item.minQuantity ?? 1)}
        onClick={onDecrease}
      >
        −
      </button>
      <output className="min-w-6 text-center text-sm font-bold text-green-dark" aria-live="polite">
        {item.quantity}
      </output>
      <button
        className="grid size-8 place-items-center text-base text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        aria-label={`Increase ${item.name} quantity`}
        disabled={disabled || !item.isAvailable}
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  )
}

interface CartDrawerItemProps {
  item: CartItem
  isBusy: boolean
  subtotal: string
  onDecrease: () => void
  onIncrease: () => void
  onRemove: () => void
}

export function CartDrawerItem({ item, isBusy, subtotal, onDecrease, onIncrease, onRemove }: CartDrawerItemProps) {
  return (
    <li className="flex gap-3 border-b border-line px-[18px] py-4">
      <DrawerImage item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <p className="mb-0.5 text-orange text-[9px] font-extrabold uppercase tracking-[0.14em]">{item.unit}</p>
            <h3 className="m-0 text-[14px] font-bold leading-[1.3] text-green-dark [overflow-wrap:anywhere]">{item.name}</h3>
            {item.productOptionLabel && (
              <p className="mt-0.5 text-[12px] font-semibold text-muted">{item.productOptionLabel}</p>
            )}
            {item.wholesalePackageName && (
              <p className="mt-0.5 text-[12px] font-semibold text-muted">
                {item.wholesalePackageName}
                {item.wholesaleUnitsPerPackage
                  ? ` · ${item.wholesaleUnitsPerPackage} ${item.wholesaleUnitsPerPackage === 1 ? 'unit' : 'units'} per package`
                  : ''}
              </p>
            )}
            {typeof item.minQuantity === 'number' && item.minQuantity > 1 && (
              <p className="mt-0.5 text-[11px] font-bold text-orange">Minimum order: {item.minQuantity} units</p>
            )}
          </div>
          <button
            className="grid size-[30px] shrink-0 place-items-center rounded-full border-0 bg-transparent text-muted cursor-pointer transition-colors hover:bg-sage hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            aria-label={`Remove ${item.name}${item.productOptionLabel ? ` (${item.productOptionLabel})` : ''}${item.wholesalePackageName ? ` (${item.wholesalePackageName})` : ''} from cart`}
            disabled={isBusy}
            onClick={onRemove}
          >
            <CloseIcon size={14} />
          </button>
        </div>
        {!item.isAvailable && (
          <p className="mt-1.5 text-[12px] font-bold text-orange" role="alert">
            {item.availabilityMessage ?? 'This item is unavailable.'}
          </p>
        )}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <DrawerQuantity
            item={item}
            disabled={isBusy}
            onDecrease={onDecrease}
            onIncrease={onIncrease}
          />
          <div className="text-right">
            <p className="m-0 text-[11px] text-muted">
              <ProductPrice
                originalPrice={item.originalPrice}
                discountedPrice={item.price}
                discountedClassName="font-bold text-green-dark"
                originalClassName="text-muted"
              />{' '}
              {item.wholesalePackageName ? 'per package' : 'each'}
            </p>
            <p className="mt-0.5 text-[14px] font-extrabold text-green-dark">{subtotal}</p>
          </div>
        </div>
      </div>
    </li>
  )
}
