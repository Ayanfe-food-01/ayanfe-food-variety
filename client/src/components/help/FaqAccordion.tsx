import type { ReactNode } from 'react'
import { ChevronDownIcon } from '../../assets/icons'
import { useAccordion } from '../../hooks/useAccordion'

export interface FaqItem {
  question: string
  answer: ReactNode
}

interface FaqAccordionProps {
  items: FaqItem[]
  className?: string
  idPrefix?: string
}

export function FaqAccordion({ items, className = '', idPrefix = 'faq' }: FaqAccordionProps) {
  const { isOpen, toggle } = useAccordion()

  return (
    <div className={`m-0 flex flex-col gap-2.5${className ? ` ${className}` : ''}`}>
      {items.map((item, index) => {
        const open = isOpen(index)
        const buttonId = `${idPrefix}-question-${index}`
        const panelId = `${idPrefix}-panel-${index}`

        return (
          <div
            className={`overflow-hidden rounded-2xl border ${open ? 'border-green' : 'border-line'} bg-card transition-colors duration-200`}
            key={index}
          >
            <h3 className="m-0">
              <button
                className="flex min-h-[50px] w-full cursor-pointer items-center justify-between gap-3.5 border-0 bg-transparent px-3.5 py-[15px] text-left text-sm font-extrabold leading-[1.4] text-green-dark transition-colors duration-200 hover:bg-sage focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange md:min-h-[54px] md:px-[18px] md:py-4 md:text-[15px]"
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                <span className="min-w-0 flex-1">{item.question}</span>
                <ChevronDownIcon
                  className={`shrink-0 text-green transition-transform duration-[240ms] motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                  size={18}
                  strokeWidth={2}
                />
              </button>
            </h3>
            <div
              className={`grid grid-rows-[0fr] transition-[grid-template-rows] duration-[280ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : ''}`}
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!open}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="px-3.5 pb-[15px] text-[13px] leading-[1.65] text-muted md:px-[18px] md:pb-[18px] md:text-sm md:leading-[1.7] [&_a]:font-extrabold [&_a]:text-green [&_a]:underline [&_a]:underline-offset-[3px] [&_a]:transition-colors [&_a:hover]:text-orange [&_li]:my-1 [&_p]:m-0 [&_p+p]:mt-2.5 [&_strong]:font-extrabold [&_strong]:text-green-dark [&_ul]:mt-1.5 [&_ul]:pl-[18px]">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}