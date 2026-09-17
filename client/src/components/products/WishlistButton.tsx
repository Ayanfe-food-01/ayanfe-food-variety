import { HeartIcon } from '../../assets/icons'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { useWishlist } from '../../hooks/useWishlist'
import { useToast } from '../ui/Toast'
import type { Product } from '../../types/product'

export function WishlistButton({ product, className = '' }: { product: Product; className?: string }) {
  const { user, openAuth } = useCustomerAuth()
  const { isWishlisted, pendingProductIds, toggleWishlist } = useWishlist()
  const { showToast } = useToast()
  const saved = isWishlisted(product.id, product.isWishlisted)
  const isPending = pendingProductIds.includes(product.id)

  const updateWishlist = () => {
    void toggleWishlist(product)
      .then((isSaved) => showToast(isSaved ? `${product.name} saved to your wishlist.` : `${product.name} removed from your wishlist.`, 'success'))
      .catch((error: unknown) => showToast(error instanceof Error ? error.message : 'Your wishlist could not be updated.', 'error'))
  }

  const handleClick = () => {
    if (!user) {
      openAuth(updateWishlist)
      return
    }
    updateWishlist()
  }

  const savedClasses = saved
    ? 'border-orange bg-orange text-white'
    : 'hover:border-orange hover:bg-orange hover:text-white focus-visible:border-orange focus-visible:bg-orange focus-visible:text-white'
  const defaultClasses = className !== ''
    ? ''
    : 'flex-[0_0_38px] size-[38px] min-h-[38px] border border-line bg-white text-green'

  return (
    <button
      className={`grid place-items-center rounded-full cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-60 ${savedClasses} ${defaultClasses} ${className}`.trim()}
      type="button"
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      aria-pressed={saved}
      disabled={isPending}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        handleClick()
      }}
    >
      <HeartIcon size={17} />
    </button>
  )
}