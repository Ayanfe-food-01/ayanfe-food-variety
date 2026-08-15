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
    <Link className={`category-card group ${className}`.trim()} to={`/shop?category=${category.slug}`}>
      <span className="category-card-media">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={`${category.name} Nigerian foodstuff - Ayanfe Food Variety`}
            width={640}
            height={640}
            loading={imageLoading}
          />
        ) : (
          <span className="category-card-placeholder" aria-hidden="true" />
        )}
        <span className="category-card-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
      </span>
      <span className="category-card-copy">
        <strong className="category-card-title">{category.name}</strong>
        {showDescription && description && <span className="category-card-description">{description}</span>}
      </span>
    </Link>
  )
}