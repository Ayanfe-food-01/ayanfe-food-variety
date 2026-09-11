import { iconProps, type IconProps } from './types'

export function PanelLeftCloseIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  )
}