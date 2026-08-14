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

  return (
    <button
      className={`wishlist-button ${className} ${saved ? 'is-saved' : ''}`.trim()}
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