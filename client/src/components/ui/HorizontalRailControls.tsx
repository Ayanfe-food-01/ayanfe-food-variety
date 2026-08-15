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
    <div className="horizontal-rail-controls" aria-label={`${label} carousel controls`}>
      {controls.map(({ direction, label: controlLabel, icon }) => (
        <button
          className="horizontal-rail-control"
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