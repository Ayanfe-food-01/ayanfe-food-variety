import { useLayoutEffect, useState } from 'react'
import { useDropdown } from '../../hooks/useDropdown'
import { Popover } from '../ui/Popover'

export interface FilterSortOption<T extends string = string> {
  value: T
  label: string
}

interface FilterSortProps<T extends string = string> {
  value: T
  options: FilterSortOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export function FilterSort<T extends string = string>({ value, options, onChange, ariaLabel, className = '' }: FilterSortProps<T>) {
  const { isOpen, close, toggle, rootRef } = useDropdown()
  const [sortMenuPosition, setSortMenuPosition] = useState({ vertical: 'below' as 'above' | 'below', left: 0 })

  useLayoutEffect(() => {
    if (!isOpen) return

    const updateSortMenuPosition = () => {
      const root = rootRef.current
      const menu = root?.querySelector<HTMLElement>('.filter-sort-menu')
      if (!root || !menu) return

      const rootRect = root.getBoundingClientRect()
      const menuWidth = menu.offsetWidth || 220
      const menuHeight = menu.offsetHeight
      const viewportPadding = 12
      const gap = 8
      const spaceBelow = window.innerHeight - rootRect.bottom
      const spaceAbove = rootRect.top
      const vertical = spaceBelow >= menuHeight + gap || spaceBelow >= spaceAbove ? 'below' : 'above'
      const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
      const desiredLeft = rootRect.left + menuWidth <= window.innerWidth - viewportPadding
        ? rootRect.left
        : rootRect.right - menuWidth >= viewportPadding
          ? rootRect.right - menuWidth
          : Math.min(Math.max(rootRect.left, viewportPadding), maxLeft)

      setSortMenuPosition({
        vertical,
        left: desiredLeft - rootRect.left,
      })
    }

    updateSortMenuPosition()
    window.addEventListener('resize', updateSortMenuPosition)
    window.addEventListener('scroll', updateSortMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateSortMenuPosition)
      window.removeEventListener('scroll', updateSortMenuPosition, true)
    }
  }, [isOpen, rootRef])

  const selectedLabel = options.find((option) => option.value === value)?.label
  const label = selectedLabel ? `Sort: ${selectedLabel}` : ariaLabel

  return (
    <div className={`filter-sort-control ${className}`.trim()} ref={rootRef}>
      <button
        className="filter-sort-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        title="Sort"
        onClick={toggle}
      >
        <span className="filter-sort-icon" aria-hidden="true">↕</span>
      </button>
      <Popover
        isOpen={isOpen}
        onClose={close}
        className={`filter-sort-menu is-${sortMenuPosition.vertical}`}
        style={{ left: `${sortMenuPosition.left}px`, right: 'auto' }}
        role="menu"
        ariaLabel={ariaLabel}
      >
        {(closeMenu) => (
          <div className="filter-sort-options">
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  className={`filter-sort-option${isSelected ? ' is-selected' : ''}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    closeMenu()
                  }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </Popover>
    </div>
  )
}