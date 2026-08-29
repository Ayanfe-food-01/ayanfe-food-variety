import { iconProps, type IconProps } from './types'

export function ClipboardListIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5v1" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M9 18h3" />
    </svg>
  )
}