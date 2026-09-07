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
    <div className={`faq-list${className ? ` ${className}` : ''}`}>
      {items.map((item, index) => {
        const open = isOpen(index)
        const buttonId = `${idPrefix}-question-${index}`
        const panelId = `${idPrefix}-panel-${index}`

        return (
          <div className={`faq-item${open ? ' is-open' : ''}`} key={index}>
            <h3 className="faq-question-wrap">
              <button
                className="faq-question"
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                <span className="faq-question-text">{item.question}</span>
                <ChevronDownIcon className="faq-question-chevron" size={18} strokeWidth={2} />
              </button>
            </h3>
            <div className="faq-panel" id={panelId} role="region" aria-labelledby={buttonId} inert={!open}>
              <div className="faq-panel-inner">
                <div className="faq-answer">{item.answer}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}