import { useState, type ReactNode } from 'react'
import { ChevronDownIcon } from '../../assets/icons'

export interface AccordionSection {
  id: string
  label: ReactNode
  icon?: ReactNode
  content: ReactNode
  headingClassName?: string
}

interface AccordionProps {
  items: readonly AccordionSection[]
  /** Controlled list of open section ids. Falls back to internal state when omitted. */
  open?: readonly string[]
  /** Uncontrolled initial open section ids. */
  defaultOpen?: readonly string[]
  /** Fired with the resulting open ids (single-open mode sends a one-element array). */
  onChange?: (open: string[]) => void
  /** Allow more than one section open at a time. Defaults to a single open section. */
  multiple?: boolean
  className?: string
  ariaLabel?: string
}

export function Accordion({
  items,
  open: controlledOpen,
  defaultOpen = [],
  onChange,
  multiple = false,
  className = '',
  ariaLabel,
}: AccordionProps) {
  const [internalOpen, setInternalOpen] = useState<string[]>(() => [...defaultOpen])
  const openItems = controlledOpen ?? internalOpen

  const commitOpen = (next: string[]) => {
    if (controlledOpen === undefined) setInternalOpen(next)
    onChange?.(next)
  }

  const toggle = (id: string) => {
    if (openItems.includes(id)) {
      commitOpen(openItems.filter((openId) => openId !== id))
      return
    }
    commitOpen(multiple ? [...openItems, id] : [id])
  }

  return (
    <div className={className} aria-label={ariaLabel}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id)
        return (
          <section key={item.id} aria-label={typeof item.label === 'string' ? item.label : undefined}>
            <button
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition-colors ${item.headingClassName ?? ''}`.trim()}
              aria-expanded={isOpen}
              onClick={() => toggle(item.id)}
              type="button"
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
              <ChevronDownIcon className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={16} aria-hidden="true" />
            </button>
            {isOpen && item.content}
          </section>
        )
      })}
    </div>
  )
}