import { CartIcon } from '../../assets/icons'

interface ProductCardActionsProps {
  product: { name: string; isAvailable: boolean }
  isWholesaleShopper: boolean
  hasOptions: boolean
  isAdding: boolean
  onAddToCart: () => void
  onOpenOptions: () => void
}

export function ProductCardActions({ product, isWholesaleShopper, hasOptions, isAdding, onAddToCart, onOpenOptions }: ProductCardActionsProps) {
  return (
    <div className="grid gap-1.5 px-2.5 pb-[11px]">
      {isWholesaleShopper ? (
        <button
          className="inline-flex min-h-[36px] items-center justify-center gap-[7px] rounded-[9px] border border-green bg-green text-[12px] font-extrabold text-white cursor-pointer transition-[background,border-color,transform] hover:border-green-dark hover:bg-green-dark hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-[0.55] disabled:transform-none"
          type="button"
          onClick={onOpenOptions}
          aria-label={`Choose a wholesale package for ${product.name}`}
        >
          <CartIcon size={15} />
          Choose package
        </button>
      ) : hasOptions ? (
        <button
          className="inline-flex min-h-[36px] items-center justify-center gap-[7px] rounded-[9px] border border-green bg-green text-[12px] font-extrabold text-white cursor-pointer transition-[background,border-color,transform] hover:border-green-dark hover:bg-green-dark hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-[0.55] disabled:transform-none"
          type="button"
          onClick={onOpenOptions}
          aria-label={`Select options for ${product.name}`}
        >
          <CartIcon size={15} />
          Select options
        </button>
      ) : (
        <button
          className="inline-flex min-h-[36px] items-center justify-center gap-[7px] rounded-[9px] border border-green bg-green text-[12px] font-extrabold text-white cursor-pointer transition-[background,border-color,transform] hover:border-green-dark hover:bg-green-dark hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-orange focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-[0.55] disabled:transform-none"
          type="button"
          disabled={!product.isAvailable || isAdding}
          onClick={onAddToCart}
          aria-label={`Add ${product.name} to cart`}
        >
          <CartIcon size={15} />
          {isAdding ? 'Adding…' : product.isAvailable ? 'Add to cart' : 'Unavailable'}
        </button>
      )}
    </div>
  )
}
