import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDownIcon } from '../../assets/icons'
import type { PrimaryNavLink } from './useDesktopNavMeasurement'

interface NavMeasurementHostProps {
  links: PrimaryNavLink[]
  measureRef: Ref<HTMLDivElement>
}

export function NavMeasurementHost({ links, measureRef }: NavMeasurementHostProps) {
  return (
    <div className="desktop-nav-measure absolute left-0 top-0 invisible whitespace-nowrap text-xs font-semibold pointer-events-none" ref={measureRef} aria-hidden="true">
      {links.map((link) => (
        <span key={link.href} className="desktop-nav-measure-item inline-block">{link.label}</span>
      ))}
      <Link className="wishlist-nav-link desktop-nav-measure-item inline-flex items-center gap-[5px] inline-block" to="/wishlist">Wishlist</Link>
      <span className="more-nav-trigger desktop-nav-measure-item inline-flex items-center gap-[5px] inline-block">More <ChevronDownIcon size={14} /></span>
    </div>
  )
}