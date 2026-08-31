import { useState, type ReactNode } from 'react'
import { ChevronDownIcon } from '../../assets/icons'

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
  const [openIndexes, setOpenIndexes] = useState<number[]>([])

  const toggle = (index: number) =>
    setOpenIndexes((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    )

  return (
    <div className={`faq-list${className ? ` ${className}` : ''}`}>
      {items.map((item, index) => {
        const isOpen = openIndexes.includes(index)
        const buttonId = `${idPrefix}-question-${index}`
        const panelId = `${idPrefix}-panel-${index}`

        return (
          <div className={`faq-item${isOpen ? ' is-open' : ''}`} key={index}>
            <h3 className="faq-question-wrap">
              <button
                className="faq-question"
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
              >
                <span className="faq-question-text">{item.question}</span>
                <ChevronDownIcon className="faq-question-chevron" size={18} strokeWidth={2} />
              </button>
            </h3>
            <div className="faq-panel" id={panelId} role="region" aria-labelledby={buttonId} inert={!isOpen}>
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