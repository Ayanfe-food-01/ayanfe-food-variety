import { useLayoutEffect, useState } from 'react'
import { useDropdown } from '../../hooks/useDropdown'
import { Popover } from '../ui/Popover'
import { SortIcon } from '../../assets/icons'

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
    <div className={`relative flex min-w-0 w-max h-11 items-center justify-end text-muted text-[11px] font-extrabold uppercase tracking-[.06em] ${className}`.trim()} ref={rootRef}>
      <button
        className="inline-flex min-w-0 w-11 h-11 flex-none items-center justify-center rounded-[10px] border border-line bg-cream p-0 text-green-dark cursor-pointer transition-[border-color,background,color] duration-[160ms] hover:border-green hover:bg-sage aria-expanded:border-green aria-expanded:bg-sage focus-visible:outline-2 focus-visible:outline-green focus-visible:outline-offset-2"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        title="Sort"
        onClick={toggle}
      >
        <SortIcon className="flex" size={17} />
      </button>
      <Popover
        isOpen={isOpen}
        onClose={close}
        className={`min-w-[220px] p-1.5 ${sortMenuPosition.vertical === 'below' ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'} filter-sort-menu`}
        style={{ left: `${sortMenuPosition.left}px`, right: 'auto' }}
        role="menu"
        ariaLabel={ariaLabel}
      >
        {(closeMenu) => (
          <div className="flex flex-col gap-0.5">
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  className={`flex w-full min-h-[38px] items-center rounded-[9px] border-0 px-2.5 text-left text-[13px] font-semibold cursor-pointer hover:text-orange ${
                    isSelected ? 'bg-sage font-extrabold text-green-dark' : 'bg-transparent text-ink'
                  }`}
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