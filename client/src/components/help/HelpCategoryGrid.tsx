import type { HelpCategory } from './types'
import { HelpCategorySection } from './HelpCategorySection'

interface HelpCategoryGridProps {
  categories: HelpCategory[]
  query: string
}

export function HelpCategoryGrid({ categories, query }: HelpCategoryGridProps) {
  return (
    <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-16">
      {categories.map((category) => (
        <HelpCategorySection category={category} query={query} key={category.id} />
      ))}
    </div>
  )
}