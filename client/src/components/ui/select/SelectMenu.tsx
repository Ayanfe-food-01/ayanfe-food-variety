import type { CSSProperties } from 'react'
import type { SelectOption } from '../SelectField'
import { SelectMenuOption } from './SelectMenuOption'

interface SelectMenuProps {
  value: string
  options: readonly SelectOption[]
  highlightedIndex: number
  disabledOptions: readonly string[]
  listboxId: string
  ariaLabel?: string
  menuRef: React.RefObject<HTMLDivElement | null>
  onSelect: (option: SelectOption) => void
  onHighlight?: (index: number) => void
  style?: CSSProperties | null
}

export function SelectMenu({
  value,
  options,
  highlightedIndex,
  disabledOptions,
  listboxId,
  ariaLabel,
  menuRef,
  onSelect,
  onHighlight,
  style,
}: SelectMenuProps) {
  return (
    <div
      className="fixed z-[1000] overflow-y-auto overscroll-contain border border-line rounded-[14px] bg-cream shadow-[0_16px_32px_rgb(20_33_22/0.18)] p-1.5 [-webkit-overflow-scrolling:touch] y-scrollbar"
      id={listboxId}
      ref={menuRef}
      role="listbox"
      aria-label={ariaLabel}
      style={style ?? undefined}
      onMouseMove={(event) => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[role="option"]')
        if (!button) return
        const index = Number(button.id.split('-').pop())
        if (!Number.isNaN(index) && index !== highlightedIndex) onHighlight?.(index)
      }}
    >
      {options.map((option, index) => (
        <SelectMenuOption
          key={option.value}
          option={option}
          index={index}
          isSelected={option.value === value}
          isHighlighted={highlightedIndex === index}
          isDisabled={disabledOptions.includes(option.value)}
          listboxId={listboxId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}