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

  return (
    <div className="horizontal-rail-controls" aria-label={`${label} carousel controls`}>
      <button
        className="horizontal-rail-control"
        type="button"
        onClick={() => scrollRail(-1)}
        aria-label={`Show previous ${label.toLowerCase()}`}
      >
        <ChevronLeftIcon size={17} />
      </button>
      <button
        className="horizontal-rail-control"
        type="button"
        onClick={() => scrollRail(1)}
        aria-label={`Show next ${label.toLowerCase()}`}
      >
        <ChevronRightIcon size={17} />
      </button>
    </div>
  )
}