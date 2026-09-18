import type { Category } from '../../types/category'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../../assets/icons'

interface CategoryCardProps {
  category: Category
  className?: string
  showDescription?: boolean
  imageLoading?: 'eager' | 'lazy'
}

export function CategoryCard({
  category,
  className = '',
  showDescription = false,
  imageLoading = 'lazy',
}: CategoryCardProps) {
  const description = category.description?.trim()

  return (
    <Link
      className={`group flex min-w-0 snap-start flex-col gap-[9px] text-ink ${className}`.trim()}
      to={`/shop?category=${category.slug}`}
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-[14px] bg-sage shadow-none transition-shadow duration-300 group-hover:shadow-[0_10px_24px_rgb(32_60_36/0.12)] group-focus-visible:shadow-[0_10px_24px_rgb(32_60_36/0.12)]">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={`${category.name} Nigerian foodstuff - Ayanfe Food Variety`}
            width={640}
            height={640}
            loading={imageLoading}
            className="size-full object-cover transition-transform duration-[350ms] ease-in-out group-hover:scale-[1.05] group-focus-visible:scale-[1.05]"
          />
        ) : (
          <span
            className="block size-full bg-[linear-gradient(135deg,var(--color-sage),#f1c48e)] transition-transform duration-[350ms] ease-in-out group-hover:scale-[1.05] group-focus-visible:scale-[1.05]"
            aria-hidden="true"
          />
        )}
        <span
          className="absolute right-[9px] top-[9px] grid size-[30px] -translate-y-[3px] place-items-center rounded-full bg-cream/92 text-green opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          <ArrowUpRight size={16} />
        </span>
      </span>
      <span className="grid min-w-0 gap-[3px] px-0.5">
        <strong className="truncate text-[12px] font-extrabold leading-[1.3] text-ink transition-colors group-hover:text-orange group-focus-visible:text-orange">
          {category.name}
        </strong>
        {showDescription && description && (
          <span className="truncate text-[11px] leading-[1.35] text-muted">{description}</span>
        )}
      </span>
    </Link>
  )
}