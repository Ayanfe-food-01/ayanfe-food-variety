import type { Category } from '../../types/category'
import { ArrowUpRight } from '../../assets/icons'

interface CategoryCardProps {
  category: Category
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <a className="relative min-h-[180px] overflow-hidden rounded-2xl bg-green transition-transform duration-300 hover:-translate-y-1 sm:min-h-[220px]" href="/shop">
      <img className="size-full object-cover transition-transform duration-500 hover:scale-105" src={category.image} alt={`${category.name} products`} />
      <span className="absolute inset-0 bg-gradient-to-t from-green-dark/90 via-green-dark/10 to-transparent" />
      <span className="absolute inset-x-4 bottom-4 text-cream">
        <span className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-cream/75">{category.description ?? 'Quality essentials'}</span>
        <strong className="font-display text-2xl font-semibold">{category.name}</strong>
      </span>
      <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-cream/90 text-green"><ArrowUpRight size={17} /></span>
    </a>
  )
}