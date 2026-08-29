import { iconProps, type IconProps } from './types'

export function HelpIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3.2-3 4.5" />
      <circle cx="12" cy="18" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}