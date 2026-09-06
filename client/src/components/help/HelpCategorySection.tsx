import type { HelpCategory } from './types'
import { FaqAccordion } from './FaqAccordion'

interface HelpCategorySectionProps {
  category: HelpCategory
  query: string
}

export function HelpCategorySection({ category, query }: HelpCategorySectionProps) {
  const { icon: Icon, id, title, intro, faqs } = category

  return (
    <section className="faq-section" id={id} aria-labelledby={`${id}-heading`}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green/10 text-green" aria-hidden="true">
          <Icon size={19} />
        </span>
        <div>
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-orange">Help topic</p>
          <h2
            id={`${id}-heading`}
            className="m-0 text-2xl font-bold leading-tight tracking-[-0.03em] text-green-dark sm:text-[1.7rem]"
          >
            {title}
          </h2>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{intro}</p>
      <FaqAccordion className="mt-6" idPrefix={id} items={faqs} key={`${id}-${query}`} />
    </section>
  )
}