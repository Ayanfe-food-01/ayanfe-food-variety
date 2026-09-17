import type { RefObject } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '../../assets/icons'

interface HorizontalRailControlsProps {
  railRef: RefObject<HTMLDivElement | null>
  label: string
}

export function HorizontalRailControls({ railRef, label }: HorizontalRailControlsProps) {
  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current
    if (!rail) return

    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.82, 220),
      behavior: 'smooth',
    })
  }

  const controls = [
    { direction: -1 as const, label: `Show previous ${label.toLowerCase()}`, icon: <ChevronLeftIcon size={17} /> },
    { direction: 1 as const, label: `Show next ${label.toLowerCase()}`, icon: <ChevronRightIcon size={17} /> },
  ]

  return (
    <div
      className="pointer-events-none absolute inset-x-[-18px] top-1/2 z-[2] hidden -translate-y-1/2 justify-between md:flex"
      aria-label={`${label} carousel controls`}
    >
      {controls.map(({ direction, label: controlLabel, icon }) => (
        <button
          className="pointer-events-auto grid size-8 cursor-pointer place-items-center rounded-full border border-line bg-white text-green-dark transition-all duration-200 hover:-translate-y-px hover:border-green hover:bg-green hover:text-white focus-visible:-translate-y-px focus-visible:border-green focus-visible:bg-green focus-visible:text-white"
          type="button"
          onClick={() => scrollRail(direction)}
          aria-label={controlLabel}
          key={controlLabel}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}